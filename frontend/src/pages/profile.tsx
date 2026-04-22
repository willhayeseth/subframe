import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useAccount, useEnsName } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Brain, Bot, User, Send,
  ExternalLink, Copy, CheckCircle, Tag, Lightbulb, Zap,
  Terminal, Globe, Hash, ArrowUpRight
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

type SubdomainWithTx = Subdomain & {
  ensTx1Hash?: string | null;
  ensTx2Hash?: string | null;
  ensTx3Hash?: string | null;
  ensTx4Hash?: string | null;
};

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

function buildSteps(subdomain: SubdomainWithTx): RegStep[] {
  const st = subdomain.status;
  const isActive = st === "active" || st === "linked";
  const isLinked = st === "linked";
  const tx1 = subdomain.ensTx1Hash;
  const tx2 = subdomain.ensTx2Hash;
  const tx3 = subdomain.ensTx3Hash;
  const tx4 = subdomain.ensTx4Hash;

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

function RegistrationLog({ subdomain }: { subdomain: SubdomainWithTx }) {
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

/* ─── ai chat ───────────────────────────────────────────── */

function AiChat({ address, walletData, analysis }: { address: string; walletData?: WalletData; analysis?: WalletAnalysis }) {
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const createConv = useCreateOpenaiConversation();
  const { data: messages } = useListOpenaiMessages(convId ?? 0, {
    query: { enabled: !!convId, queryKey: getListOpenaiMessagesQueryKey(convId ?? 0), refetchInterval: false },
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamContent]);

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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
        <div ref={endRef} />
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

  const { data: subdomainRaw, isLoading: subLoading } = useGetSubdomainByName(name, {
    query: {
      enabled: !!name,
      queryKey: getGetSubdomainByNameQueryKey(name),
      refetchInterval: (query) => {
        const data = query.state.data as SubdomainWithTx | undefined;
        return data?.status !== "linked" ? 5000 : false;
      },
    },
  });
  const subdomain = subdomainRaw as SubdomainWithTx | undefined;

  const { data: allSubdomains } = useListSubdomains();

  const { data: walletData, isLoading: walletLoading } = useGetWalletData(
    subdomain?.walletAddress ?? "",
    { query: { enabled: !!subdomain?.walletAddress, queryKey: getGetWalletDataQueryKey(subdomain?.walletAddress ?? "") } }
  );

  const { data: analysis, isLoading: analysisLoading } = useAnalyzeWallet(
    subdomain?.walletAddress ?? "",
    { query: { enabled: !!walletData, queryKey: getAnalyzeWalletQueryKey(subdomain?.walletAddress ?? "") } }
  );

  const { address: connectedAddress } = useAccount();
  const [, setLocation] = useLocation();

  const isOwnProfile = !!(
    connectedAddress &&
    subdomain?.walletAddress &&
    connectedAddress.toLowerCase() === subdomain.walletAddress.toLowerCase()
  );

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

  // Hide the registration log once everything is completed (all 4 TXs confirmed by backend)
  const sub = subdomain as SubdomainWithTx | undefined;
  const allBackendStepsDone = !!(
    sub?.ensTx1Hash && sub?.ensTx2Hash && sub?.ensTx3Hash && sub?.ensTx4Hash
    && sub?.status === "linked"
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
              className="shrink-0 h-[260px]"
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
                className="flex-1 min-h-0 flex flex-col"
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

  const { data: subdomainRaw, isLoading: subLoading } = useGetSubdomainByName(name, {
    query: {
      enabled: !!name,
      queryKey: getGetSubdomainByNameQueryKey(name),
      refetchInterval: (query) => {
        const data = query.state.data as SubdomainWithTx | undefined;
        return data?.status !== "linked" ? 5000 : false;
      },
    },
  });
  const subdomain = subdomainRaw as SubdomainWithTx | undefined;

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
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-5">

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
                  <h1 className="text-2xl font-black font-mono text-white break-all">
                    {subdomain.ensFullName}
                  </h1>
                  <StatusBadge status={subdomain.status} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-white/25 truncate">
                    {subdomain.walletAddress.slice(0, 12)}...{subdomain.walletAddress.slice(-8)}
                  </span>
                  <button onClick={copyAddress} className="text-white/20 hover:text-[#CBFF4D] transition-colors shrink-0">
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`https://etherscan.io/address/${subdomain.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/15 hover:text-[#CBFF4D]/60 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              {walletLoading && <Loader2 className="w-4 h-4 animate-spin text-white/30 shrink-0 mt-1" />}
              {walletData && (
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-black font-mono text-white leading-none">{walletData.balanceEth}</div>
                  <div className="text-xs text-[#CBFF4D] font-bold mt-0.5">ETH</div>
                  {walletData.balanceUsd && (
                    <div className="text-xs text-white/25 mt-0.5">${walletData.balanceUsd}</div>
                  )}
                </div>
              )}
            </div>

            {subdomain.bio && (
              <p className="text-sm text-white/50 leading-relaxed mb-4">{subdomain.bio}</p>
            )}

            {subdomain.ipfsCid && subdomain.status === "linked" && (
              <div className="flex flex-wrap gap-3">
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
              </div>
            )}

            {walletData && (
              <div className="mt-4 pt-4 border-t border-white/[0.05] text-xs font-mono text-white/25">
                {(walletData.txCount ?? 0).toLocaleString()} transactions
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        {walletData && walletData.lastTransactions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
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
            transition={{ duration: 0.4, delay: 0.15 }}
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

        {/* AI Chat */}
        {subdomain.walletAddress && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="text-sm font-bold text-white/50 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
              AI Chat
            </h2>
            <AiChat address={subdomain.walletAddress} walletData={walletData} analysis={analysis} />
          </motion.div>
        )}

        {/* Deploy as Bot */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <h2 className="text-sm font-bold text-white/50 mb-3 flex items-center gap-2 uppercase tracking-wider">
            <div className="w-1 h-3 rounded-full bg-[#CBFF4D]/60" />
            Deploy AI Agent
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Deploy to X */}
            <a
              href={`https://twitter.com/intent/tweet?text=Check+out+${subdomain.ensFullName}+on+Subframe+Protocol+%F0%9F%94%97&url=https%3A%2F%2Fsubframe.eth.limo%2F${subdomain.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-white/[0.07] bg-[#0e0e0e] hover:border-white/[0.15] hover:bg-white/[0.03] transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="w-10 h-10 rounded-xl bg-black border border-white/[0.1] flex items-center justify-center group-hover:border-white/20 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-label="X">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">Deploy to X</div>
                <div className="text-xs text-white/30 mt-0.5">Share as AI agent on X</div>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </a>

            {/* Deploy to Telegram */}
            <a
              href={`https://t.me/share/url?url=https%3A%2F%2Fsubframe.eth.limo%2F${subdomain.name}&text=Check+out+${subdomain.ensFullName}+on+Subframe+Protocol`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-white/[0.07] bg-[#0e0e0e] hover:border-[#229ED9]/30 hover:bg-[#229ED9]/[0.04] transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#229ED9]/15 to-transparent" />
              <div className="w-10 h-10 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/20 flex items-center justify-center group-hover:border-[#229ED9]/40 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#229ED9]" aria-label="Telegram">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">Deploy to Telegram</div>
                <div className="text-xs text-white/30 mt-0.5">Share as AI agent on Telegram</div>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#229ED9]/8 to-transparent" />
            </a>
          </div>
        </motion.div>

      </div>

      {/* Footer */}
      <footer className="py-6 flex items-center justify-center">
        <a
          href="https://subframe.eth.limo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-white/20 hover:text-[#CBFF4D]/50 transition-colors group"
        >
          <Zap className="w-3 h-3 text-[#CBFF4D]/30 group-hover:text-[#CBFF4D]/60 transition-colors" />
          Built on Subframe
        </a>
      </footer>
    </div>
  );
}
