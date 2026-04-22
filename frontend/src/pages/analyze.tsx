import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Search, Loader2, Brain, Shield, Tag, Lightbulb, Send, Bot, User, Zap, Sparkles, Wallet } from "lucide-react";
import {
  useGetWalletData,
  useAnalyzeWallet,
  useCreateOpenaiConversation,
  useListOpenaiMessages,
  getGetWalletDataQueryKey,
  getAnalyzeWalletQueryKey,
  getListOpenaiMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { WalletAnalysis, WalletData } from "@workspace/api-client-react";

function WalletCard({ data }: { data: WalletData }) {
  const short = (a: string) => `${a.slice(0, 8)}...${a.slice(-6)}`;
  return (
    <div className="relative p-6 rounded-2xl border border-white/8 bg-white/[0.025] overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/20 to-transparent" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-white/30 mb-1">{short(data.address)}</div>
          {data.ensName && (
            <div className="font-mono font-bold text-[#CBFF4D] text-lg">{data.ensName}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-black font-mono text-white">{data.balanceEth} <span className="text-[#CBFF4D]">ETH</span></div>
          {data.balanceUsd && <div className="text-sm text-white/35 mt-0.5">${data.balanceUsd} USD</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/6">
          <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Total TXs</div>
          <div className="font-mono font-bold text-white">{(data.txCount ?? 0).toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/6">
          <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Contract</div>
          <div className="font-mono font-bold text-white">{data.isContract ? "Yes" : "No"}</div>
        </div>
      </div>

      {data.lastTransactions.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold text-white/25 uppercase tracking-wider mb-3">Recent Transactions</div>
          <div className="space-y-2">
            {data.lastTransactions.map((tx) => (
              <div key={tx.hash} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
                  <span className="font-mono text-white/30 truncate">{tx.hash.slice(0, 12)}...</span>
                  {tx.method && <span className="text-[#CBFF4D] bg-[#CBFF4D]/10 px-1.5 py-0.5 rounded font-mono shrink-0">{tx.method}</span>}
                </div>
                <span className="font-mono text-white/70 shrink-0 ml-2">{tx.valueEth} ETH</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: WalletAnalysis }) {
  const riskColor = { low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", medium: "text-amber-400 bg-amber-400/10 border-amber-400/20", high: "text-red-400 bg-red-400/10 border-red-400/20" };
  return (
    <div className="relative p-6 rounded-2xl border border-[#CBFF4D]/15 bg-[#CBFF4D]/[0.03] overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/25 to-transparent" />
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-[#CBFF4D]" />
          </div>
          <span className="font-bold text-white">AI Analysis</span>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border font-mono ${riskColor[analysis.riskLevel as keyof typeof riskColor] ?? riskColor.low}`}>
          Risk: {analysis.riskLevel}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm font-medium text-white/80">
        <Shield className="w-4 h-4 text-[#CBFF4D]/70" />
        {analysis.activityType}
      </div>

      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/6 mb-4">
        <p className="text-sm text-white/65 leading-relaxed">{analysis.summary}</p>
      </div>

      {analysis.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {analysis.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#CBFF4D]/8 border border-[#CBFF4D]/15 text-xs text-[#CBFF4D]/80">
              <Tag className="w-3 h-3" /> {tag}
            </span>
          ))}
        </div>
      )}

      {analysis.insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Key Insights
          </div>
          <ul className="space-y-2">
            {analysis.insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                <span className="text-[#CBFF4D] mt-0.5 shrink-0">+</span>
                {ins}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AiChat({ address, walletData, analysis }: { address: string; walletData?: WalletData; analysis?: WalletAnalysis }) {
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const createConv = useCreateOpenaiConversation();
  const { data: messages } = useListOpenaiMessages(convId ?? 0, {
    query: { enabled: !!convId, queryKey: getListOpenaiMessagesQueryKey(convId ?? 0), refetchInterval: false },
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamContent]);

  const getCtx = () => {
    const p = [`Wallet: ${address}`];
    if (walletData) { p.push(`Balance: ${walletData.balanceEth} ETH`); p.push(`TXs: ${walletData.txCount}`); if (walletData.ensName) p.push(`ENS: ${walletData.ensName}`); }
    if (analysis) { p.push(`Activity: ${analysis.activityType}`); p.push(`Risk: ${analysis.riskLevel}`); p.push(`Summary: ${analysis.summary}`); }
    return p.join("\n");
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const content = input; setInput("");
    let cId = convId;
    if (!cId) {
      const conv = await new Promise<typeof createConv.data>((resolve) => {
        createConv.mutate({ data: { title: `Wallet: ${address.slice(0, 10)}...` } }, { onSuccess: resolve });
      });
      if (!conv) return;
      cId = conv.id; setConvId(cId);
    }
    await qc.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(cId) });
    setStreaming(true); setStreamContent("");
    try {
      const res = await fetch(`/api/openai/conversations/${cId}/messages`, {
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
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const j = JSON.parse(part.slice(6));
            if (j.done) { setStreamContent(""); await qc.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(cId!) }); }
            else if (j.content) { full += j.content; setStreamContent(full); }
          } catch {}
        }
      }
    } finally { setStreaming(false); }
  };

  const allMsgs = messages ?? [];

  return (
    <div className="flex flex-col rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden" style={{ height: "420px" }}>
      <div className="px-5 py-3.5 border-b border-white/6 flex items-center gap-2.5 bg-white/[0.02]">
        <div className="w-7 h-7 rounded-lg bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center">
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
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Sparkles className="w-8 h-8 text-[#CBFF4D]/20" />
            <p className="text-sm text-white/25">Ask me anything about this wallet...</p>
          </div>
        )}
        {allMsgs.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-[#CBFF4D]/15" : "bg-white/5"}`}>
              {msg.role === "user" ? <User className="w-3 h-3 text-[#CBFF4D]" /> : <Bot className="w-3 h-3 text-white/50" />}
            </div>
            <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-[#CBFF4D]/10 text-white/90 border border-[#CBFF4D]/15 rounded-tr-sm" : "bg-white/[0.04] text-white/65 border border-white/6 rounded-tl-sm"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {streaming && streamContent && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3 h-3 text-white/50" />
            </div>
            <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm bg-white/[0.04] text-white/65 border border-white/6">
              {streamContent}<span className="inline-block w-0.5 h-4 bg-[#CBFF4D] ml-0.5 animate-pulse" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-white/6 flex gap-2">
        <input
          data-testid="input-chat-message"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about this wallet..."
          disabled={streaming}
          className="flex-1 px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.04] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#CBFF4D]/35 focus:ring-1 focus:ring-[#CBFF4D]/15 disabled:opacity-50 transition-all"
        />
        <button
          data-testid="btn-send-chat"
          onClick={sendMessage}
          disabled={!input.trim() || streaming}
          className="p-2.5 rounded-xl btn-lime text-black disabled:opacity-40 transition-all"
        >
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function Analyze() {
  const [rawInput, setRawInput] = useState("");
  const [address, setAddress] = useState("");

  const { open } = useAppKit();
  const { address: connectedAddress, isConnected } = useAppKitAccount();

  const { data: walletData, isLoading: walletLoading, error: walletError } = useGetWalletData(address, {
    query: { enabled: address.length > 5, queryKey: getGetWalletDataQueryKey(address) },
  });

  const { data: analysis, isLoading: analysisLoading } = useAnalyzeWallet(address, {
    query: { enabled: !!walletData, queryKey: getAnalyzeWalletQueryKey(address) },
  });

  const handleSearch = () => { if (rawInput.trim()) setAddress(rawInput.trim()); };

  const handleUseMyWallet = () => {
    if (connectedAddress) {
      setRawInput(connectedAddress);
      setAddress(connectedAddress);
    } else {
      open();
    }
  };

  return (
    <div className="flex-1 px-5 py-16 bg-[#0C0C0C]">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#CBFF4D]/30 bg-[#CBFF4D]/8 text-[#CBFF4D] text-xs font-black uppercase tracking-widest mb-5">
            <Brain className="w-3.5 h-3.5" />
            AI Powered
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Wallet <span className="text-[#CBFF4D]">Analyzer</span>
          </h1>
          <p className="mt-3 text-white/45">
            Deep AI analysis of any Ethereum address or ENS name
          </p>
        </motion.div>

        <div className="flex gap-2 mb-3">
          <input
            data-testid="input-wallet-search"
            type="text"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="0x... or name.eth"
            className="flex-1 px-4 py-3.5 rounded-xl border border-white/8 bg-white/[0.04] text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-[#CBFF4D]/40 focus:ring-1 focus:ring-[#CBFF4D]/15 text-sm transition-all"
          />
          <button
            data-testid="btn-analyze"
            onClick={handleSearch}
            className="flex items-center gap-2 px-6 py-3.5 btn-lime rounded-xl text-sm font-bold text-black shrink-0"
          >
            <Search className="w-4 h-4" />
            Analyze
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleUseMyWallet}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:border-white/20 text-xs font-semibold transition-all"
          >
            <Wallet className="w-3.5 h-3.5" />
            {isConnected && connectedAddress
              ? `Use ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
              : "Connect Wallet to Analyze Mine"}
          </button>
          {isConnected && connectedAddress && (
            <button
              onClick={() => open({ view: "Account" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[#CBFF4D]/50 hover:text-[#CBFF4D] transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D] animate-pulse" />
              Connected
            </button>
          )}
        </div>

        {(walletLoading || analysisLoading) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-white/35 py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[#CBFF4D]/60" />
            <span className="text-sm">{walletLoading ? "Fetching on-chain data..." : "Running AI analysis..."}</span>
          </motion.div>
        )}

        {walletError && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
            Could not fetch wallet data. Check that the address is valid.
          </div>
        )}

        {walletData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <WalletCard data={walletData} />
            {analysis && <AnalysisCard analysis={analysis} />}
            {!analysisLoading && <AiChat address={address} walletData={walletData} analysis={analysis} />}
          </motion.div>
        )}

        {!address && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full bg-[#CBFF4D]/5 animate-pulse-glow" />
              <div className="w-24 h-24 rounded-full bg-[#CBFF4D]/[0.04] border border-[#CBFF4D]/12 flex items-center justify-center">
                <Brain className="w-12 h-12 text-[#CBFF4D]/20" />
              </div>
            </div>
            <p className="text-lg font-bold text-white/50">Enter a wallet to start</p>
            <p className="text-sm text-white/25 mt-1">Supports 0x addresses and ENS names</p>

            <div className="mt-8 grid grid-cols-3 gap-3 max-w-sm w-full">
              {[
                { icon: Brain, label: "AI Summary" },
                { icon: Shield, label: "Risk Score" },
                { icon: Zap, label: "AI Chat" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                  <Icon className="w-5 h-5 text-[#CBFF4D]/30" />
                  <span className="text-xs text-white/25">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
