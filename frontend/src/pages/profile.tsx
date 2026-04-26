import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ipfsImg } from "@/lib/ipfs-url";
import { useParams, Link, useLocation } from "wouter";
import { useAccount, useEnsName, useReadContract } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Brain, Bot, User, Send,
  ExternalLink, Copy, CheckCircle, Tag, Lightbulb, Zap,
  Terminal, Globe, Hash, ArrowUpRight, MessageSquare, Repeat2, X, ChevronRight,
  Coins, AlertCircle, Activity
} from "lucide-react";
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
        : "Art Token deploying on Uniswap V4",
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

const ERC404_ABI = [
  { name: "balanceOf",        type: "function", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "nftBalanceOf",     type: "function", inputs: [{ name: "owner",   type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "totalSupply",      type: "function", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "artIndexOfOwner",  type: "function", inputs: [{ name: "owner",   type: "address" }], outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view" },
  { name: "nextTokenId",      type: "function", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "baseURI",          type: "function", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
] as const;

/** Convert an ipfs:// URI to an IPFS gateway URL */
function ipfsToGateway(uri: string | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    return "https://ipfs.io/ipfs/" + uri.slice(7);
  }
  if (uri.startsWith("https://")) return uri;
  return null;
}

/**
 * Tries to display the actual art image for a given variation index.
 * Falls back to a deterministic gradient tile if IPFS content isn't reachable.
 */
function ArtVariationImage({
  artIndex,
  baseURI: rawBase,
  subdomainName,
}: {
  artIndex: number;
  baseURI: string | undefined;
  subdomainName: string;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
    const gatewayBase = ipfsToGateway(rawBase);
    if (!gatewayBase) { setImgSrc(null); return; }
    // Try metadata JSON first to get image URL
    const metaUrl = `${gatewayBase}${artIndex}.json`;
    let cancelled = false;
    fetch(metaUrl, { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then((data: { image?: string }) => {
        if (cancelled) return;
        const img = data.image ? ipfsToGateway(data.image) ?? data.image : null;
        setImgSrc(img ?? `${gatewayBase}${artIndex}.png`);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to direct .png URL
        setImgSrc(`${gatewayBase}${artIndex}.png`);
      });
    return () => { cancelled = true; };
  }, [rawBase, artIndex]);

  const hue  = Math.round((artIndex * 360) / 69);
  const hue2 = (hue + 40) % 360;
  const gradient = `linear-gradient(135deg, hsl(${hue},70%,20%) 0%, hsl(${hue2},80%,35%) 100%)`;

  return (
    <div
      className="relative rounded-lg overflow-hidden aspect-square flex flex-col items-end justify-end p-1.5"
      style={{ background: gradient }}
    >
      {imgSrc && !imgError && (
        <img
          src={imgSrc}
          alt={`${subdomainName} #${artIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover rounded-lg"
          onError={() => setImgError(true)}
        />
      )}
      <span className="relative z-10 font-mono text-[10px] font-bold text-white/90 bg-black/40 rounded px-1 py-0.5 leading-none">
        #{artIndex + 1}
      </span>
    </div>
  );
}

/**
 * ERC404Card — shows on-chain token stats and NFT holdings for a deployed ERC-404 token.
 * Trading is done externally via Uniswap V4.
 */
function ERC404Card({
  contractAddress,
  tokenSymbol,
  subdomainName,
  uniswapUrl,
}: {
  contractAddress: string;
  tokenSymbol?: string | null;
  subdomainName: string;
  uniswapUrl: string | null;
}) {
  const { address: userAddress } = useAccount();
  const addr = contractAddress as `0x${string}`;

  const { data: nextTokenIdRaw } = useReadContract({ address: addr, abi: ERC404_ABI, functionName: "nextTokenId" });
  const { data: rawBaseURI }     = useReadContract({ address: addr, abi: ERC404_ABI, functionName: "baseURI" });
  const { data: userBalanceRaw } = useReadContract({
    address: addr, abi: ERC404_ABI, functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });
  const { data: userArtIndices } = useReadContract({
    address: addr, abi: ERC404_ABI, functionName: "artIndexOfOwner",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const nftsMinted      = Number(nextTokenIdRaw ?? 0n);
  const userTokens      = userBalanceRaw ?? 0n;
  const userWholeTokens = Number(userTokens / 10n ** 18n);
  const userFraction    = userTokens % (10n ** 18n);
  const artIndices      = (userArtIndices as bigint[] | undefined) ?? [];

  function fmtTokenBalance(bal: bigint): string {
    const whole = Number(bal / 10n ** 18n);
    const frac  = Number((bal % (10n ** 18n)) * 10000n / 10n ** 18n);
    if (frac === 0) return `${whole}`;
    return `${whole}.${frac.toString().padStart(4, "0").replace(/0+$/, "")}`;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-lg font-black text-[#CBFF4D]">
            {fmtTokenBalance(userTokens)} <span className="text-sm font-bold text-white/50">${tokenSymbol ?? "..."}</span>
          </div>
          <div className="text-[10px] text-white/25 font-mono">your balance</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-white/60">{nftsMinted}</div>
          <div className="text-[10px] text-white/25 font-mono">NFTs minted</div>
        </div>
      </div>

      {userWholeTokens > 0 && artIndices.length > 0 && (
        <div className="rounded-lg bg-[#CBFF4D]/5 border border-[#CBFF4D]/10 px-3 py-2">
          <div className="text-[10px] text-[#CBFF4D]/50 font-mono uppercase tracking-widest mb-2">Your NFTs</div>
          <div className="grid grid-cols-3 gap-2">
            {artIndices.map((idx, i) => (
              <ArtVariationImage
                key={i}
                artIndex={Number(idx)}
                baseURI={rawBaseURI as string | undefined}
                subdomainName={subdomainName}
              />
            ))}
          </div>
        </div>
      )}

      {userWholeTokens === 0 && userTokens > 0n && (
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-center">
          <span className="text-xs font-mono text-white/30">
            Hold 1 full token to receive an NFT
            {userFraction > 0n && ` (${fmtTokenBalance(userFraction)} more needed)`}
          </span>
        </div>
      )}

      {uniswapUrl ? (
        <a
          href={uniswapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#CBFF4D] text-[#0C0C0C] text-sm font-bold hover:bg-[#CBFF4D]/90 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
          Trade on Uniswap V4
        </a>
      ) : (
        <div className="flex items-center justify-center w-full py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-white/25 text-sm font-mono">
          Pool seeding in progress...
        </div>
      )}

      {!userAddress && (
        <p className="text-center text-xs text-white/25 font-mono">Connect wallet to view your balance</p>
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

  if (ts === "none") {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-[#080808] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
          <Coins className="w-3.5 h-3.5 text-white/20" />
          <span className="text-xs font-mono text-white/20 uppercase tracking-wider">Art Collection</span>
          <div className="ml-auto flex items-center gap-1.5 font-mono text-xs text-white/20">
            <span>coming soon</span>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-white/20 font-mono">
            An ERC-404 art token will be deployed for this subdomain automatically.
          </p>
        </div>
      </div>
    );
  }

  if (ts === "failed") {
    return (
      <div className="rounded-xl border border-red-500/10 bg-[#080808] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
          <Coins className="w-3.5 h-3.5 text-red-400/40" />
          <span className="text-xs font-mono text-white/20 uppercase tracking-wider">Art Collection</span>
          <div className="ml-auto flex items-center gap-1.5 font-mono text-xs text-red-400/50">
            <AlertCircle className="w-3 h-3" />
            <span>deployment failed</span>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-white/20 font-mono">
            Token deployment encountered an error. The platform will retry automatically.
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
        <span className="text-xs font-mono text-white/30 uppercase tracking-wider">Art Collection</span>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-xs">
          {ts === "deployed" ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D]" />
              <span className="text-[#CBFF4D]/70">live on Uniswap V4</span>
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
            Creating ERC-404 token on Uniswap V4...
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

            {subdomain.tokenAddress && (
              <ERC404Card
                contractAddress={subdomain.tokenAddress}
                tokenSymbol={subdomain.tokenSymbol}
                subdomainName={subdomain.name}
                uniswapUrl={`https://app.uniswap.org/swap?chain=mainnet&outputCurrency=${subdomain.tokenAddress}`}
              />
            )}

            {subdomain.tokenAddress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <div>
                    <div className="text-[10px] text-white/25 uppercase tracking-widest font-mono mb-0.5">Contract</div>
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

interface ArtVariationItem {
  id: number;
  variationIndex: number;
  style: string;
  variation: string;
  imageUrl: string | null;
}

function ArtTokenGallery({ subdomainName, tokenAddress, tokenStatus, isOwnProfile }: { subdomainName: string; tokenAddress?: string | null; tokenStatus?: string | null; isOwnProfile: boolean }) {
  const [variations, setVariations] = useState<ArtVariationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [genProgress, setGenProgress] = useState(0);
  const [genTotal, setGenTotal] = useState(69);
  const [selected, setSelected] = useState<ArtVariationItem | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const didAutoStart = useRef(false);

  const apiBase = getBaseUrl() || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "");

  const fetchVariations = async () => {
    try {
      const res = await fetch(`${apiBase}/api/art/${subdomainName}`);
      if (!res.ok) return;
      const data = await res.json();
      setVariations(data.variations || []);
      return data as { variations: ArtVariationItem[]; complete: boolean };
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  };

  const startGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setGenStatus("Analyzing profile image...");
    setGenProgress(0);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await fetch(`${apiBase}/api/art/${subdomainName}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "status" || event.type === "analyzed") {
              setGenStatus(event.message ?? "Generating art...");
            } else if (event.type === "started") {
              setGenTotal(event.total);
              setGenStatus("Generating art variations...");
            } else if (event.type === "image") {
              setGenProgress(event.index);
              if (event.imageUrl) {
                setVariations(prev => [...prev, {
                  id: Date.now() + event.index,
                  variationIndex: event.categoryIndex * 10 + event.variationIndex,
                  style: event.style,
                  variation: event.variation,
                  imageUrl: event.imageUrl,
                }]);
              }
            } else if (event.type === "complete" || event.type === "already_done") {
              await fetchVariations();
            } else if (event.type === "error") {
              setGenStatus(`Error: ${event.message}`);
            }
          } catch { }
        }
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) setGenStatus("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    fetchVariations().then((data) => {
      if (isOwnProfile && !didAutoStart.current && data && !data.complete && data.variations.length === 0) {
        didAutoStart.current = true;
        startGenerate();
        return;
      }
      if (data && !data.complete) {
        pollRef.current = setInterval(async () => {
          const fresh = await fetchVariations();
          if (fresh?.complete) stopPolling();
        }, 8000);
      }
    });
    return () => stopPolling();
  }, [subdomainName]);

  const uniswapUrl = tokenAddress
    ? `https://app.uniswap.org/swap?chain=mainnet&outputCurrency=${tokenAddress}`
    : null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-[#0e0e0e] p-6 flex items-center gap-2 flex-1 min-h-0">
        <Loader2 className="w-4 h-4 animate-spin text-[#CBFF4D]/50" />
        <span className="text-sm text-white/30 font-mono">Loading art collection...</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0e0e0e] overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between shrink-0">
        <div>
          <div className="text-sm font-bold text-white/80">{subdomainName} Art Collection</div>
          <div className="text-xs text-white/30 font-mono mt-0.5">ERC-404 on Ethereum</div>
        </div>
        <div className="flex items-center gap-2">
          {variations.length > 0 && (
            <span className="text-xs text-white/25 font-mono">{variations.length}/69</span>
          )}
          {uniswapUrl ? (
            <a href={uniswapUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#CBFF4D] text-[#0C0C0C] text-xs font-bold hover:bg-[#CBFF4D]/90 transition-colors">
              <ArrowUpRight className="w-3 h-3" />
              Trade
            </a>
          ) : tokenStatus === "failed" ? (
            <span className="text-xs text-red-400/50 px-2 py-1 rounded-lg border border-red-500/10">Deploy failed</span>
          ) : tokenStatus === "deploying" ? (
            <span className="text-xs text-amber-400/50 px-2 py-1 rounded-lg border border-white/[0.08]">Deploying...</span>
          ) : (
            <span className="text-xs text-white/20 px-2 py-1 rounded-lg border border-white/[0.08]">Token launching soon</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
      {generating && variations.length === 0 ? (
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-[#CBFF4D]" />
            <span className="text-sm text-white/50 font-mono">{genStatus || "Preparing your art collection..."}</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5">
            <div className="bg-[#CBFF4D] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, (genProgress / genTotal) * 100)}%` }} />
          </div>
          <span className="text-xs text-white/20 font-mono">{genProgress} / {genTotal}</span>
        </div>
      ) : variations.length === 0 ? (
        <div className="p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Coins className="w-6 h-6 text-white/20" />
          </div>
          <div className="text-xs text-white/25 font-mono">Art collection generating soon</div>
        </div>
      ) : (
        <>
          {generating && (
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CBFF4D]" />
              <span className="text-xs text-white/40 font-mono flex-1 truncate">{genStatus}</span>
              <span className="text-xs text-white/25 font-mono shrink-0">{genProgress}/{genTotal}</span>
            </div>
          )}
          <div className="p-2.5 grid grid-cols-3 lg:grid-cols-4 gap-1.5">
            {variations.map((v) => (
              <button key={v.id} onClick={() => setSelected(v)}
                className="aspect-square rounded-xl overflow-hidden border border-white/[0.05] hover:border-[#CBFF4D]/30 transition-colors relative group">
                {v.imageUrl ? (
                  <img
                    src={ipfsImg(v.imageUrl)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = v.imageUrl!; }}
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                  <span className="text-[9px] text-white/80 leading-tight font-mono line-clamp-2">{subdomainName} #{(v.variationIndex ?? 0) + 1}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="rounded-2xl bg-[#111] border border-white/[0.08] overflow-hidden max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}>
              {selected.imageUrl && (
                <img
                  src={ipfsImg(selected.imageUrl)}
                  alt={selected.style}
                  className="w-full aspect-square object-cover"
                  onError={(e) => { e.currentTarget.src = selected.imageUrl!; }}
                />
              )}
              <div className="p-4">
                <div className="text-sm font-bold text-white/80 mb-0.5">{subdomainName} #{(selected.variationIndex ?? 0) + 1}</div>
                <div className="text-xs text-white/35 font-mono mb-4">{selected.style}</div>
                <div className="flex gap-2">
                  {uniswapUrl ? (
                    <a href={uniswapUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#CBFF4D] text-[#0C0C0C] text-sm font-bold hover:bg-[#CBFF4D]/90 transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                      Buy on Uniswap
                    </a>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-white/25 text-sm font-mono">
                      Trading coming soon
                    </div>
                  )}
                  <button onClick={() => setSelected(null)}
                    className="p-2.5 rounded-xl border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
                        <img src={ipfsImg(subdomain.avatarUrl)} alt="" className="w-full h-full object-cover" />
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

            {/* Art Token Card — shown for all statuses */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.09 }}
            >
              <ArtTokenCard subdomain={subdomain} />
            </motion.div>

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

            {/* Primary Name CTA — only for own profile, only when not yet set */}
            {showPrimaryNameCta && !primaryNameAlreadySet && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="rounded-xl border border-[#CBFF4D]/20 bg-[#CBFF4D]/[0.03] p-4 flex items-center gap-3"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#CBFF4D]/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#CBFF4D] fill-[#CBFF4D]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-snug">Set as Primary ENS Name</p>
                  <p className="text-xs text-white/25 mt-0.5 leading-snug">
                    Make <span className="font-mono text-[#CBFF4D]/60">{subdomain.ensFullName}</span> appear on Etherscan
                  </p>
                </div>
                <button
                  onClick={() => setLocation(`/onboarding/${subdomain.name}`)}
                  className="shrink-0 px-3 py-1.5 btn-lime rounded-lg text-xs font-bold text-black"
                >
                  Set now
                </button>
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
  const { address: connectedAddress } = useAccount();

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

  const { data: analysis, isLoading: analysisLoading, isError: analysisError } = useAnalyzeWallet(
    subdomain?.walletAddress ?? "",
    {
      query: {
        enabled: !!subdomain?.walletAddress,
        queryKey: getAnalyzeWalletQueryKey(subdomain?.walletAddress ?? ""),
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 30,
        retry: 2,
      }
    }
  );

  const isOwnProfile = !!(
    connectedAddress &&
    subdomain?.walletAddress &&
    connectedAddress.toLowerCase() === subdomain.walletAddress.toLowerCase()
  );

  function copyAddress() {
    if (!subdomain) return;
    navigator.clipboard.writeText(subdomain.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    if (!subdomain) return;

    const title = `${subdomain.ensFullName} | Subframe`;
    const img = subdomain.avatarUrl ?? "https://subframe.network/favicon.png";
    const desc = subdomain.bio
      ? subdomain.bio
      : `On-chain Web3 profile for ${subdomain.ensFullName}. Powered by Subframe Protocol.`;

    document.title = title;

    const setFavicon = (href: string) => {
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((el) => {
        el.href = href;
      });
    };
    setFavicon(img);

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        if (selector.includes("property=")) el.setAttribute("property", selector.match(/property="([^"]+)"/)?.[1] ?? "");
        else el.setAttribute("name", selector.match(/name="([^"]+)"/)?.[1] ?? "");
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:image"]', "content", img);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="twitter:image"]', "content", img);
    setMeta('meta[name="twitter:card"]', "content", "summary");

    return () => {
      document.title = "Subframe Protocol";
      setFavicon("/favicon.png");
      setMeta('meta[property="og:title"]', "content", "Subframe Protocol");
      setMeta('meta[property="og:image"]', "content", "https://subframe.network/favicon.png");
      setMeta('meta[name="twitter:title"]', "content", "Subframe Protocol");
      setMeta('meta[name="twitter:image"]', "content", "https://subframe.network/favicon.png");
    };
  }, [subdomain]);

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

  return <StandaloneProfileLayout
    subdomain={subdomain}
    walletData={walletData}
    walletLoading={walletLoading}
    analysis={analysis}
    analysisLoading={analysisLoading}
    analysisError={analysisError}
    isOwnProfile={isOwnProfile}
    copied={copied}
    copyAddress={copyAddress}
  />;
}

function StandaloneProfileLayout({
  subdomain,
  walletData,
  walletLoading,
  analysis,
  analysisLoading,
  analysisError,
  isOwnProfile,
  copied,
  copyAddress,
}: {
  subdomain: Subdomain;
  walletData?: WalletData;
  walletLoading: boolean;
  analysis?: WalletAnalysis;
  analysisLoading: boolean;
  analysisError: boolean;
  isOwnProfile: boolean;
  copied: boolean;
  copyAddress: () => void;
}) {
  const [rightTab, setRightTab] = useState<"analysis" | "transactions" | "chat">("analysis");
  const [mobileTab, setMobileTab] = useState<"home" | "art" | "analysis" | "chat">("home");

  /* shared sub-components rendered in multiple places */
  const ProfileCard = (
    <div className="relative rounded-2xl border border-white/[0.07] bg-[#0e0e0e] overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/25 to-transparent" />
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-[#CBFF4D]/10 blur-lg" />
            <div className="relative w-16 h-16 rounded-xl bg-[#111] border border-[#CBFF4D]/20 overflow-hidden shadow-[0_0_20px_rgba(203,255,77,0.12)]">
              {subdomain.avatarUrl ? (
                <img src={ipfsImg(subdomain.avatarUrl)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Zap className="w-7 h-7 text-[#CBFF4D] fill-[#CBFF4D]" />
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <a href="https://subframe.network" className="text-xl font-black font-mono text-white break-all hover:text-[#CBFF4D] transition-colors">
                {subdomain.ensFullName}
              </a>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-white/25 truncate">
                {subdomain.walletAddress.slice(0, 10)}...{subdomain.walletAddress.slice(-6)}
              </span>
              <button onClick={copyAddress} className="text-white/20 hover:text-[#CBFF4D] transition-colors shrink-0">
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a href={`https://etherscan.io/address/${subdomain.walletAddress}`} target="_blank" rel="noopener noreferrer" className="text-white/15 hover:text-[#CBFF4D]/60 transition-colors shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {walletData && (
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-lg font-black font-mono text-white leading-none">{walletData.balanceEth}</span>
                <span className="text-xs text-[#CBFF4D] font-bold">ETH</span>
                {walletData.balanceUsd && <span className="text-xs text-white/20">${walletData.balanceUsd}</span>}
              </div>
            )}
            {walletLoading && <Loader2 className="mt-2 w-4 h-4 animate-spin text-white/30" />}
          </div>
        </div>
        {subdomain.bio && <p className="text-sm text-white/50 leading-relaxed mb-4">{subdomain.bio}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=Check+out+${subdomain.ensFullName}+%F0%9F%94%97&url=https%3A%2F%2Fsubframe.eth.limo%2F${subdomain.name}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" aria-label="X">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
            </svg>
            Share
          </a>
          <a href="https://subframe.network" className="inline-flex items-center gap-1 text-xs text-white/20 hover:text-[#CBFF4D]/60 transition-colors">
            <img src="/logo-subframe.png" className="w-3.5 h-3.5 opacity-40 shrink-0" alt="Subframe" />
            Built on Subframe
          </a>
        </div>
      </div>
    </div>
  );

  const AnalysisContent = (
    <div className="relative rounded-2xl border border-white/[0.07] bg-[#0e0e0e] overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/25 to-transparent" />
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-[#CBFF4D]/10 border border-[#CBFF4D]/15 flex items-center justify-center">
          <Brain className="w-3 h-3 text-[#CBFF4D]" />
        </div>
        <span className="text-sm font-bold text-white/70">Wallet Analysis</span>
      </div>
      <div className="p-4 space-y-4">
        {analysisLoading && (
          <div className="flex items-center gap-2.5 text-white/30 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-[#CBFF4D]" />
            <span>Generating AI analysis...</span>
          </div>
        )}
        {analysisError && !analysisLoading && !analysis && (
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs text-white/25 font-mono flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-white/20 animate-spin" />
            Analysis loading. Refresh to retry
          </div>
        )}
        {analysis && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-white/80 text-sm">{analysis.activityType}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-mono ${riskColor[analysis.riskLevel as keyof typeof riskColor] ?? riskColor.low}`}>
                Risk: {analysis.riskLevel}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <p className="text-sm text-white/55 leading-relaxed">{analysis.summary}</p>
            </div>
            {analysis.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
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
        )}
        {!analysisLoading && !analysis && !analysisError && (
          <div className="text-xs text-white/20 font-mono">No analysis available</div>
        )}
      </div>
    </div>
  );

  const TransactionsContent = (
    <div className="relative rounded-2xl border border-white/[0.07] bg-[#0e0e0e] overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/25 to-transparent" />
      {walletLoading && (
        <div className="flex items-center gap-2.5 text-white/30 text-sm p-4">
          <Loader2 className="w-4 h-4 animate-spin text-[#CBFF4D]" />
          <span>Loading transactions...</span>
        </div>
      )}
      {walletData && (
        <>
          <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-3">
            <span className="text-xs font-mono text-white/25 flex-1">{(walletData.txCount ?? 0).toLocaleString()} total transactions</span>
            <a href={`https://etherscan.io/address/${subdomain.walletAddress}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-white/20 hover:text-[#CBFF4D]/60 transition-colors">
              <ExternalLink className="w-3 h-3" />
              Etherscan
            </a>
          </div>
          {walletData.lastTransactions && walletData.lastTransactions.length > 0 ? (
            <div>
              {walletData.lastTransactions.map((tx, i) => (
                <a key={tx.hash} href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors group ${i < walletData.lastTransactions.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-white/35 truncate group-hover:text-white/55 transition-colors">
                        {tx.hash.slice(0, 12)}...{tx.hash.slice(-6)}
                      </div>
                      <div className="text-xs text-white/20 mt-0.5">
                        {tx.from.slice(0, 8)}... to {tx.to ? `${tx.to.slice(0, 8)}...` : "Contract"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {tx.method && (
                      <span className="text-xs bg-[#CBFF4D]/8 text-[#CBFF4D]/60 px-2 py-0.5 rounded font-mono border border-[#CBFF4D]/10">
                        {tx.method}
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-white whitespace-nowrap">
                      {tx.valueEth} <span className="text-[#CBFF4D]">ETH</span>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="px-4 py-4 text-xs text-white/20 font-mono">No recent transactions</div>
          )}
        </>
      )}
    </div>
  );

  const bgStyle = subdomain.avatarUrl ? {
    backgroundImage: `url(${subdomain.avatarUrl})`,
    backgroundSize: "cover" as const,
    backgroundPosition: "center" as const,
    backgroundAttachment: "fixed" as const,
  } : { backgroundColor: "#0C0C0C" };

  return (
    <div className="h-screen overflow-hidden flex flex-col relative" style={bgStyle}>
      {subdomain.avatarUrl && (
        <div className="absolute inset-0 bg-[#0C0C0C]/82 backdrop-blur-[3px] z-0" />
      )}

      {/* Top bar */}
      <header className="relative z-20 shrink-0 border-b border-white/[0.07] bg-black/85 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <a href="https://subframe.network" className="inline-flex items-center gap-2 text-sm text-white/30 hover:text-[#CBFF4D]/60 transition-colors">
            <img src="/logo-subframe.png" className="w-6 h-6 opacity-60" alt="Subframe" />
            <span className="font-mono">subframe.eth</span>
          </a>
          <span className="font-mono text-sm text-white/20 truncate ml-4">{subdomain.ensFullName}</span>
        </div>
      </header>

      {/* ═══ DESKTOP LAYOUT (lg+): 2 columns, both fixed height ═══ */}
      <div className="relative z-10 hidden lg:flex flex-1 min-h-0 gap-0">

        {/* Left 60%: Profile fixed, Art fills remaining and scrolls inside */}
        <div className="w-[60%] shrink-0 flex flex-col px-6 py-5 gap-5 min-h-0">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="shrink-0">
            {ProfileCard}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="flex-1 min-h-0 flex flex-col">
            <h2 className="text-xs font-bold text-white/30 mb-3 flex items-center gap-2 uppercase tracking-widest shrink-0">
              <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
              Art Collection
            </h2>
            <ArtTokenGallery subdomainName={subdomain.name} tokenAddress={subdomain.tokenAddress} tokenStatus={subdomain.tokenStatus} isOwnProfile={isOwnProfile} />
          </motion.div>
        </div>

        {/* Right 40%: 3-tab card — fixed, tab content scrolls */}
        <div className="w-[40%] shrink-0 flex flex-col py-5 pr-6 min-h-0">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col flex-1 min-h-0 rounded-2xl border border-white/[0.07] bg-[#0e0e0e] overflow-hidden"
          >
            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-white/[0.06] bg-[#080808]">
              {(["analysis", "transactions", "chat"] as const).map((tab) => {
                const labels: Record<string, string> = { analysis: "Wallet Analysis", transactions: "Transactions", chat: "AI Chat" };
                const icons: Record<string, React.ReactElement> = {
                  analysis: <Brain className="w-3.5 h-3.5" />,
                  transactions: <Activity className="w-3.5 h-3.5" />,
                  chat: <Bot className="w-3.5 h-3.5" />,
                };
                return (
                  <button key={tab} onClick={() => setRightTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                      rightTab === tab ? "border-[#CBFF4D] text-[#CBFF4D]" : "border-transparent text-white/30 hover:text-white/60"
                    }`}>
                    {icons[tab]}
                    <span>{labels[tab]}</span>
                  </button>
                );
              })}
            </div>
            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {rightTab === "analysis" && <div className="h-full overflow-y-auto p-5">{AnalysisContent}</div>}
              {rightTab === "transactions" && <div className="h-full overflow-y-auto p-5">{TransactionsContent}</div>}
              {rightTab === "chat" && (
                <div className="h-full overflow-hidden flex flex-col">
                  {subdomain.walletAddress
                    ? <AiChat address={subdomain.walletAddress} walletData={walletData} analysis={analysis} />
                    : <div className="p-5 text-xs text-white/20 font-mono">No wallet connected</div>}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ MOBILE LAYOUT (<lg): single column + bottom nav ═══ */}
      <div className="relative z-10 flex lg:hidden flex-col flex-1 min-h-0">
        {/* scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Home tab: profile card + transactions below */}
          {mobileTab === "home" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
              {ProfileCard}
              <div>
                <h2 className="text-xs font-bold text-white/30 mb-3 flex items-center gap-2 uppercase tracking-widest">
                  <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
                  Transactions
                </h2>
                {TransactionsContent}
              </div>
            </motion.div>
          )}

          {/* Art tab */}
          {mobileTab === "art" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-xs font-bold text-white/30 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
                Art Collection
              </h2>
              <ArtTokenGallery subdomainName={subdomain.name} tokenAddress={subdomain.tokenAddress} tokenStatus={subdomain.tokenStatus} isOwnProfile={isOwnProfile} />
            </motion.div>
          )}

          {/* Analysis tab */}
          {mobileTab === "analysis" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <h2 className="text-xs font-bold text-white/30 mb-3 flex items-center gap-2 uppercase tracking-widest">
                <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
                Wallet Analysis
              </h2>
              {AnalysisContent}
            </motion.div>
          )}

          {/* Chat tab: fills remaining height */}
          {mobileTab === "chat" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <AiChat address={subdomain.walletAddress} walletData={walletData} analysis={analysis} />
            </motion.div>
          )}

        </div>

        {/* Bottom nav bar — part of flex flow, always at bottom */}
        <nav className="shrink-0 flex border-t border-white/[0.08] bg-black/90 backdrop-blur-xl safe-bottom">
          {(([
            { id: "home", label: "Home", icon: <User className="w-5 h-5" /> },
            { id: "art", label: "Art", icon: <Coins className="w-5 h-5" /> },
            { id: "analysis", label: "Analysis", icon: <Brain className="w-5 h-5" /> },
            { id: "chat", label: "AI Chat", icon: <Bot className="w-5 h-5" /> },
          ]) as Array<{ id: "home"|"art"|"analysis"|"chat"; label: string; icon: React.ReactElement }>).map((item) => (
            <button key={item.id} onClick={() => setMobileTab(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-all ${
                mobileTab === item.id ? "text-[#CBFF4D]" : "text-white/25 hover:text-white/50"
              }`}>
              {mobileTab === item.id && <div className="absolute top-0 w-8 h-0.5 bg-[#CBFF4D] rounded-full" />}
              {item.icon}
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

    </div>
  );
}

