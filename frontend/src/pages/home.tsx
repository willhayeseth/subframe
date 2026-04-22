import { useRef, type ReactNode } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, ArrowRight, ChevronRight } from "lucide-react";
import { useGetSubdomainStats, useListSubdomains } from "@workspace/api-client-react";
import type { Subdomain } from "@workspace/api-client-react";

import brainHeart from "/3d-brain-heart.webp";
import identityCard from "/3d-identity-card.webp";
import ethCrystal from "/3d-eth-crystal.webp";
import aiBrain from "/3d-ai-brain.webp";
import analyzePng from "/3d-analyze.webp";
import planetPng from "/3d-planet.webp";

function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const doubled = [...items, ...items, ...items];
  return (
    <div className="overflow-hidden w-full">
      <div className={reverse ? "marquee-inner-rev" : "marquee-inner"}>
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-8 pr-8 shrink-0">
            <span className="text-5xl md:text-7xl xl:text-8xl font-black uppercase tracking-tighter text-white/10 whitespace-nowrap leading-none">
              {item}
            </span>
            <span className="text-[#CBFF4D]/25 text-5xl md:text-7xl font-black leading-none">+</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrollCard({ children, index }: { children: ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end center"],
  });
  const y = useTransform(scrollYProgress, [0, 0.4], [110, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0, 1]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.88, 1]);
  const blur = useTransform(scrollYProgress, [0, 0.35], [10, 0]);
  const blurStr = useTransform(blur, (v) => `blur(${v}px)`);

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity, scale, filter: blurStr }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

function FeatureBlock({
  number, title, titleAccent, desc, img, imgAlt, reverse, delay, ctaLabel, ctaHref,
}: {
  number: string; title: string; titleAccent?: string; desc: string;
  img: string; imgAlt: string; reverse?: boolean; delay?: number;
  ctaLabel: string; ctaHref: string;
}) {
  return (
    <ScrollCard index={parseInt(number)}>
      <div
        className={`relative flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-16 py-16 lg:py-24`}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-mono text-white/30 mb-5 tracking-wider">/ {number}</div>
          <h2 className="text-5xl md:text-6xl xl:text-7xl font-black leading-[1.0] tracking-tight text-white mb-6">
            {title}{" "}
            {titleAccent && <span className="highlight-lime">{titleAccent}</span>}
          </h2>
          <p className="text-lg text-white/50 leading-relaxed max-w-lg mb-8">{desc}</p>
          <div className="flex items-center gap-4">
            <Link href={ctaHref}>
              <button className="flex items-center gap-2 px-7 py-3.5 btn-lime text-base font-black">
                {ctaLabel}
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        <div className="relative w-full lg:w-[420px] shrink-0 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-[#161616] border border-white/5" />
          <div className="relative w-64 h-64 lg:w-80 lg:h-80">
            <div className="absolute inset-0 rounded-full bg-[#CBFF4D]/5 blur-3xl" />
            <img
              src={img}
              alt={imgAlt}
              className="w-full h-full object-contain drop-shadow-2xl animate-float"
            />
          </div>
        </div>
      </div>
    </ScrollCard>
  );
}

function SubdomainCard({ subdomain, i }: { subdomain: Subdomain; i: number }) {
  const statusColors: Record<string, string> = {
    linked: "bg-[#CBFF4D] text-black",
    active: "bg-cyan-400 text-black",
    pending: "bg-amber-400 text-black",
  };
  const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  return (
    <ScrollCard index={i}>
      <Link href={`/profile/${subdomain.name}`}>
        <div className="group p-6 rounded-2xl card-dark card-dark-hover cursor-pointer transition-all duration-300">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-sm font-black text-white/70 shrink-0">
              {subdomain.name.slice(0, 2).toUpperCase()}
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${statusColors[subdomain.status] ?? statusColors.pending}`}>
              {subdomain.status}
            </span>
          </div>
          <div className="font-mono font-bold text-white text-sm group-hover:text-[#CBFF4D] transition-colors mb-1 truncate">
            {subdomain.ensFullName}
          </div>
          <div className="font-mono text-xs text-white/25">{short(subdomain.walletAddress)}</div>
          {subdomain.bio && (
            <p className="text-xs text-white/40 mt-3 line-clamp-2 leading-relaxed">{subdomain.bio}</p>
          )}
          <div className="flex items-center gap-1 mt-4 text-xs text-white/25 group-hover:text-[#CBFF4D] transition-colors">
            View profile <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    </ScrollCard>
  );
}

const marqueeItems1 = ["ENS Subdomain", "AI Wallet", "IPFS Profile", "On-Chain Identity", "Web3 Chat", "Zero Gas"];
const marqueeItems2 = ["Subframe Protocol", "Decentralized", "Ethereum", "AI Powered", "Open Registry", "Permissionless"];

export default function Home() {
  const { data: stats } = useGetSubdomainStats();
  const { data: subdomains } = useListSubdomains();

  return (
    <div className="flex flex-col bg-[#0C0C0C] min-h-screen">
      {/* ─── HERO ─── */}
      <section className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden px-5 md:px-10 pt-10 pb-20">
        <div className="absolute top-10 right-[4%] w-56 h-56 md:w-80 md:h-80 pointer-events-none select-none z-10 animate-float">
          <img src={identityCard} alt="3D digital identity card" className="w-full h-full object-contain drop-shadow-2xl" />
        </div>
        <div className="absolute bottom-[8%] left-[1%] w-40 h-40 md:w-56 md:h-56 pointer-events-none select-none opacity-85 z-0"
          style={{ animation: "float 7s ease-in-out infinite 1.5s" }}>
          <img src={brainHeart} alt="3D brain heart" className="w-full h-full object-contain drop-shadow-2xl" />
        </div>

        <div className="relative z-20 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="tag-pill inline-flex mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D] animate-pulse" />
            Protocol live on Ethereum
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-6xl sm:text-7xl md:text-8xl xl:text-[110px] font-black leading-[0.95] tracking-tighter text-white mb-6"
          >
            Claim{" "}
            <span className="highlight-lime">your</span>
            <br />
            Web3{" "}
            <span className="highlight-lime">identity</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="text-lg md:text-xl text-white/45 max-w-xl leading-relaxed mb-12"
          >
            Get your permanent{" "}
            <span className="font-mono text-white/70">name.subframe.eth</span> subdomain with AI-powered profile, IPFS hosting, and on-chain AI chat.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex flex-wrap items-center gap-4"
          >
            <a href="https://github.com/willhayeseth/subframe" target="_blank" rel="noopener noreferrer">
              <button
                data-testid="btn-docs"
                className="flex items-center gap-2 px-8 py-4 btn-lime text-base font-black rounded-full"
              >
                Documentation
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </a>
            <Link href="/explore">
              <button
                data-testid="btn-explore"
                className="flex items-center gap-2 px-8 py-4 btn-outline-lime text-base rounded-full"
              >
                Browse Registry
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>

          {stats && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex flex-wrap gap-10 mt-16 pt-10 border-t border-white/8"
            >
              {[
                { v: stats.totalSubdomains, l: "Claimed" },
                { v: stats.activeSubdomains, l: "Active" },
                { v: stats.linkedToIPFS, l: "IPFS Live" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-4xl font-black font-mono text-[#CBFF4D]">{s.v}</div>
                  <div className="text-xs text-white/35 mt-1 uppercase tracking-widest">{s.l}</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ─── MARQUEE BLOCK ─── */}
      <div className="overflow-hidden bg-[#0C0C0C] py-2 flex flex-col gap-0">
        <Marquee items={marqueeItems1} reverse />
        <Marquee items={marqueeItems2} />
      </div>

      {/* ─── FEATURES ─── */}
      <section className="px-5 md:px-10 max-w-7xl mx-auto w-full">
        <FeatureBlock
          number="01"
          title="Own your name on"
          titleAccent="Ethereum"
          desc="Register name.subframe.eth permanently. Your ENS subdomain is yours forever, stored on-chain, pointing to your IPFS profile automatically."
          img={ethCrystal}
          imgAlt="Ethereum crystal 3D"
          ctaLabel="Explore ENS Identity"
          ctaHref="/ens-identity"
        />

        <div className="w-full h-px bg-white/5" />

        <FeatureBlock
          number="02"
          title="AI that knows your"
          titleAccent="wallet"
          desc="Deep AI analysis of your entire on-chain history. Activity type, risk level, key insights, token holdings, all in seconds."
          img={aiBrain}
          imgAlt="AI brain 3D"
          reverse
          ctaLabel="See How It Works"
          ctaHref="/ai-analysis"
        />

        <div className="w-full h-px bg-white/5" />

        <FeatureBlock
          number="03"
          title="Chat with your"
          titleAccent="on-chain data"
          desc="An AI assistant with full context of your wallet. Ask about your history, analyze your positions, and get smart guidance."
          img={analyzePng}
          imgAlt="3D analyze"
          ctaLabel="Discover AI Chat"
          ctaHref="/ai-chat"
        />
      </section>


      {/* ─── REGISTRY ─── */}
      <section className="px-5 md:px-10 py-20 md:py-32 max-w-7xl mx-auto w-full">
        <div className="flex items-end justify-between gap-4 mb-14">
          <div>
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ 04</div>
            <h2 className="text-5xl md:text-6xl xl:text-7xl font-black text-white leading-tight">
              Live{" "}
              <span className="highlight-lime">Registry</span>
            </h2>
          </div>
          <Link href="/explore">
            <button
              data-testid="btn-view-all"
              className="flex items-center gap-2 px-7 py-3.5 btn-lime text-sm font-black rounded-full shrink-0"
            >
              View All
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(stats?.recentClaims ?? subdomains ?? []).slice(0, 6).map((s, i) => (
            <SubdomainCard key={s.id} subdomain={s} i={i} />
          ))}
        </div>
      </section>

      {/* ─── MARQUEE 3 (small) ─── */}
      <div className="overflow-hidden py-4 border-y border-white/5">
        <div className="marquee-inner">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="text-sm font-mono text-white/15 px-5 uppercase tracking-widest whitespace-nowrap">
              subframe.eth
            </span>
          ))}
        </div>
      </div>

      {/* ─── HOW IT WORKS ─── */}
      <section className="px-5 md:px-10 py-20 md:py-32 max-w-7xl mx-auto w-full">
        <div className="text-sm font-mono text-white/30 mb-6 tracking-wider">/ 05</div>
        <h2 className="text-5xl md:text-6xl xl:text-7xl font-black text-white leading-tight mb-16">
          Live in{" "}
          <span className="highlight-lime">3 steps</span>
        </h2>

        <div className="relative">
          <div className="hidden lg:block absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#CBFF4D]/30 via-[#CBFF4D]/10 to-transparent" />
          <div className="space-y-6">
            {[
              {
                n: "01",
                t: "Connect your wallet",
                d: "Link your Ethereum address. No wallet? Paste any public address to claim a profile.",
              },
              {
                n: "02",
                t: "Choose your name",
                d: "Pick a unique subdomain. Availability is checked live as you type.",
              },
              {
                n: "03",
                t: "Claim and go live",
                d: "Your name.subframe.eth is deployed to IPFS instantly. Share your link anywhere.",
              },
            ].map((step, i) => (
              <ScrollCard key={step.n} index={i}>
                <div className="flex gap-8 items-start lg:pl-20 p-8 rounded-2xl card-dark transition-all duration-300 card-dark-hover">
                  <div className="shrink-0 text-6xl font-black font-mono text-[#CBFF4D]/20 leading-none mt-1">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">{step.t}</h3>
                    <p className="text-white/45 text-base leading-relaxed max-w-lg">{step.d}</p>
                  </div>
                </div>
              </ScrollCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-5 md:px-10 pb-24">
        <ScrollCard index={0}>
          <div className="relative max-w-7xl mx-auto rounded-3xl overflow-hidden bg-[#CBFF4D] p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none opacity-90 hidden md:flex items-center">
              <img src={planetPng} alt="3D planet" className="w-full object-contain drop-shadow-2xl animate-float" />
            </div>

            <div className="relative z-10">
              <h2 className="text-5xl md:text-6xl xl:text-7xl font-black text-black leading-tight tracking-tight">
                Show your
                <br />
                Web3{" "}
                <span className="inline-block px-3 py-0 bg-black text-[#CBFF4D] rounded-2xl">identity</span>
              </h2>
              <p className="mt-5 text-black/60 text-lg max-w-md">
                Join the protocol. Own your on-chain name and let AI tell your story.
              </p>
            </div>

            <div className="relative z-10 flex flex-col items-start gap-4">
              <Link href="/claim">
                <button
                  data-testid="btn-cta-claim"
                  className="flex items-center gap-2 px-10 py-5 bg-black text-[#CBFF4D] font-black text-lg rounded-full hover:bg-[#111] transition-colors"
                >
                  Claim Free
                  <ArrowUpRight className="w-5 h-5" />
                </button>
              </Link>
              <span className="text-xs text-black/50 font-mono ml-2">No gas required</span>
            </div>
          </div>
        </ScrollCard>
      </section>
    </div>
  );
}
