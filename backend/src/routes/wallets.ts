import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { GetWalletDataParams, AnalyzeWalletParams } from "@workspace/api-zod";
import { walletLimiter, aiLimiter } from "../lib/rateLimit";

const router = Router();

const ETHERSCAN_API = "https://api.etherscan.io/api";
const ETH_PRICE_API = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
const ETHERSCAN_KEY = process.env["ETHERSCAN_API_KEY"] ?? "";

function etherscanUrl(params: Record<string, string>): string {
  const p = new URLSearchParams(params);
  if (ETHERSCAN_KEY) p.set("apikey", ETHERSCAN_KEY);
  return `${ETHERSCAN_API}?${p.toString()}`;
}

async function getEthPrice(): Promise<number> {
  try {
    const res = await fetch(ETH_PRICE_API);
    const data = await res.json() as { ethereum?: { usd?: number } };
    return data?.ethereum?.usd ?? 0;
  } catch {
    return 0;
  }
}

async function resolveEnsName(address: string): Promise<string | null> {
  try {
    const url = `https://api.ensideas.com/ens/resolve/${address}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { name?: string };
    return data?.name ?? null;
  } catch {
    return null;
  }
}

async function getWalletBalance(address: string): Promise<string> {
  try {
    const url = etherscanUrl({ module: "account", action: "balance", address, tag: "latest" });
    const res = await fetch(url);
    const data = await res.json() as { result?: string };
    const weiBalance = BigInt(data?.result ?? "0");
    const ethBalance = Number(weiBalance) / 1e18;
    return ethBalance.toFixed(4);
  } catch {
    return "0";
  }
}

async function getTransactionCount(address: string): Promise<number> {
  try {
    const url = etherscanUrl({ module: "proxy", action: "eth_getTransactionCount", address, tag: "latest" });
    const res = await fetch(url);
    const data = await res.json() as { result?: string };
    return parseInt(data?.result ?? "0x0", 16);
  } catch {
    return 0;
  }
}

async function getLastTransactions(address: string): Promise<Array<{
  hash: string;
  from: string;
  to: string | null;
  value: string;
  valueEth: string;
  gasUsed: string;
  timestamp: number;
  method: string | null;
  status: string;
}>> {
  try {
    const url = etherscanUrl({ module: "account", action: "txlist", address, startblock: "0", endblock: "99999999", page: "1", offset: "3", sort: "desc" });
    const res = await fetch(url);
    const data = await res.json() as {
      status?: string;
      result?: Array<{
        hash: string;
        from: string;
        to: string;
        value: string;
        gasUsed: string;
        timeStamp: string;
        functionName: string;
        txreceipt_status: string;
        isError: string;
      }>;
    };

    if (data?.status !== "1" || !Array.isArray(data.result)) return [];

    return data.result.slice(0, 3).map((tx) => {
      const valueEth = (Number(tx.value) / 1e18).toFixed(4);
      const method = tx.functionName
        ? tx.functionName.split("(")[0]
        : tx.value !== "0"
        ? "Transfer"
        : null;

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || null,
        value: tx.value,
        valueEth,
        gasUsed: tx.gasUsed,
        timestamp: parseInt(tx.timeStamp),
        method,
        status: tx.txreceipt_status === "1" || tx.isError === "0" ? "success" : "failed",
      };
    });
  } catch {
    return [];
  }
}

router.get("/wallets/:address", walletLimiter, async (req, res) => {
  const parsed = GetWalletDataParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }

  const { address } = parsed.data;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address) && !address.endsWith(".eth")) {
    res.status(400).json({ error: "Invalid Ethereum address or ENS name" });
    return;
  }

  try {
    const [balance, txCount, lastTxs, ensName, ethPrice] = await Promise.all([
      getWalletBalance(address),
      getTransactionCount(address),
      getLastTransactions(address),
      resolveEnsName(address),
      getEthPrice(),
    ]);

    const balanceUsd = ethPrice > 0
      ? (parseFloat(balance) * ethPrice).toFixed(2)
      : null;

    res.json({
      address,
      ensName,
      balanceEth: balance,
      balanceUsd,
      txCount,
      lastTransactions: lastTxs,
      firstSeen: lastTxs.length > 0
        ? new Date(Math.min(...lastTxs.map((t) => t.timestamp * 1000))).toISOString()
        : null,
      isContract: false,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get wallet data");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/wallets/:address/analyze", walletLimiter, aiLimiter, async (req, res) => {
  const parsed = AnalyzeWalletParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }

  const { address } = parsed.data;

  try {
    const [balance, txCount, lastTxs, ensName] = await Promise.all([
      getWalletBalance(address),
      getTransactionCount(address),
      getLastTransactions(address),
      resolveEnsName(address),
    ]);

    const txSummary = lastTxs
      .map(
        (tx) =>
          `- Hash: ${tx.hash.slice(0, 10)}... | From: ${tx.from.slice(0, 8)}... | To: ${tx.to?.slice(0, 8) ?? "contract"} | ${tx.valueEth} ETH | Method: ${tx.method ?? "unknown"} | Status: ${tx.status} | Time: ${new Date(tx.timestamp * 1000).toISOString()}`
      )
      .join("\n");

    const prompt = `You are a Web3 on-chain analyst. Analyze this Ethereum wallet and provide concise insights.

Wallet: ${address}
ENS Name: ${ensName ?? "none"}
Balance: ${balance} ETH
Total TX Count: ${txCount}
Recent Transactions:
${txSummary || "No recent transactions found"}

Provide a JSON response with:
{
  "summary": "2-3 sentence overview of this wallet's behavior",
  "activityType": "one of: DeFi Trader, NFT Collector, Long-term Holder, Developer, Exchange Wallet, Inactive Wallet, Active Transactor",
  "riskLevel": "low | medium | high",
  "tags": ["array", "of", "3-5", "descriptive", "tags"],
  "insights": ["array of 3-4 specific insights about this wallet's on-chain activity"]
}

Respond ONLY with valid JSON, no markdown. Never use em dashes or double hyphens in any text values.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let analysis: {
      summary: string;
      activityType: string;
      riskLevel: string;
      tags: string[];
      insights: string[];
    };

    try {
      analysis = JSON.parse(raw);
    } catch {
      analysis = {
        summary: raw,
        activityType: "Unknown",
        riskLevel: "low",
        tags: [],
        insights: [],
      };
    }

    res.json({
      address,
      summary: analysis.summary ?? "",
      activityType: analysis.activityType ?? "Unknown",
      riskLevel: (["low", "medium", "high"].includes(analysis.riskLevel) ? analysis.riskLevel : "low") as "low" | "medium" | "high",
      tags: Array.isArray(analysis.tags) ? analysis.tags : [],
      insights: Array.isArray(analysis.insights) ? analysis.insights : [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
