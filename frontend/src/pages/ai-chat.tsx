import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowUpRight, MessageSquare, Sparkles, Bot, Zap, ChevronRight, Search } from "lucide-react";
import analyzePng from "/3d-analyze.webp";

const features = [
  {
    icon: Bot,
    title: "Full Wallet Context",
    desc: "The AI assistant has read your entire on-chain history before you send a single message. It knows your balance, activity type, risk level, and recent transactions.",
  },
  {
    icon: MessageSquare,
    title: "Natural Language Queries",
    desc: "Ask anything in plain English. No commands, no syntax. Just type your question and the AI finds the answer from your on-chain data.",
  },
  {
    icon: Sparkles,
    title: "Streaming Responses",
    desc: "Answers stream in real time, word by word, like talking to an expert who thinks out loud. No waiting for a full response to load.",
  },
  {
    icon: Search,
    title: "Pattern Recognition",
    desc: "The AI connects dots across your history: repeated behaviors, protocol patterns, anomalies, and trends you might have missed.",
  },
];

const exampleQuestions = [
  "What are my most active DeFi protocols?",
  "When did I first interact with Uniswap?",
  "What is my overall risk profile?",
  "How much ETH have I spent on gas this year?",
  "What are the biggest trades in my history?",
  "Am I more of a holder or a trader?",
];

export default function AiChat() {
  return (
    <div className="flex-1 bg-[#0C0C0C] text-white">
      <section className="relative px-5 md:px-10 pt-20 pb-24 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CBFF4D]/4 rounded-full blur-3xl pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#CBFF4D]/30 bg-[#CBFF4D]/8 text-[#CBFF4D] text-xs font-black uppercase tracking-widest mb-6">
            <MessageSquare className="w-3.5 h-3.5" />
            On-Chain AI Chat
          </div>
          <h1 className="text-6xl md:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tighter mb-6">
            Chat with your<br />
            <span className="text-[#CBFF4D]">on-chain data</span>
          </h1>
          <p className="text-xl text-white/50 leading-relaxed max-w-2xl mb-10">
            Subframe gives you a conversational AI that knows your entire wallet history. Ask questions, dig into patterns, get personalized guidance. No dashboards, no charts. Just answers.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/analyze">
              <button className="flex items-center gap-2 px-8 py-4 btn-lime rounded-full text-base font-black">
                Start Chatting <ArrowUpRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/claim">
              <button className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-base font-semibold transition-all">
                Get Your Profile <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="px-5 md:px-10 py-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ How it works</div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4">
              Your wallet,<br />
              <span className="text-[#CBFF4D]">fully explained</span>
            </h2>
            <p className="text-white/45 text-lg leading-relaxed mb-8">
              Before the conversation starts, the AI loads your wallet data: balance, transaction count, ENS name, activity type, risk level, and a full behavioral summary. Every answer is grounded in your actual on-chain history.
            </p>
            <div className="p-5 rounded-2xl border border-[#CBFF4D]/15 bg-[#CBFF4D]/[0.03]">
              <div className="text-xs font-mono text-[#CBFF4D]/60 mb-3 uppercase tracking-wider">Context loaded before every chat</div>
              <div className="space-y-2">
                {["Wallet address and ENS name", "ETH balance and USD value", "Total transaction count", "Activity classification", "Risk level assessment", "3 most recent transactions"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-white/55">
                    <Zap className="w-3.5 h-3.5 text-[#CBFF4D] shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
            <div className="absolute inset-0 rounded-3xl bg-[#161616] border border-white/5" />
            <div className="relative flex items-center justify-center p-12">
              <div className="absolute inset-0 rounded-3xl bg-[#CBFF4D]/3 blur-3xl" />
              <img src={analyzePng} alt="AI analysis 3D" className="relative w-64 h-64 object-contain drop-shadow-2xl animate-float" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ Capabilities</div>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              What makes it{" "}
              <span className="text-[#CBFF4D]">different</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-[#CBFF4D]/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#CBFF4D]" />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ Example questions</div>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Ask anything about<br />
              <span className="text-[#CBFF4D]">your wallet</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {exampleQuestions.map((q, i) => (
              <motion.div
                key={q}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/6 bg-white/[0.02]"
              >
                <MessageSquare className="w-4 h-4 text-[#CBFF4D]/50 shrink-0" />
                <span className="text-sm text-white/60 italic">"{q}"</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
            Start your first<br />
            <span className="text-[#CBFF4D]">on-chain conversation</span>
          </h2>
          <p className="text-white/40 text-lg mb-10">Enter any wallet address and start chatting in seconds.</p>
          <Link href="/analyze">
            <button className="inline-flex items-center gap-2 px-10 py-5 btn-lime rounded-full text-lg font-black">
              Open AI Chat <ArrowUpRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
