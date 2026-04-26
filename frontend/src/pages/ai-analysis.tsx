import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowUpRight, Brain, Shield, Tag, BarChart3, ChevronRight, Zap } from "lucide-react";
import aiBrain from "/3d-ai-brain.webp";

const capabilities = [
  {
    icon: BarChart3,
    title: "Activity Type Classification",
    desc: "The AI identifies whether you are a DeFi trader, NFT collector, long-term holder, contract deployer, or any combination. No guessing, pure on-chain signals.",
  },
  {
    icon: Shield,
    title: "Risk Level Assessment",
    desc: "Analyzes transaction patterns, contract interactions, and fund flows to produce a clear risk profile: Low, Medium, or High.",
  },
  {
    icon: Tag,
    title: "Smart Tagging",
    desc: "Automatically generates behavior tags like DeFi Power User, NFT Flipper, Early Adopter, Whale, or Micro Trader based on real activity.",
  },
  {
    icon: Brain,
    title: "Key Insight Generation",
    desc: "The model surfaces the most important findings about a wallet: unusual patterns, protocol loyalties, and standout behaviors.",
  },
];

const metrics = [
  { v: "ETH Balance", d: "Real-time holdings fetched from the chain" },
  { v: "TX Count", d: "Total transaction history across all time" },
  { v: "Token Holdings", d: "ERC-20 and NFT portfolio overview" },
  { v: "Last 3 TXs", d: "Most recent on-chain activity with methods" },
];

export default function AiAnalysis() {
  return (
    <div className="flex-1 bg-[#0C0C0C] text-white">
      <section className="relative px-5 md:px-10 pt-20 pb-24 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CBFF4D]/4 rounded-full blur-3xl pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#CBFF4D]/30 bg-[#CBFF4D]/8 text-[#CBFF4D] text-xs font-black uppercase tracking-widest mb-6">
            <Brain className="w-3.5 h-3.5" />
            AI Wallet Analysis
          </div>
          <h1 className="text-6xl md:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tighter mb-6">
            AI that reads your<br />
            <span className="text-[#CBFF4D]">entire history</span>
          </h1>
          <p className="text-xl text-white/50 leading-relaxed max-w-2xl mb-10">
            Subframe runs deep AI analysis on any Ethereum address or ENS name. In seconds, you get a full behavioral profile: activity classification, risk level, smart tags, and key insights derived purely from on-chain data.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/analyze">
              <button className="flex items-center gap-2 px-8 py-4 btn-lime rounded-full text-base font-black">
                Analyze a Wallet <ArrowUpRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/claim">
              <button className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-base font-semibold transition-all">
                Claim Your Profile <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="px-5 md:px-10 py-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} className="relative order-last lg:order-first">
            <div className="absolute inset-0 rounded-3xl bg-[#161616] border border-white/5" />
            <div className="relative flex items-center justify-center p-12">
              <div className="absolute inset-0 rounded-3xl bg-[#CBFF4D]/3 blur-3xl" />
              <img src={aiBrain} alt="AI brain 3D" className="relative w-64 h-64 object-contain drop-shadow-2xl animate-float" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }}>
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ What we analyze</div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4">
              Every signal,<br />
              <span className="text-[#CBFF4D]">decoded</span>
            </h2>
            <p className="text-white/45 text-lg leading-relaxed mb-8">
              The analysis engine pulls live on-chain data from Ethereum, then feeds it into our AI model trained to understand wallet behavior. You get plain-language insights, not raw numbers.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {metrics.map(({ v, d }) => (
                <div key={v} className="p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                  <div className="font-mono font-bold text-[#CBFF4D] text-sm mb-1">{v}</div>
                  <div className="text-xs text-white/35 leading-relaxed">{d}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ AI capabilities</div>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Four layers of{" "}
              <span className="text-[#CBFF4D]">intelligence</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {capabilities.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
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
          <div className="text-center mb-14">
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ How analysis works</div>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Results in{" "}
              <span className="text-[#CBFF4D]">seconds</span>
            </h2>
          </div>
          <div className="space-y-5">
            {[
              { n: "01", t: "Enter any address or ENS name", d: "Paste a full 0x wallet address or any ENS name like vitalik.eth. The system normalizes and resolves it automatically." },
              { n: "02", t: "Live data is fetched", d: "We pull real-time balance, transaction count, token holdings, and the 3 most recent transactions directly from Ethereum." },
              { n: "03", t: "AI builds your profile", d: "Our model analyzes the data and generates a structured report: activity type, risk level, behavioral tags, and written insights." },
              { n: "04", t: "Read your report", d: "The full analysis appears on screen. Share it, save it to your Subframe profile, or continue with AI chat for deeper questions." },
            ].map(({ n, t, d }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-6 p-6 rounded-2xl border border-white/8 bg-white/[0.02]"
              >
                <div className="text-4xl font-black font-mono text-[#CBFF4D]/30 shrink-0 w-12">{n}</div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">{t}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
            Try it on any<br />
            <span className="text-[#CBFF4D]">wallet now</span>
          </h2>
          <p className="text-white/40 text-lg mb-10">No sign-up. Paste any address and get your full report.</p>
          <Link href="/analyze">
            <button className="inline-flex items-center gap-2 px-10 py-5 btn-lime rounded-full text-lg font-black">
              Analyze My Wallet <ArrowUpRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
