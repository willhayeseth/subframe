import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowUpRight, CheckCircle, Zap, Globe, Lock, Layers, ChevronRight } from "lucide-react";
import ethCrystal from "/3d-eth-crystal.webp";

const features = [
  {
    icon: Globe,
    title: "Permanent On-Chain Record",
    desc: "Your subdomain is registered directly on the Ethereum blockchain. No renewals, no expiry. Once claimed, it belongs to you forever.",
  },
  {
    icon: Lock,
    title: "Fully Decentralized",
    desc: "Subframe Protocol uses ENS smart contracts. There is no central server that controls your identity. Your name, your rules.",
  },
  {
    icon: Layers,
    title: "IPFS Profile Auto-Deploy",
    desc: "The moment you claim your subdomain, your Web3 profile is built and pinned to IPFS automatically. No technical setup required.",
  },
  {
    icon: Zap,
    title: "Zero Gas, Zero Cost",
    desc: "Registration on Subframe is completely free. We handle all protocol costs so you can claim your identity without spending ETH.",
  },
];

const steps = [
  { n: "01", title: "Pick your name", desc: "Choose a unique name for your subdomain. Lowercase letters, numbers, and hyphens only. Min 3 characters." },
  { n: "02", title: "Connect your wallet", desc: "Provide your Ethereum wallet address. This is the address your ENS subdomain will point to on-chain." },
  { n: "03", title: "Claim instantly", desc: "One click and your name.subframe.eth is live. Your IPFS profile goes live within seconds, ready to share." },
];

export default function EnsIdentity() {
  return (
    <div className="flex-1 bg-[#0C0C0C] text-white">
      <section className="relative px-5 md:px-10 pt-20 pb-24 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CBFF4D]/4 rounded-full blur-3xl pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#CBFF4D]/30 bg-[#CBFF4D]/8 text-[#CBFF4D] text-xs font-black uppercase tracking-widest mb-6">
            <Globe className="w-3.5 h-3.5" />
            ENS Subdomain
          </div>
          <h1 className="text-6xl md:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tighter mb-6">
            Your permanent<br />
            name on{" "}
            <span className="text-[#CBFF4D]">Ethereum</span>
          </h1>
          <p className="text-xl text-white/50 leading-relaxed max-w-2xl mb-10">
            Subframe Protocol gives every user a free ENS subdomain under subframe.eth. It is your identity layer for Web3, stored on-chain, pointing to your decentralized profile on IPFS.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/claim">
              <button className="flex items-center gap-2 px-8 py-4 btn-lime rounded-full text-base font-black">
                Claim Your Name <ArrowUpRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/explore">
              <button className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-base font-semibold transition-all">
                Browse Registry <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="px-5 md:px-10 py-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }}>
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ What you get</div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4">
              A real ENS name,<br />
              <span className="text-[#CBFF4D]">not a username</span>
            </h2>
            <p className="text-white/45 text-lg leading-relaxed mb-8">
              Unlike platform usernames that disappear when you leave, your subframe.eth subdomain is a cryptographic asset recorded on Ethereum. It resolves your wallet, your IPFS profile, and your Web3 identity in one address.
            </p>
            <div className="space-y-3">
              {["Resolves to your ETH wallet address", "Points to your IPFS profile automatically", "Works with all ENS-compatible apps", "Transferable and fully ownable"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-white/65 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#CBFF4D] shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} className="relative">
            <div className="absolute inset-0 rounded-3xl bg-[#161616] border border-white/5" />
            <div className="relative flex items-center justify-center p-12">
              <div className="absolute inset-0 rounded-3xl bg-[#CBFF4D]/3 blur-3xl" />
              <img src={ethCrystal} alt="Ethereum crystal" className="relative w-64 h-64 object-contain drop-shadow-2xl animate-float" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ Why it matters</div>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Built on real{" "}
              <span className="text-[#CBFF4D]">infrastructure</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, desc }, i) => (
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
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ How it works</div>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Claim in{" "}
              <span className="text-[#CBFF4D]">3 steps</span>
            </h2>
          </div>
          <div className="space-y-5">
            {steps.map(({ n, title, desc }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-6 p-6 rounded-2xl border border-white/8 bg-white/[0.02]"
              >
                <div className="text-4xl font-black font-mono text-[#CBFF4D]/30 shrink-0 w-12">{n}</div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">{title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
            Ready to own your<br />
            <span className="text-[#CBFF4D]">Web3 identity?</span>
          </h2>
          <p className="text-white/40 text-lg mb-10">Free forever. No gas. No renewals.</p>
          <Link href="/claim">
            <button className="inline-flex items-center gap-2 px-10 py-5 btn-lime rounded-full text-lg font-black">
              Claim Your Name <ArrowUpRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
