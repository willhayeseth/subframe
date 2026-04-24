import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight, ChevronRight, TrendingUp, Zap, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { useGetSubdomainStats, useListSubdomains } from "@workspace/api-client-react";
import type { Subdomain } from "@workspace/api-client-react";

import ctaAsset from "/subframe-cta-asset.webp";
import identityCard from "/subframe-hero-card.webp";
import { EnsVideoAnim, AiWalletVideoAnim, AiChatVideoAnim } from "@/components/feature-animations";

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

const EASE = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.05 } },
};
const textItem = {
  hidden: { opacity: 0, y: 48, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE } },
};
const mediaItem = {
  hidden: { opacity: 0, scale: 0.78, filter: "blur(20px)" },
  visible: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 1.0, ease: EASE } },
};

function ScrollCard({ children, index }: { children: ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 52, filter: "blur(12px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: false, amount: 0.08 }}
      transition={{ duration: 0.85, ease: EASE, delay: index * 0.1 }}
      className="w-full"
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

function FeatureBlock({
  number, title, titleAccent, desc, animation, reverse, ctaLabel, ctaHref,
}: {
  number: string; title: string; titleAccent?: string; desc: string;
  animation: ReactNode; reverse?: boolean;
  ctaLabel: string; ctaHref: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.08 }}
      variants={containerVariants}
      className={`relative flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-16 py-10 lg:py-14`}
    >
      <div className="flex-1 min-w-0">
        <motion.div variants={textItem} className="text-sm font-mono text-white/30 mb-5 tracking-wider">
          / {number}
        </motion.div>
        <motion.h2
          variants={textItem}
          className="text-5xl md:text-6xl xl:text-7xl font-black leading-[1.0] tracking-tight text-white mb-6"
        >
          {title}{" "}
          {titleAccent && <span className="highlight-lime">{titleAccent}</span>}
        </motion.h2>
        <motion.p variants={textItem} className="text-lg text-white/50 leading-relaxed max-w-lg mb-8">
          {desc}
        </motion.p>
        <motion.div variants={textItem} className="flex items-center gap-4">
          <Link href={ctaHref}>
            <button className="flex items-center gap-2 px-7 py-3.5 btn-lime text-base font-black">
              {ctaLabel}
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </Link>
        </motion.div>
      </div>

      <motion.div variants={mediaItem} className="relative w-full lg:w-[560px] shrink-0">
        <div className="w-full h-[300px] lg:h-[360px] rounded-3xl overflow-hidden border border-white/8 shadow-2xl shadow-black/60">
          {animation}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SubdomainCard({ subdomain, i }: { subdomain: Subdomain; i: number }) {
  const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const hasToken = subdomain.tokenStatus === "deployed" && subdomain.tokenSymbol;
  return (
    <ScrollCard index={i}>
      <Link href={`/profile/${subdomain.name}`}>
        <div className="group p-5 rounded-2xl card-dark card-dark-hover cursor-pointer transition-all duration-300">
          <div className="flex items-start gap-3 mb-4">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 overflow-hidden flex items-center justify-center">
                {subdomain.avatarUrl ? (
                  <img src={subdomain.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-white/50">
                    {subdomain.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              {subdomain.status === "linked" && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#CBFF4D] border-2 border-[#111]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono font-bold text-white text-sm group-hover:text-[#CBFF4D] transition-colors truncate">
                {subdomain.ensFullName}
              </div>
              <div className="font-mono text-xs text-white/25 mt-0.5">{short(subdomain.walletAddress)}</div>
            </div>
          </div>

          {subdomain.bio && (
            <p className="text-xs text-white/40 mb-3 line-clamp-2 leading-relaxed">{subdomain.bio}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            {hasToken ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#CBFF4D]/8 border border-[#CBFF4D]/15 text-[#CBFF4D] text-xs font-bold font-mono">
                <TrendingUp className="w-3 h-3" />
                ${subdomain.tokenSymbol}
              </div>
            ) : subdomain.tokenStatus === "deploying" ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/8 border border-amber-400/15 text-amber-400/70 text-xs font-mono">
                <Zap className="w-3 h-3" />
                token minting
              </div>
            ) : (
              <div />
            )}
            <span className="flex items-center gap-1 text-xs text-white/25 group-hover:text-[#CBFF4D] transition-colors shrink-0">
              Profile <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </ScrollCard>
  );
}


function ArtAnim() {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#111411] p-5 flex flex-col justify-between">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/25 to-transparent" />

      <div className="mb-4 rounded-xl overflow-hidden w-full">
        <video
          src="/art-chart.webm"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          className="w-full h-auto block"
          style={{ pointerEvents: "none" }}
        >
          <source src="/art-chart.webm" type="video/webm" />
          <source src="/art-chart.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="text-center py-3 px-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
          <div className="text-[15px] font-black font-mono text-[#CBFF4D] leading-none">0.5%</div>
          <div className="text-[8.5px] text-white/30 mt-1.5 uppercase tracking-widest leading-tight">
            Creator Fee
          </div>
        </div>
        <div className="text-center py-3 px-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
          <div className="text-[15px] font-black font-mono text-[#CBFF4D] leading-none">0%</div>
          <div className="text-[8.5px] text-white/30 mt-1.5 uppercase tracking-widest leading-tight">
            Gas Cost
          </div>
        </div>
      </div>
    </div>
  );
}

const marqueeItems1 = ["ENS Subdomain", "AI Wallet", "IPFS Profile", "On-Chain Identity", "Web3 Chat", "Zero Gas"];
const marqueeItems2 = ["Subframe Protocol", "Decentralized", "Ethereum", "AI Powered", "Open Registry", "Permissionless"];

export default function Home() {
  const { data: stats } = useGetSubdomainStats();
  const { data: subdomains } = useListSubdomains();

  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollSnapType = "y mandatory";
    html.style.overscrollBehaviorY = "none";
    return () => {
      html.style.scrollSnapType = "";
      html.style.overscrollBehaviorY = "";
    };
  }, []);

  return (
    <div className="flex flex-col bg-[#0C0C0C] min-h-screen">
      {/* ─── HERO ─── */}
      <section
        className="relative flex items-start overflow-hidden px-5 md:px-10 lg:px-16 pt-20 lg:pt-32 pb-16"
        style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
      >
        <div className="relative z-20 max-w-7xl mx-auto w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-8">

          {/* ── Left: text ── */}
          <div className="flex-1 min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.7 }}
              className="text-[44px] sm:text-8xl md:text-9xl xl:text-[116px] font-black leading-[0.92] tracking-tighter text-white mb-6"
            >
              Claim{" "}
              <span className="highlight-lime">your</span>
              <br />
              Web3{" "}
              <span className="highlight-lime">identity</span>
            </motion.h1>

            {/* Video on mobile only — appears right after headline */}
            <div className="block lg:hidden w-full rounded-2xl overflow-hidden mb-6">
              <video
                src="/subframe-hero.mp4"
                autoPlay
                loop
                muted
                playsInline
                controlsList="nodownload"
                disablePictureInPicture
                className="w-full h-auto object-cover pointer-events-none select-none"
              />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg md:text-xl text-white/45 max-w-xl leading-relaxed mb-10"
            >
              Get your permanent{" "}
              <span className="font-mono text-white/70">name.subframe.eth</span>{" "}
              subdomain with AI-powered wallet analysis, tradable on-chain art, IPFS profile hosting, on-chain AI chat, and a public Web3 identity that lives on Ethereum forever.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link href="/docs">
                <button
                  data-testid="btn-docs"
                  className="flex items-center gap-2 px-8 py-4 btn-lime text-base font-black rounded-full"
                >
                  Documentation
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
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

            {/* Stats on mobile only */}
            {stats && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="flex lg:hidden flex-wrap gap-8 mt-8 pt-6 border-t border-white/8"
              >
                {[
                  { v: stats.totalSubdomains, l: "Claimed" },
                  { v: stats.activeSubdomains, l: "Active" },
                  { v: stats.linkedToIPFS, l: "IPFS Live" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-3xl font-black font-mono text-[#CBFF4D]">{s.v}</div>
                    <div className="text-xs text-white/35 mt-1 uppercase tracking-widest">{s.l}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* ── Right: visuals (desktop only) ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="hidden lg:flex flex-col justify-center gap-4 w-[460px] shrink-0"
          >
            {/* Hero video */}
            <div className="w-full rounded-2xl overflow-hidden">
              <video
                src="/subframe-hero.mp4"
                autoPlay
                loop
                muted
                playsInline
                controlsList="nodownload"
                disablePictureInPicture
                className="w-full h-auto object-cover pointer-events-none select-none"
              />
            </div>

            {/* Stats horizontal */}
            {stats && (
              <div className="flex items-center gap-8 pt-4 border-t border-white/8">
                {[
                  { v: stats.totalSubdomains, l: "Claimed" },
                  { v: stats.activeSubdomains, l: "Active" },
                  { v: stats.linkedToIPFS, l: "IPFS Live" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-3xl font-black font-mono text-[#CBFF4D] leading-none">{s.v}</div>
                    <div className="text-[10px] text-white/35 mt-1 uppercase tracking-widest">{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </section>

      {/* ─── MARQUEE BLOCK ─── */}
      <div className="overflow-hidden bg-[#0C0C0C] py-2 flex flex-col gap-0">
        <Marquee items={marqueeItems1} reverse />
        <Marquee items={marqueeItems2} />
      </div>

      {/* ─── FEATURES ─── */}
      <section
        className="px-5 md:px-10 max-w-7xl mx-auto w-full py-10 md:py-14 flex flex-col justify-center"
        style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
      >
        <FeatureBlock
          number="01"
          title="Own your name on"
          titleAccent="Ethereum"
          desc="Register name.subframe.eth permanently. Your ENS subdomain is yours forever, stored on-chain, pointing to your IPFS profile automatically."
          animation={<EnsVideoAnim />}
          ctaLabel="Explore ENS Identity"
          ctaHref="/ens-identity"
        />

        <div className="w-full h-px bg-white/5" />

        <FeatureBlock
          number="02"
          title="AI that knows your"
          titleAccent="wallet"
          desc="Deep AI analysis of your entire on-chain history. Activity type, risk level, key insights, token holdings, all in seconds."
          animation={<AiWalletVideoAnim />}
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
          animation={<AiChatVideoAnim />}
          ctaLabel="Discover AI Chat"
          ctaHref="/ai-chat"
        />

        <div className="w-full h-px bg-white/5" />

        <FeatureBlock
          number="04"
          title="Turn your PFP into"
          titleAccent="tradable art"
          desc="Upload any image when you claim your identity. It becomes an ERC-1155 token on a bonding curve. You earn 0.5% from every mint and burn, forever. Protocol pays the gas."
          animation={<ArtAnim />}
          reverse
          ctaLabel="Start Creating"
          ctaHref="/art-protocol"
        />
      </section>

      {/* ─── REGISTRY ─── */}
      <section
        className="px-5 md:px-10 py-12 md:py-16 max-w-7xl mx-auto w-full flex flex-col justify-center"
        style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 48, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="flex items-end justify-between gap-4 mb-14"
        >
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
        </motion.div>

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
      <section
        className="px-5 md:px-10 py-12 md:py-16 max-w-7xl mx-auto w-full flex flex-col justify-center"
        style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 48, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div className="text-sm font-mono text-white/30 mb-6 tracking-wider">/ 05</div>
          <h2 className="text-5xl md:text-6xl xl:text-7xl font-black text-white leading-tight mb-16">
            Live in{" "}
            <span className="highlight-lime">3 steps</span>
          </h2>
        </motion.div>

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

      {/* ─── ROADMAP ─── */}
      <section
        className="px-5 md:px-10 py-12 md:py-16 max-w-7xl mx-auto w-full flex flex-col justify-center"
        style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 48, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="mb-14"
        >
          <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ 06</div>
          <h2 className="text-5xl md:text-6xl xl:text-7xl font-black text-white leading-tight">
            Where we are{" "}
            <span className="highlight-lime">going</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Card 1: Live Now */}
          <ScrollCard index={0}>
            <div className="relative h-full flex flex-col p-7 rounded-3xl border border-[#CBFF4D]/25 bg-[#CBFF4D]/[0.04] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/40 to-transparent" />
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#CBFF4D] text-black text-[11px] font-black uppercase tracking-widest">
                  <CheckCircle2 className="w-3 h-3" />
                  Live Now
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-5 leading-tight">
                Identity and Profile
              </h3>
              <ul className="space-y-3 flex-1">
                {[
                  "ENS subdomain claim on subframe.eth",
                  "IPFS profile hosting with live data",
                  "AI Wallet Analyzer",
                  "On-chain AI Chat via XMTP",
                  "Zero gas for creators",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#CBFF4D] shrink-0 mt-0.5" />
                    <span className="text-sm text-white/60 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollCard>

          {/* Card 2: In Progress */}
          <ScrollCard index={1}>
            <div className="relative h-full flex flex-col p-7 rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/25 text-amber-400 text-[11px] font-black uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  Building
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-5 leading-tight">
                Art Protocol
              </h3>
              <ul className="space-y-3 flex-1">
                {[
                  "ERC-1155 bonding curve editions",
                  "Buy and sell from any profile page",
                  "Creator royalties on every mint and burn",
                  "Live on-chain price and supply tracking",
                  "Edition gallery per creator",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full border border-amber-400/40 shrink-0 mt-0.5 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                    </div>
                    <span className="text-sm text-white/50 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollCard>

          {/* Card 3: Planned */}
          <ScrollCard index={2}>
            <div className="relative h-full flex flex-col p-7 rounded-3xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 text-white/40 text-[11px] font-black uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  Coming Soon
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-5 leading-tight">
                Ecosystem
              </h3>
              <ul className="space-y-3 flex-1">
                {[
                  "X and Telegram bots for subdomain alerts",
                  "Mobile app for claiming and browsing",
                  "Cross-chain ENS support",
                  "Community governance via edition holders",
                  "Open API and webhook integrations",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full border border-white/15 shrink-0 mt-0.5" />
                    <span className="text-sm text-white/35 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollCard>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section
        className="px-5 md:px-10 pb-24 min-h-screen flex flex-col justify-center"
        style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
      >
        <ScrollCard index={0}>
          <div className="relative max-w-7xl mx-auto rounded-3xl overflow-hidden bg-[#CBFF4D] p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="absolute right-0 top-0 bottom-0 w-72 pointer-events-none opacity-95 hidden md:flex items-center">
              <img src={identityCard} alt="identity card" className="w-full object-contain drop-shadow-2xl animate-float" />
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
