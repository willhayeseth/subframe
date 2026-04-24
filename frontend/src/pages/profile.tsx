import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useAccount, useEnsName, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Brain, Bot, User, Send,
  ExternalLink, Copy, CheckCircle, Tag, Lightbulb, Zap,
  Terminal, Globe, Hash, ArrowUpRight, MessageSquare, Repeat2, X, ChevronRight,
  Coins, TrendingUp, AlertCircle, TrendingDown, Activity, BarChart2, DollarSign
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { SubframeNetworkMap } from "../components/network-map";
import {
  useGetSubdomainByName,
  useListSubdomains,
  useGetWalletData,
  useAnalyzeWallet,
  useCreateOpenaiConversation,
  useListOpenaiMessages,
  getGetSubdomainByNameQueryKey,
  getGetWalletDataQueryKey,
  getAnalyzeWalletQueryKey,
  getListOpenaiMessagesQueryKey,
  getBaseUrl,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Subdomain, WalletData, WalletAnalysis } from "@workspace/api-client-react";

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    linked: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    active: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full border font-mono ${c[status] ?? c.pending}`}>
      {status}
    </span>
  );
}

/* ─── registration log ─────────────────────────────────── */

type StepState = "done" | "pending" | "waiting";

interface RegStep {
  label: string;
  detail?: string;
  txHash?: string | null;
  state: StepState;
}

function buildSteps(subdomain: Subdomain): RegStep[] {
  const st = subdomain.status;
  const isActive = st === "active" || st === "linked";
  const isLinked = st === "linked";
  const tx1 = subdomain.ensTx1Hash;
  const tx2 = subdomain.ensTx2Hash;
  const tx3 = subdomain.ensTx3Hash;
  const tx4 = subdomain.ensTx4Hash;
  const ts = subdomain.tokenStatus;

  return [
    {
      label: "Wallet verified",
      detail: `${subdomain.walletAddress.slice(0, 10)}...`,
      state: "done",
    },
    {
      label: "IPFS redirect page generated",
      state: isActive ? "done" : "pending",
    },
    {
      label: "Deployed to Pinata IPFS",
      detail: subdomain.ipfsCid ? `${subdomain.ipfsCid.slice(0, 14)}...` : undefined,
      state: isActive ? "done" : "pending",
    },
    {
      label: "ENS setSubnodeRecord",
      txHash: tx1,
      state: tx1 ? "done" : isActive ? "waiting" : "pending",
    },
    {
      label: "ENS setContenthash",
      txHash: tx2,
      state: tx2 ? "done" : tx1 ? "waiting" : isActive ? "waiting" : "pending",
    },
    {
      label: "ENS setAddr",
      txHash: tx3,
      state: tx3 ? "done" : tx2 ? "waiting" : isActive ? "waiting" : "pending",
    },
    {
      label: "Transfer ownership to your wallet",
      txHash: tx4,
      state: tx4 ? "done" : tx3 ? "waiting" : isActive ? "waiting" : "pending",
    },
    {
      label: "Identity active on-chain",
      state: isLinked ? "done" : "pending",
    },
    ...(ts === "deployed" || ts === "deploying" ? [{
      label: ts === "deployed"
        ? `Art Token deployed: $${subdomain.tokenSymbol ?? "..."}`
        : "Art Token minting on bonding curve",
      txHash: subdomain.tokenDeployTxHash,
      state: ts === "deployed" ? "done" as const : "waiting" as const,
    }] : []),
  ];
}

function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={`https://etherscan.io/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-1.5 font-mono text-[#CBFF4D]/30 hover:text-[#CBFF4D]/70 transition-colors inline-flex items-center gap-0.5 group"
      title={hash}
    >
      {hash.slice(0, 10)}...
      <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function RegistrationLog({ subdomain }: { subdomain: Subdomain }) {
  const steps = buildSteps(subdomain);
  const st = subdomain.status;
  const isLinked = st === "linked";
  const isActive = st === "active";
  const ensStarted = !!(subdomain.ensTx1Hash);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#080808] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
        <Terminal className="w-3.5 h-3.5 text-[#CBFF4D]/50" />
        <span className="text-xs font-mono text-white/30 uppercase tracking-wider">Registration Log</span>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-xs">
          {isLinked ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D]" />
              <span className="text-[#CBFF4D]/70">on-chain</span>
            </>
          ) : ensStarted ? (
            <>
              <Loader2 className="w-3 h-3 text-amber-400/60 animate-spin" />
              <span className="text-amber-400/70">ens confirming</span>
            </>
          ) : isActive ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400/70">ipfs ready, ens pending</span>
            </>
          ) : (
            <>
              <Loader2 className="w-3 h-3 text-white/25 animate-spin" />
              <span className="text-white/25">processing</span>
            </>
          )}
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2.5 font-mono text-xs">
            {step.state === "done" ? (
              <CheckCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${i === steps.length - 1 ? "text-[#CBFF4D]" : "text-[#CBFF4D]/40"}`} />
            ) : step.state === "waiting" ? (
              <Loader2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400/60 animate-spin" />
            ) : (
              <div className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white/15" />
              </div>
            )}
            <span className={
              step.state === "done"
                ? i === steps.length - 1 ? "text-[#CBFF4D]/80" : "text-white/40"
                : step.state === "waiting"
                  ? "text-amber-400/50"
                  : "text-white/15"
            }>
              {step.label}
              {step.detail && (
                <span className="ml-1.5 text-white/20">{step.detail}</span>
              )}
              {step.txHash && step.state === "done" && (
                <TxLink hash={step.txHash} />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── art token card ────────────────────────────────────── */

const ART_PROTOCOL_MINI_ABI = [
  { name: "getMintPrice", type: "function", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "getBurnPayout", type: "function", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "totalSupply", type: "function", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "balanceOf", type: "function", inputs: [{ name: "account", type: "address" }, { name: "id", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "mint", type: "function", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "payable" },
  { name: "burn", type: "function", inputs: [{ name: "tokenId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

function fmtEth(wei: bigint): string {
  const e = parseFloat(formatEther(wei));
  if (e >= 1) return `${e.toFixed(4)} ETH`;
  if (e >= 0.001) return `${e.toFixed(6)} ETH`;
  return `${e.toFixed(8)} ETH`;
}

function buildCurvePoints(currentSupply: number): { supply: number; price: number }[] {
  const BASE = 0.001;
  const INC = 0.0001;
  const max = Math.max(currentSupply + 20, 30);
  return Array.from({ length: max + 1 }, (_, i) => ({ supply: i, price: parseFloat((BASE + i * INC).toFixed(6)) }));
}

function ArtBondingCurve({ contractAddress, artTokenId }: { contractAddress: string; artTokenId: string }) {
  const { address: userAddress } = useAccount();
  const tokenId = BigInt(artTokenId);
  const addr = contractAddress as `0x${string}`;

  const { data: mintPrice, refetch: refetchMintPrice } = useReadContract({ address: addr, abi: ART_PROTOCOL_MINI_ABI, functionName: "getMintPrice", args: [tokenId] });
  const { data: burnPayout, refetch: refetchBurnPayout } = useReadContract({ address: addr, abi: ART_PROTOCOL_MINI_ABI, functionName: "getBurnPayout", args: [tokenId] });
  const { data: supply, refetch: refetchSupply } = useReadContract({ address: addr, abi: ART_PROTOCOL_MINI_ABI, functionName: "totalSupply", args: [tokenId] });
  const { data: userBalance } = useReadContract({ address: addr, abi: ART_PROTOCOL_MINI_ABI, functionName: "balanceOf", args: userAddress ? [userAddress, tokenId] : undefined, query: { enabled: !!userAddress } });

  const { writeContract: writeMint, data: mintTxHash, isPending: mintPending, error: mintError } = useWriteContract();
  const { writeContract: writeBurn, data: burnTxHash, isPending: burnPending, error: burnError } = useWriteContract();
  const { isLoading: mintConfirming, isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintTxHash });
  const { isLoading: burnConfirming, isSuccess: burnSuccess } = useWaitForTransactionReceipt({ hash: burnTxHash });

  useEffect(() => {
    if (mintSuccess || burnSuccess) {
      refetchMintPrice(); refetchBurnPayout(); refetchSupply();
    }
  }, [mintSuccess, burnSuccess]);

  const currentSupply = Number(supply ?? 0n);
  const curveData = buildCurvePoints(currentSupply);
  const holdingCount = Number(userBalance ?? 0n);

  const handleMint = () => {
    if (!mintPrice) return;
    writeMint({ address: addr, abi: ART_PROTOCOL_MINI_ABI, functionName: "mint", args: [tokenId], value: mintPrice });
  };

  const handleBurn = () => {
    if (holdingCount < 1) return;
    writeBurn({ address: addr, abi: ART_PROTOCOL_MINI_ABI, functionName: "burn", args: [tokenId, 1n] });
  };

  const mintLoading = mintPending || mintConfirming;
  const burnLoading = burnPending || burnConfirming;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="font-mono text-xl font-black text-[#CBFF4D]">{mintPrice ? fmtEth(mintPrice) : "---"}</div>
          <div className="text-[10px] text-white/25 font-mono">mint price (bonding curve)</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-white/60">{currentSupply}</div>
          <div className="text-[10px] text-white/25 font-mono">editions minted</div>
        </div>
      </div>

      <div className="h-[70px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curveData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#CBFF4D" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#CBFF4D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="supply" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip
              contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
              itemStyle={{ color: "#CBFF4D" }}
              labelStyle={{ color: "rgba(255,255,255,0.3)" }}
              formatter={(v: number) => [`${v.toFixed(6)} ETH`, "price"]}
              labelFormatter={(l: number) => `supply: ${l}`}
            />
            <Area type="monotone" dataKey="price" stroke="#CBFF4D" strokeWidth={1.5} fill="url(#curveGrad)"
              dot={(props: { cx: number; cy: number; index: number }) => {
                if (props.index !== currentSupply) return <g key={props.index} />;
                return <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill="#CBFF4D" stroke="#111" strokeWidth={2} />;
              }}
              activeDot={{ r: 3, fill: "#CBFF4D", strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleMint}
          disabled={mintLoading || !mintPrice || !userAddress}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/25 text-[#CBFF4D] text-sm font-bold hover:bg-[#CBFF4D]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {mintLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          {mintLoading ? "Buying..." : `Buy ${mintPrice ? fmtEth(mintPrice) : ""}`}
        </button>
        <button
          onClick={handleBurn}
          disabled={burnLoading || holdingCount < 1 || !userAddress}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {burnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
          {burnLoading ? "Selling..." : `Sell ${burnPayout ? fmtEth(burnPayout) : ""}`}
        </button>
      </div>

      {!userAddress && (
        <p className="text-center text-xs text-white/25 font-mono">Connect wallet to buy or sell</p>
      )}

      {holdingCount > 0 && (
        <div className="rounded-lg bg-[#CBFF4D]/5 border border-[#CBFF4D]/10 px-3 py-2 text-center">
          <span className="text-xs font-mono text-[#CBFF4D]/70">You hold <strong>{holdingCount}</strong> edition{holdingCount !== 1 ? "s" : ""}</span>
          {burnPayout && <span className="text-white/25 font-mono text-xs"> · sell value: {fmtEth(burnPayout * BigInt(holdingCount))}</span>}
        </div>
      )}

      {(mintError || burnError) && (
        <p className="text-xs text-red-400/60 font-mono text-center truncate">{(mintError ?? burnError)?.message?.slice(0, 80)}</p>
      )}

      {(mintSuccess || burnSuccess) && (
        <p className="text-xs text-[#CBFF4D]/60 font-mono text-center">Transaction confirmed</p>
      )}
    </div>
  );
}

function ArtTokenCard({ subdomain }: { subdomain: Subdomain }) {
  const [copiedAddr, setCopiedAddr] = useState<"token" | "pair" | null>(null);
  const ts = subdomain.tokenStatus;

  const copy = (text: string, which: "token" | "pair") => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(which);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  if (ts === "none" || ts === "failed") {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-[#080808] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
          <Coins className="w-3.5 h-3.5 text-white/20" />
          <span className="text-xs font-mono text-white/20 uppercase tracking-wider">Art Token</span>
          <div className="ml-auto flex items-center gap-1.5 font-mono text-xs text-white/20">
            <span>coming soon</span>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-white/20 font-mono">
            Art Protocol token minting will be available soon for this subdomain.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#CBFF4D]/15 bg-[#080808] overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/20 to-transparent" />
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
        <Coins className="w-3.5 h-3.5 text-[#CBFF4D]/60" />
        <span className="text-xs font-mono text-white/30 uppercase tracking-wider">Art Token</span>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-xs">
          {ts === "deployed" ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D]" />
              <span className="text-[#CBFF4D]/70">live on bonding curve</span>
            </>
          ) : (
            <>
              <Loader2 className="w-3 h-3 text-amber-400/60 animate-spin" />
              <span className="text-amber-400/70">deploying</span>
            </>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {ts === "deploying" && (
          <p className="text-xs text-white/30 font-mono">
            Creating ERC-1155 edition on bonding curve...
          </p>
        )}

        {ts === "deployed" && (
          <>
            <div className="flex items-center gap-3">
              <div className="font-mono text-lg font-black text-[#CBFF4D]">
                ${subdomain.tokenSymbol ?? "..."}
              </div>
              <div className="text-xs text-white/30 font-mono">{subdomain.tokenName ?? ""}</div>
            </div>

            {subdomain.tokenAddress && subdomain.artTokenId && (
              <ArtBondingCurve contractAddress={subdomain.tokenAddress} artTokenId={subdomain.artTokenId} />
            )}

            {subdomain.tokenAddress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <div>
                    <div className="text-[10px] text-white/25 uppercase tracking-widest font-mono mb-0.5">Token</div>
                    <span className="font-mono text-xs text-white/45 truncate">
                      {subdomain.tokenAddress.slice(0, 18)}...{subdomain.tokenAddress.slice(-6)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copy(subdomain.tokenAddress!, "token")}
                      className="text-white/20 hover:text-[#CBFF4D] transition-colors"
                    >
                      {copiedAddr === "token" ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={`https://etherscan.io/token/${subdomain.tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/20 hover:text-[#CBFF4D] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {subdomain.artTokenId && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div>
                      <div className="text-[10px] text-white/25 uppercase tracking-widest font-mono mb-0.5">Token ID</div>
                      <span className="font-mono text-xs text-white/45 truncate">
                        #{subdomain.artTokenId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copy(subdomain.artTokenId!, "pair")}
                        className="text-white/20 hover:text-[#CBFF4D] transition-colors"
                      >
                        {copiedAddr === "pair" ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={`https://etherscan.io/token/${subdomain.tokenAddress}?a=${subdomain.artTokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/20 hover:text-[#CBFF4D] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {subdomain.tokenDeployTxHash && (
                  <a
                    href={`https://etherscan.io/tx/${subdomain.tokenDeployTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-mono text-white/20 hover:text-[#CBFF4D]/50 transition-colors"
                  >
                    Deploy tx: {subdomain.tokenDeployTxHash.slice(0, 16)}...
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

/* ─── ai chat ───────────────────────────────────────────── */

function AiChat({ address, walletData, analysis }: { address: string; walletData?: WalletData; analysis?: WalletAnalysis }) {
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const msgsRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const createConv = useCreateOpenaiConversation();
  const { data: messages } = useListOpenaiMessages(convId ?? 0, {
    query: { enabled: !!convId, queryKey: getListOpenaiMessagesQueryKey(convId ?? 0), refetchInterval: false },
  });

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, streamContent]);

  const getCtx = () => {
    const p = [`Wallet: ${address}`];
    if (walletData) { p.push(`Balance: ${walletData.balanceEth} ETH`); p.push(`TXs: ${(walletData.txCount ?? 0)}`); }
    if (analysis) { p.push(`Activity: ${analysis.activityType}`); p.push(`Risk: ${analysis.riskLevel}`); p.push(analysis.summary); }
    return p.join("\n");
  };

  const send = async () => {
    if (!input.trim() || streaming) return;
    const content = input; setInput("");
    let cId = convId;
    if (!cId) {
      const conv = await new Promise<typeof createConv.data>((res) => {
        createConv.mutate({ data: { title: `Profile: ${address.slice(0, 10)}...` } }, { onSuccess: res });
      });
      if (!conv) return;
      cId = conv.id; setConvId(cId);
    }
    await qc.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(cId) });
    setStreaming(true); setStreamContent("");
    try {
      const res = await fetch(`${getBaseUrl()}/api/openai/conversations/${cId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, walletContext: getCtx() }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      let buf = ""; let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          try {
            const j = JSON.parse(p.slice(6));
            if (j.done) { setStreamContent(""); await qc.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(cId!) }); }
            else if (j.content) { full += j.content; setStreamContent(full); }
          } catch {}
        }
      }
    } finally { setStreaming(false); }
  };

  const allMsgs = messages ?? [];

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#0e0e0e] overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2.5 bg-white/[0.02]">
        <div className="w-7 h-7 rounded-lg bg-[#CBFF4D]/10 border border-[#CBFF4D]/15 flex items-center justify-center">
          <Bot className="w-4 h-4 text-[#CBFF4D]" />
        </div>
        <span className="text-sm font-semibold text-white/80">AI Web3 Assistant</span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-white/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>
      <div ref={msgsRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {allMsgs.length === 0 && !streaming && (
          <div className="flex items-center justify-center h-full text-sm text-white/25">
            Ask anything about this wallet...
          </div>
        )}
        {allMsgs.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-[#CBFF4D]/15" : "bg-white/5"}`}>
              {msg.role === "user" ? <User className="w-3 h-3 text-[#CBFF4D]/80" /> : <Bot className="w-3 h-3 text-white/50" />}
            </div>
            <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-[#CBFF4D]/8 text-white/90 border border-[#CBFF4D]/15 rounded-tr-sm" : "bg-white/[0.04] text-white/65 border border-white/[0.06] rounded-tl-sm"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {streaming && streamContent && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3 h-3 text-white/50" />
            </div>
            <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm bg-white/[0.04] text-white/65 border border-white/[0.06]">
              {streamContent}<span className="inline-block w-0.5 h-4 bg-[#CBFF4D] ml-0.5 animate-pulse" />
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-white/[0.05] flex gap-2">
        <input
          data-testid="input-chat-message"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about this wallet..."
          disabled={streaming}
          className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#CBFF4D]/30 disabled:opacity-50 transition-all"
        />
        <button
          data-testid="btn-send-chat"
          onClick={send}
          disabled={!input.trim() || streaming}
          className="p-2.5 rounded-xl btn-primary-rayo text-[#0C0C0C] disabled:opacity-40"
        >
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

const riskColor = {
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  high: "text-red-400 bg-red-400/10 border-red-400/20",
};

/* ─── page ──────────────────────────────────────────────── */

export default function Profile() {
  const { name } = useParams<{ name: string }>();
  const [copied, setCopied] = useState(false);
  const [csModal, setCsModal] = useState<"messages" | "copytrade" | null>(null);
  const [ctAmount, setCtAmount] = useState<string>("0.1");

  const { data: subdomain, isLoading: subLoading } = useGetSubdomainByName(name, {
    query: {
      enabled: !!name,
      queryKey: getGetSubdomainByNameQueryKey(name),
      refetchInterval: (query) => {
        const data = query.state.data as Subdomain | undefined;
        const settled = data?.status === "linked" && data?.tokenStatus !== "deploying";
        return settled ? false : 5000;
      },
    },
  });

  const { data: allSubdomains } = useListSubdomains();

  const { data: walletData, isLoading: walletLoading } = useGetWalletData(
    subdomain?.walletAddress ?? "",
    { query: { enabled: !!subdomain?.walletAddress, queryKey: getGetWalletDataQueryKey(subdomain?.walletAddress ?? "") } }
  );

  const { data: analysis, isLoading: analysisLoading } = useAnalyzeWallet(
    subdomain?.walletAddress ?? "",
    { query: { enabled: !!walletData, queryKey: getAnalyzeWalletQueryKey(subdomain?.walletAddress ?? "") } }
  );

  const { address: connectedAddress, isConnected } = useAccount();
  const [, setLocation] = useLocation();

  const isOwnProfile = !!(
    connectedAddress &&
    subdomain?.walletAddress &&
    connectedAddress.toLowerCase() === subdomain.walletAddress.toLowerCase()
  );

  useEffect(() => {
    if (subLoading || !subdomain || isOwnProfile) return;
    if (isConnected) {
      window.location.href = `https://subframe.eth.limo/${subdomain.name}`;
      return;
    }
    const t = setTimeout(() => {
      if (!isOwnProfile) window.location.href = `https://subframe.eth.limo/${subdomain.name}`;
    }, 1800);
    return () => clearTimeout(t);
  }, [subLoading, subdomain, isOwnProfile, isConnected]);

  // Check if connected wallet has already set this subdomain as its primary ENS name
  const { data: ensName } = useEnsName({
    address: connectedAddress,
    query: { enabled: isOwnProfile && subdomain?.status === "linked" },
  });
  const primaryNameAlreadySet =
    !!ensName && !!subdomain?.ensFullName &&
    ensName.toLowerCase() === subdomain.ensFullName.toLowerCase();

  // Show CTA only on own profile when backend registration is done
  const showPrimaryNameCta = isOwnProfile && subdomain?.status === "linked";

  // Hide the registration log once all ENS + token steps are done
  const allBackendStepsDone = !!(
    subdomain?.ensTx1Hash && subdomain?.ensTx2Hash && subdomain?.ensTx3Hash && subdomain?.ensTx4Hash
    && subdomain?.status === "linked"
    && subdomain?.tokenStatus !== "deploying"
  );

  const copyAddress = () => {
    if (subdomain?.walletAddress) {
      navigator.clipboard.writeText(subdomain.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  if (subLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#CBFF4D]" />
      </div>
    );
  }

  if (!subdomain) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 min-h-[60vh]">
        <p className="text-white/40">
          Subdomain <span className="font-mono text-[#CBFF4D]/60">{name}.subframe.eth</span> not found
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0C0C0C]">
      {/* Coming Soon Modal */}
      <AnimatePresence>
        {csModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setCsModal(null)}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/30 to-transparent" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center">
                      {csModal === "messages"
                        ? <MessageSquare className="w-5 h-5 text-[#CBFF4D]" />
                        : <Repeat2 className="w-5 h-5 text-[#CBFF4D]" />}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        {csModal === "messages" ? "Messages" : "Copy Trade"}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#CBFF4D]/15 text-[#CBFF4D] border border-[#CBFF4D]/25 uppercase tracking-wider">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setCsModal(null)} className="text-white/30 hover:text-white transition-colors mt-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {csModal === "messages" ? (
                  <p className="text-sm text-white/40 leading-relaxed">
                    Send on-chain encrypted messages to this wallet. Powered by XMTP protocol, messages are stored decentrally and readable only by the recipient.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-white/40 leading-relaxed mb-4">
                      Auto-mirror every trade this wallet makes. Choose your position size and we handle execution.
                    </p>
                    <div className="flex gap-2 mb-4">
                      {["0.1", "0.3", "0.5"].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setCtAmount(amt)}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-black font-mono transition-all ${
                            ctAmount === amt
                              ? "border-[#CBFF4D]/40 bg-[#CBFF4D]/10 text-[#CBFF4D]"
                              : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20"
                          }`}
                        >
                          {amt} ETH
                        </button>
                      ))}
                    </div>
                    <button className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/25 text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                      <Repeat2 className="w-4 h-4" />
                      Start Copy Trade
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-[10px] text-white/20 text-center mt-3">Feature launching soon. Join waitlist via X.</p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-5 py-6 sm:py-10">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-start">

          {/* ── LEFT COLUMN ──────────────────────────────── */}
          <div className="space-y-6">

            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative rounded-2xl border border-white/[0.07] bg-[#0e0e0e] overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/25 to-transparent" />

              <div className="p-5">
                {/* avatar + name row */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-xl bg-[#CBFF4D]/10 blur-lg" />
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#111] border border-[#CBFF4D]/20 overflow-hidden shadow-[0_0_20px_rgba(203,255,77,0.12)]">
                      {subdomain.avatarUrl ? (
                        <img src={subdomain.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-[#CBFF4D] fill-[#CBFF4D]" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h1 className="text-lg sm:text-2xl font-black font-mono text-white break-all" data-testid="profile-ens-name">
                        {subdomain.ensFullName}
                      </h1>
                      <StatusBadge status={subdomain.status} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-white/25 truncate" data-testid="profile-wallet-address">
                        {subdomain.walletAddress.slice(0, 12)}...{subdomain.walletAddress.slice(-8)}
                      </span>
                      <button onClick={copyAddress} className="text-white/20 hover:text-[#CBFF4D] transition-colors shrink-0">
                        {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {/* ETH balance on mobile — inline below address */}
                    {walletData && (
                      <div className="mt-2 flex items-baseline gap-1.5 sm:hidden">
                        <span className="text-xl font-black font-mono text-white leading-none">{walletData.balanceEth}</span>
                        <span className="text-xs text-[#CBFF4D] font-bold">ETH</span>
                        {walletData.balanceUsd && <span className="text-xs text-white/20">${walletData.balanceUsd}</span>}
                      </div>
                    )}
                  </div>

                  {/* ETH balance on sm+ — right side */}
                  {walletLoading && <Loader2 className="hidden sm:block w-4 h-4 animate-spin text-white/30 shrink-0 mt-1" />}
                  {walletData && (
                    <div className="hidden sm:block shrink-0 text-right">
                      <div className="text-2xl font-black font-mono text-white leading-none">
                        {walletData.balanceEth}
                      </div>
                      <div className="text-xs text-[#CBFF4D] font-bold mt-0.5">ETH</div>
                      {walletData.balanceUsd && (
                        <div className="text-xs text-white/25 mt-0.5">${walletData.balanceUsd}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* bio */}
                {subdomain.bio && (
                  <p className="text-sm text-white/50 leading-relaxed mb-4" data-testid="profile-bio">
                    {subdomain.bio}
                  </p>
                )}

                {/* links */}
                {subdomain.ipfsCid && (
                  <div className="flex flex-wrap gap-3">
                    {subdomain.status === "linked" ? (
                      <a
                        href={`https://subframe.eth.limo/${subdomain.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#CBFF4D] hover:text-[#CBFF4D]/80 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D] animate-pulse" />
                        subframe.eth.limo/{subdomain.name}
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-white/25">
                        <Globe className="w-3 h-3" />
                        {subdomain.ensFullName}.limo
                        <span className="text-white/15">(ENS pending)</span>
                      </span>
                    )}
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${subdomain.ipfsCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-white/20 hover:text-white/40 transition-colors"
                    >
                      <Hash className="w-3 h-3" />
                      IPFS raw
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* tx count */}
                {walletData && (
                  <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center gap-4 text-xs font-mono text-white/25">
                    <span>{(walletData.txCount ?? 0).toLocaleString()} transactions</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Action Buttons: Messages + Copy Trade */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="flex gap-3"
            >
              <button
                onClick={() => setCsModal("messages")}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border border-white/[0.08] bg-[#0e0e0e] hover:border-[#CBFF4D]/25 hover:bg-[#CBFF4D]/[0.04] transition-all group"
              >
                <MessageSquare className="w-4 h-4 text-white/35 group-hover:text-[#CBFF4D] transition-colors" />
                <span className="text-sm font-bold text-white/50 group-hover:text-white transition-colors">Messages</span>
              </button>
              <button
                onClick={() => setCsModal("copytrade")}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border border-white/[0.08] bg-[#0e0e0e] hover:border-[#CBFF4D]/25 hover:bg-[#CBFF4D]/[0.04] transition-all group"
              >
                <Repeat2 className="w-4 h-4 text-white/35 group-hover:text-[#CBFF4D] transition-colors" />
                <span className="text-sm font-bold text-white/50 group-hover:text-white transition-colors">Copy Trade</span>
              </button>
            </motion.div>

            {/* Art Token Card */}
            {subdomain.tokenStatus !== "none" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.09 }}
              >
                <ArtTokenCard subdomain={subdomain} />
              </motion.div>
            )}

            {/* Registration Log — hidden once all backend steps are done */}
            {!allBackendStepsDone && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <RegistrationLog subdomain={subdomain} />
              </motion.div>
            )}

            {/* Primary Name CTA — only for own profile when registration complete */}
            {showPrimaryNameCta && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className={`rounded-xl border p-4 flex items-center gap-3 ${
                  primaryNameAlreadySet
                    ? "border-white/[0.06] bg-white/[0.02]"
                    : "border-[#CBFF4D]/20 bg-[#CBFF4D]/[0.03]"
                }`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  primaryNameAlreadySet ? "bg-white/[0.05]" : "bg-[#CBFF4D]/10"
                }`}>
                  {primaryNameAlreadySet
                    ? <CheckCircle className="w-4 h-4 text-[#CBFF4D]/60" />
                    : <Zap className="w-4 h-4 text-[#CBFF4D] fill-[#CBFF4D]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold leading-snug ${primaryNameAlreadySet ? "text-white/40" : "text-white"}`}>
                    {primaryNameAlreadySet ? "Primary ENS Name Set" : "Set as Primary ENS Name"}
                  </p>
                  <p className="text-xs text-white/25 mt-0.5 leading-snug">
                    {primaryNameAlreadySet
                      ? <><span className="font-mono text-[#CBFF4D]/40">{subdomain.ensFullName}</span> appears on Etherscan</>
                      : <>Make <span className="font-mono text-[#CBFF4D]/60">{subdomain.ensFullName}</span> appear on Etherscan</>
                    }
                  </p>
                </div>
                {primaryNameAlreadySet ? (
                  <span className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white/20 border border-white/[0.06] cursor-default">
                    Complete
                  </span>
                ) : (
                  <button
                    onClick={() => setLocation(`/onboarding/${subdomain.name}`)}
                    className="shrink-0 px-3 py-1.5 btn-lime rounded-lg text-xs font-bold text-black"
                  >
                    Set now
                  </button>
                )}
              </motion.div>
            )}

            {/* Recent Transactions */}
            {walletData && walletData.lastTransactions.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <h2 className="text-sm font-bold text-white/50 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
                  Recent Transactions
                </h2>
                <div className="rounded-xl border border-white/[0.06] bg-[#0e0e0e] overflow-hidden">
                  {walletData.lastTransactions.map((tx, i) => (
                    <div
                      key={tx.hash}
                      className={`flex items-center justify-between px-4 py-3.5 ${i < walletData.lastTransactions.length - 1 ? "border-b border-white/[0.04]" : ""} hover:bg-white/[0.02] transition-colors`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-white/35 truncate">{tx.hash.slice(0, 18)}...</div>
                          <div className="text-xs text-white/20 mt-0.5">
                            {tx.from.slice(0, 8)}... to {tx.to ? `${tx.to.slice(0, 8)}...` : "Contract"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {tx.method && (
                          <span className="hidden sm:inline text-xs bg-[#CBFF4D]/8 text-[#CBFF4D]/60 px-2 py-0.5 rounded font-mono border border-[#CBFF4D]/10">
                            {tx.method}
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-white whitespace-nowrap">
                          {tx.valueEth} <span className="text-[#CBFF4D]">ETH</span>
                        </span>
                        <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-white/15 hover:text-[#CBFF4D] transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* AI Analysis */}
            {analysisLoading && (
              <div className="flex items-center gap-2.5 text-white/30 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[#CBFF4D]" />
                <span>Generating AI analysis...</span>
              </div>
            )}
            {analysis && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <h2 className="text-sm font-bold text-white/50 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
                  AI Wallet Analysis
                </h2>
                <div className="relative p-5 rounded-xl border border-[#CBFF4D]/10 bg-gradient-to-b from-[#CBFF4D]/[0.03] to-transparent overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/20 to-transparent" />
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#CBFF4D]/10 border border-[#CBFF4D]/15 flex items-center justify-center">
                        <Brain className="w-3.5 h-3.5 text-[#CBFF4D]" />
                      </div>
                      <span className="font-semibold text-white/80 text-sm">{analysis.activityType}</span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-mono ${riskColor[analysis.riskLevel as keyof typeof riskColor] ?? riskColor.low}`}>
                      Risk: {analysis.riskLevel}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.05] mb-3">
                    <p className="text-sm text-white/55 leading-relaxed">{analysis.summary}</p>
                  </div>
                  {analysis.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {analysis.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#CBFF4D]/8 border border-[#CBFF4D]/12 text-xs text-[#CBFF4D]/60">
                          <Tag className="w-2.5 h-2.5" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {analysis.insights.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-white/20 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-400" /> Insights
                      </div>
                      <ul className="space-y-1.5">
                        {analysis.insights.map((ins, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                            <span className="text-[#CBFF4D] mt-0.5 shrink-0 text-xs">+</span>{ins}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

          </div>

          {/* ── RIGHT COLUMN: map + chat ─────────────────── */}
          <div className="lg:sticky lg:top-6 flex flex-col gap-6 lg:h-[calc(100vh-120px)]">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="shrink-0 h-[390px]"
            >
              <SubframeNetworkMap
                subdomains={allSubdomains ?? []}
                currentName={name}
              />
            </motion.div>

            {subdomain.walletAddress && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="shrink-0 flex flex-col"
                style={{ height: "calc(100vh - 350px)", minHeight: "480px" }}
              >
                <h2 className="text-sm font-bold text-white/50 mb-3 flex items-center gap-2 uppercase tracking-wider shrink-0">
                  <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
                  AI Chat
                </h2>
                <div className="flex-1 min-h-0">
                  <AiChat address={subdomain.walletAddress} walletData={walletData} analysis={analysis} />
                </div>
              </motion.div>
            )}
          </div>

        </div>

        {/* Deploy AI Agent */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-6"
        >
          <h2 className="text-sm font-bold text-white/50 mb-3 flex items-center gap-2 uppercase tracking-wider">
            <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
            Deploy AI Agent
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=Check+out+${subdomain.ensFullName}+on+Subframe+Protocol+%F0%9F%94%97&url=https%3A%2F%2Fsubframe.eth.limo%2F${subdomain.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-white/[0.07] bg-[#0e0e0e] hover:border-white/[0.15] hover:bg-white/[0.03] transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="absolute top-2.5 right-2.5 text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/30">Soon</span>
              <div className="w-11 h-11 rounded-xl bg-black border border-white/[0.1] flex items-center justify-center group-hover:border-white/25 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-label="X">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">Deploy to X</div>
                <div className="text-xs text-white/30 mt-0.5">Share as AI agent on X</div>
              </div>
            </a>

            <a
              href={`https://t.me/share/url?url=https%3A%2F%2Fsubframe.eth.limo%2F${subdomain.name}&text=Check+out+${subdomain.ensFullName}+on+Subframe+Protocol`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-white/[0.07] bg-[#0e0e0e] hover:border-[#229ED9]/30 hover:bg-[#229ED9]/[0.04] transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#229ED9]/15 to-transparent" />
              <span className="absolute top-2.5 right-2.5 text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/30">Soon</span>
              <div className="w-11 h-11 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/20 flex items-center justify-center group-hover:border-[#229ED9]/40 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#229ED9]" aria-label="Telegram">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">Deploy to Telegram</div>
                <div className="text-xs text-white/30 mt-0.5">Share as AI agent on Telegram</div>
              </div>
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

/* ─── standalone profile (ENS domain, no navbar) ────────── */

export function StandaloneProfile() {
  const { name } = useParams<{ name: string }>();
  const [copied, setCopied] = useState(false);

  const { data: subdomain, isLoading: subLoading } = useGetSubdomainByName(name, {
    query: {
      enabled: !!name,
      queryKey: getGetSubdomainByNameQueryKey(name),
      refetchInterval: (query) => {
        const data = query.state.data as Subdomain | undefined;
        const settled = data?.status === "linked" && data?.tokenStatus !== "deploying";
        return settled ? false : 5000;
      },
    },
  });

  const { data: walletData, isLoading: walletLoading } = useGetWalletData(
    subdomain?.walletAddress ?? "",
    { query: { enabled: !!subdomain?.walletAddress, queryKey: getGetWalletDataQueryKey(subdomain?.walletAddress ?? "") } }
  );

  const { data: analysis, isLoading: analysisLoading } = useAnalyzeWallet(
    subdomain?.walletAddress ?? "",
    { query: { enabled: !!subdomain?.walletAddress, queryKey: getAnalyzeWalletQueryKey(subdomain?.walletAddress ?? "") } }
  );

  function copyAddress() {
    if (!subdomain) return;
    navigator.clipboard.writeText(subdomain.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (subLoading) {
    return (
      <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#CBFF4D]" />
      </div>
    );
  }

  if (!subdomain) {
    return (
      <div className="min-h-screen bg-[#0C0C0C] flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 text-sm">
          Subdomain <span className="font-mono text-[#CBFF4D]/60">{name}.subframe.eth</span> not found
        </p>
        <a
          href="https://subframe.eth.limo"
          className="text-xs text-white/20 hover:text-[#CBFF4D]/50 transition-colors"
        >
          Built on Subframe
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0C0C] flex flex-col">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#0C0C0C]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <a href="https://subframe.network" className="inline-flex items-center gap-1.5 text-xs text-white/20 hover:text-[#CBFF4D]/60 transition-colors">
            <Zap className="w-3 h-3 text-[#CBFF4D]/30" />
            <span className="font-mono">subframe.eth</span>
          </a>
          <span className="font-mono text-xs text-white/20">{subdomain.ensFullName}</span>
        </div>
      </header>

      {/* ── Main two-column grid ── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 lg:grid lg:grid-cols-[1fr_400px] lg:gap-6 lg:items-start space-y-5 lg:space-y-0">

        {/* ════ LEFT COLUMN ════ */}
        <div className="space-y-5 min-w-0">

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-2xl border border-white/[0.07] bg-[#0e0e0e] overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/25 to-transparent" />
            <div className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-xl bg-[#CBFF4D]/10 blur-lg" />
                  <div className="relative w-16 h-16 rounded-xl bg-[#111] border border-[#CBFF4D]/20 overflow-hidden shadow-[0_0_20px_rgba(203,255,77,0.12)]">
                    {subdomain.avatarUrl ? (
                      <img src={subdomain.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Zap className="w-7 h-7 text-[#CBFF4D] fill-[#CBFF4D]" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h1 className="text-2xl font-black font-mono text-white break-all">{subdomain.ensFullName}</h1>
                    <StatusBadge status={subdomain.status} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-white/25 truncate">
                      {subdomain.walletAddress.slice(0, 12)}...{subdomain.walletAddress.slice(-8)}
                    </span>
                    <button onClick={copyAddress} className="text-white/20 hover:text-[#CBFF4D] transition-colors shrink-0">
                      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a href={`https://etherscan.io/address/${subdomain.walletAddress}`} target="_blank" rel="noopener noreferrer" className="text-white/15 hover:text-[#CBFF4D]/60 transition-colors shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                {walletLoading && <Loader2 className="w-4 h-4 animate-spin text-white/30 shrink-0 mt-1" />}
                {walletData && (
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-black font-mono text-white leading-none">{walletData.balanceEth}</div>
                    <div className="text-xs text-[#CBFF4D] font-bold mt-0.5">ETH</div>
                    {walletData.balanceUsd && <div className="text-xs text-white/25 mt-0.5">${walletData.balanceUsd}</div>}
                  </div>
                )}
              </div>
              {subdomain.bio && <p className="text-sm text-white/50 leading-relaxed mb-4">{subdomain.bio}</p>}
              {subdomain.ipfsCid && subdomain.status === "linked" && (
                <div className="flex flex-wrap gap-3">
                  <a href={`https://subframe.eth.limo/${subdomain.name}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#CBFF4D] hover:text-[#CBFF4D]/80 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D] animate-pulse" />
                    subframe.eth.limo/{subdomain.name}
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              )}
              {walletData && (
                <div className="mt-4 pt-4 border-t border-white/[0.05] text-xs font-mono text-white/25">
                  {(walletData.txCount ?? 0).toLocaleString()} transactions
                </div>
              )}
            </div>
          </motion.div>

          {/* Art Token */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <h2 className="text-xs font-bold text-white/30 mb-3 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
              Art Token
            </h2>
            <div className="rounded-2xl border border-white/[0.07] bg-[#0e0e0e] overflow-hidden">
              <div className="aspect-video w-full flex items-center justify-center bg-[#111]">
                <div className="flex flex-col items-center gap-2 text-white/20">
                  <div className="w-12 h-12 rounded-xl bg-[#CBFF4D]/8 border border-[#CBFF4D]/15 flex items-center justify-center">
                    <ExternalLink className="w-6 h-6 text-[#CBFF4D]/40" />
                  </div>
                  <span className="text-xs font-mono">Art token pending</span>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white/70">{subdomain.name} Art</div>
                  <div className="text-xs text-white/30 font-mono mt-0.5">ERC-1155 on Ethereum</div>
                </div>
                <span className="text-xs text-white/20 px-2 py-1 rounded-lg border border-white/8">Soon</span>
              </div>
            </div>
          </motion.div>

          {/* AI Wallet Analysis */}
          {analysisLoading && (
            <div className="flex items-center gap-2.5 text-white/30 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#CBFF4D]" />
              <span>Generating AI analysis...</span>
            </div>
          )}
          {analysis && (
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}>
              <h2 className="text-xs font-bold text-white/30 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
                AI Wallet Analysis
              </h2>
              <div className="relative p-5 rounded-xl border border-[#CBFF4D]/10 bg-gradient-to-b from-[#CBFF4D]/[0.03] to-transparent overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/20 to-transparent" />
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#CBFF4D]/10 border border-[#CBFF4D]/15 flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-[#CBFF4D]" />
                    </div>
                    <span className="font-semibold text-white/80 text-sm">{analysis.activityType}</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-mono ${riskColor[analysis.riskLevel as keyof typeof riskColor] ?? riskColor.low}`}>
                    Risk: {analysis.riskLevel}
                  </span>
                </div>
                <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.05] mb-3">
                  <p className="text-sm text-white/55 leading-relaxed">{analysis.summary}</p>
                </div>
                {analysis.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {analysis.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#CBFF4D]/8 border border-[#CBFF4D]/12 text-xs text-[#CBFF4D]/60">
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
                {analysis.insights.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-white/20 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-400" /> Insights
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.insights.map((ins, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                          <span className="text-[#CBFF4D] mt-0.5 shrink-0 text-xs">+</span>{ins}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* Recent Transactions — desktop below analysis, mobile order preserved */}
          {walletData && walletData.lastTransactions.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }}>
              <h2 className="text-xs font-bold text-white/30 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
                Recent Transactions
              </h2>
              <div className="rounded-xl border border-white/[0.06] bg-[#0e0e0e] overflow-hidden">
                {walletData.lastTransactions.map((tx, i) => (
                  <div key={tx.hash} className={`flex items-center justify-between px-4 py-3.5 ${i < walletData.lastTransactions.length - 1 ? "border-b border-white/[0.04]" : ""} hover:bg-white/[0.02] transition-colors`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-white/35 truncate">{tx.hash.slice(0, 18)}...</div>
                        <div className="text-xs text-white/20 mt-0.5">
                          {tx.from.slice(0, 8)}... → {tx.to ? `${tx.to.slice(0, 8)}...` : "Contract"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {tx.method && (
                        <span className="hidden sm:inline text-xs bg-[#CBFF4D]/8 text-[#CBFF4D]/60 px-2 py-0.5 rounded font-mono border border-[#CBFF4D]/10">
                          {tx.method}
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-white whitespace-nowrap">
                        {tx.valueEth} <span className="text-[#CBFF4D]">ETH</span>
                      </span>
                      <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-white/15 hover:text-[#CBFF4D] transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="space-y-5 lg:sticky lg:top-16">

          {/* AI Chat */}
          {subdomain.walletAddress && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <h2 className="text-xs font-bold text-white/30 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
                AI Chat
              </h2>
              <div className="h-[480px]">
                <AiChat address={subdomain.walletAddress} walletData={walletData} analysis={analysis} />
              </div>
            </motion.div>
          )}

          {/* Deploy AI Agent */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
            <h2 className="text-xs font-bold text-white/30 mb-3 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
              Deploy AI Agent
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=Check+out+${subdomain.ensFullName}+on+Subframe+Protocol+%F0%9F%94%97&url=https%3A%2F%2Fsubframe.eth.limo%2F${subdomain.name}`}
                target="_blank" rel="noopener noreferrer"
                className="group relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border border-white/[0.07] bg-[#0e0e0e] hover:border-white/[0.15] hover:bg-white/[0.03] transition-all duration-200 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="absolute top-2 right-2 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/30">Soon</span>
                <div className="w-9 h-9 rounded-xl bg-black border border-white/[0.1] flex items-center justify-center group-hover:border-white/20 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-label="X">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                  </svg>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">Deploy to X</div>
                  <div className="text-[10px] text-white/30 mt-0.5">AI agent on X</div>
                </div>
              </a>
              <a
                href={`https://t.me/share/url?url=https%3A%2F%2Fsubframe.eth.limo%2F${subdomain.name}&text=Check+out+${subdomain.ensFullName}+on+Subframe+Protocol`}
                target="_blank" rel="noopener noreferrer"
                className="group relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border border-white/[0.07] bg-[#0e0e0e] hover:border-[#229ED9]/30 hover:bg-[#229ED9]/[0.04] transition-all duration-200 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#229ED9]/15 to-transparent" />
                <span className="absolute top-2 right-2 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/30">Soon</span>
                <div className="w-9 h-9 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/20 flex items-center justify-center group-hover:border-[#229ED9]/40 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#229ED9]" aria-label="Telegram">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">Deploy to Telegram</div>
                  <div className="text-[10px] text-white/30 mt-0.5">AI agent on Telegram</div>
                </div>
              </a>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 flex items-center justify-center border-t border-white/[0.04] mt-4">
        <a href="https://subframe.network" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-white/20 hover:text-[#CBFF4D]/50 transition-colors group">
          <Zap className="w-3 h-3 text-[#CBFF4D]/30 group-hover:text-[#CBFF4D]/60 transition-colors" />
          Built on Subframe
        </a>
      </footer>
    </div>
  );
}
