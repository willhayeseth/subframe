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
  getBaseUrl,
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

      {analysis.activityType && (
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-white/30" />
          <span className="font-semibold text-white/80">{analysis.activityType}</span>
        </div>
      )}

      {analysis.summary && (
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-sm text-white/60 leading-relaxed mb-4">
          {analysis.summary}
        </div>
      )}

      {analysis.tags && analysis.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {analysis.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-white/10 text-white/40">
              <Tag className="w-3 h-3" />{tag}
            </span>
          ))}
        </div>
      )}

      {analysis.insights && analysis.insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-white/25 uppercase tracking-wider mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-[#CBFF4D]/40" />
            Key Insights
          </div>
          <ul className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <li key={i} className="flex gap-3 text-sm text-white/50">
                <span className="text-[#CBFF4D]/50 font-bold shrink-0 mt-0.5">+</span>
                <span>{insight}</span>
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
  const [streaming, setStreaming] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { mutateAsync: createConv } = useCreateOpenaiConversation();
  const { data: messages } = useListOpenaiMessages(convId ?? "", {
    query: { enabled: !!convId, queryKey: getListOpenaiMessagesQueryKey(convId ?? "") },
  });

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setStreaming(true);

    try {
      let cId = convId;
      if (!cId) {
        const p: string[] = [`You are an expert Web3 on-chain analyst. The user is analyzing wallet: ${address}`];
        if (walletData) { p.push(`Balance: ${walletData.balanceEth} ETH`); p.push(`TXs: ${walletData.txCount}`); if (walletData.ensName) p.push(`ENS: ${walletData.ensName}`); }
        if (analysis) { p.push(`AI Summary: ${analysis.summary}`); p.push(`Activity Type: ${analysis.activityType}`); p.push(`Risk: ${analysis.riskLevel}`); }
        const conv = await createConv({ body: { systemPrompt: p.join(". "), title: `Wallet Analysis: ${address}` } });
        cId = conv.id;
        setConvId(cId);
      }

      const res = await fetch(`${getBaseUrl()}/api/openai/conversations/${cId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg }),
      });

      if (!res.ok || !res.body) { setStreaming(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) decoder.decode(value);
        await queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(cId) });
      }
    } finally {
      setStreaming(false);
      await queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(convId ?? "") });
    }
  };

  return (
    <div className="relative rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden flex flex-col" style={{ height: 400 }}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-[#CBFF4D]" />
        </div>
        <span className="font-bold text-white text-sm">AI Web3 Assistant</span>
      </div>

      <div ref={msgsRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {(!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-8 h-8 text-white/10 mb-2" />
            <p className="text-sm text-white/25">Ask anything about this wallet</p>
          </div>
        )}
        {messages?.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-[#CBFF4D]" />
              </div>
            )}
            <div className={`max-w-[80%] text-sm px-3.5 py-2.5 rounded-xl leading-relaxed ${msg.role === "user" ? "bg-white/8 text-white/80 rounded-br-sm" : "bg-[#CBFF4D]/8 text-white/70 border border-[#CBFF4D]/10 rounded-bl-sm"}`}>
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-white/40" />
              </div>
            )}
          </div>
        ))}
        {streaming && (
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-[#CBFF4D]" />
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#CBFF4D]/8 border border-[#CBFF4D]/10">
              <Loader2 className="w-4 h-4 text-[#CBFF4D]/60 animate-spin" />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-white/5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask about this wallet..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/8 bg-white/[0.04] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#CBFF4D]/30 transition-all"
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

  const analyzeAddress = walletData?.address ?? address;
  const { data: analysis, isLoading: analysisLoading } = useAnalyzeWallet(analyzeAddress, {
    query: { enabled: !!walletData && analyzeAddress.length > 5, queryKey: getAnalyzeWalletQueryKey(analyzeAddress) },
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

  const hasResult = !!walletData || !!walletError || walletLoading;

  return (
    <div className="flex-1 px-5 py-10 bg-[#0C0C0C] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className={`grid gap-10 transition-all duration-500 ${hasResult ? "lg:grid-cols-[380px_1fr]" : "grid-cols-1 max-w-2xl mx-auto"}`}>

          {/* Left column: header + search */}
          <div className={`${hasResult ? "lg:sticky lg:top-8 lg:self-start" : ""}`}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#CBFF4D]/30 bg-[#CBFF4D]/8 text-[#CBFF4D] text-xs font-black uppercase tracking-widest mb-5">
                <Brain className="w-3.5 h-3.5" />
                AI Powered
              </div>
              <h1 className="text-4xl font-black text-white leading-tight">
                Wallet <span className="text-[#CBFF4D]">Analyzer</span>
              </h1>
              <p className="mt-2 text-white/40 text-sm">
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
                className="flex items-center gap-2 px-5 py-3.5 btn-lime rounded-xl text-sm font-bold text-black shrink-0"
              >
                <Search className="w-4 h-4" />
                Analyze
              </button>
            </div>

            <div className="flex items-center gap-3">
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

            {!hasResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10">
                <div className="grid grid-cols-3 gap-3">
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

          {/* Right column: results */}
          {hasResult && (
            <div className="space-y-5">
              {(walletLoading || analysisLoading) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-white/35 py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#CBFF4D]/60" />
                  <span className="text-sm">{walletLoading ? "Fetching on-chain data..." : "Running AI analysis..."}</span>
                </motion.div>
              )}

              {walletError && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
                  {(walletError as { response?: { data?: { error?: string } } }).response?.data?.error
                    ?? "Could not fetch wallet data. Check that the address or ENS name is valid."}
                </div>
              )}

              {walletData && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <WalletCard data={walletData} />
                  {analysis && <AnalysisCard analysis={analysis} />}
                  {!analysisLoading && <AiChat address={analyzeAddress} walletData={walletData} analysis={analysis} />}
                </motion.div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
