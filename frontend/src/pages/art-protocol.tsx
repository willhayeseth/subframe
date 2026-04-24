import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowUpRight, ChevronRight, ImageIcon, Coins, TrendingUp, Zap, Percent, Flame, BarChart2 } from "lucide-react";

const features = [
  {
    icon: ImageIcon,
    title: "Any Image Becomes an Edition",
    desc: "Upload any image when you claim your identity. A unique ERC-1155 token ID is minted on the shared SubframeArtProtocol contract with your image pinned to IPFS as token metadata.",
  },
  {
    icon: BarChart2,
    title: "Bonding Curve Pricing",
    desc: "Price increases with every edition minted and falls as editions are burned. No liquidity pool or market maker needed. The curve is the market.",
  },
  {
    icon: Percent,
    title: "0.5% Creator Fee On Every Mint and Burn",
    desc: "Every mint or burn carries a 1% fee split. Half goes to you as the creator (0.5%) and half to the protocol treasury (0.5%), forever.",
  },
  {
    icon: Zap,
    title: "Zero Gas For Creators",
    desc: "Subframe Protocol sponsors the deployment of the shared contract and your initial token creation. You mint your art without spending a single wei on gas.",
  },
  {
    icon: TrendingUp,
    title: "On-Chain Price Discovery",
    desc: "Price is deterministic and fully on-chain. Anyone can read the current mint or burn price directly from the contract at any time without relying on any off-chain oracle.",
  },
  {
    icon: Flame,
    title: "Tied To Your Identity",
    desc: "Your art edition is permanently linked to your ENS subdomain. Your profile page shows the live bonding curve, current supply, and Buy and Sell buttons with real-time prices.",
  },
];

const steps = [
  {
    n: "01",
    t: "Upload your image",
    d: "During claim, upload any image you own. JPEG, PNG, GIF, or SVG. It is pinned to IPFS instantly and becomes the cover art for your edition.",
  },
  {
    n: "02",
    t: "Protocol creates your ERC-1155 token",
    d: "Subframe calls createArt on the shared SubframeArtProtocol contract. A new token ID is issued with your wallet encoded as the creator address.",
  },
  {
    n: "03",
    t: "Bonding curve goes live",
    desc: "The curve starts at 0.001 ETH per edition and rises by 0.0001 ETH for each edition minted. Anyone can mint or burn at the exact on-chain price.",
  },
  {
    n: "04",
    t: "Earn from every mint and burn",
    d: "Every mint or burn triggers the 1% fee split. 0.5% is sent directly to your wallet. No claiming, no staking. It just arrives.",
  },
];

const stats = [
  { v: "0.5%", l: "Creator fee on every mint and burn" },
  { v: "0%", l: "Gas cost for creators" },
  { v: "1155", l: "ERC-1155 token standard" },
  { v: "L1", l: "Deployed on Ethereum mainnet" },
];

export default function ArtProtocol() {
  return (
    <div className="flex-1 bg-[#0C0C0C] text-white">
      <section className="relative px-5 md:px-10 pt-20 pb-24 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#CBFF4D]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-0 w-72 h-72 bg-[#FF007A]/4 rounded-full blur-3xl pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#CBFF4D]/30 bg-[#CBFF4D]/8 text-[#CBFF4D] text-xs font-black uppercase tracking-widest mb-6">
            <ImageIcon className="w-3.5 h-3.5" />
            Art Protocol
          </div>
          <h1 className="text-6xl md:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tighter mb-6">
            Turn your PFP into<br />
            <span className="text-[#CBFF4D]">tradable art</span>
          </h1>
          <p className="text-xl text-white/50 leading-relaxed max-w-2xl mb-10">
            Upload any image when you claim your Subframe identity. It is automatically issued as an ERC-1155 edition on a bonding curve. You earn 0.5% from every mint and burn, forever. Protocol pays the gas.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/claim">
              <button className="flex items-center gap-2 px-8 py-4 btn-lime rounded-full text-base font-black">
                Claim Your Subdomain <ArrowUpRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/explore">
              <button className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-base font-semibold transition-all">
                Browse Art Editions <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="px-5 md:px-10 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(({ v, l }) => (
            <motion.div
              key={l}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              className="p-5 rounded-2xl border border-white/8 bg-white/[0.02] text-center"
            >
              <div className="text-3xl font-black font-mono text-[#CBFF4D] mb-1">{v}</div>
              <div className="text-xs text-white/35 leading-snug">{l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-5 md:px-10 py-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false }}
            className="order-last lg:order-first"
          >
            <div className="relative rounded-3xl overflow-hidden border border-white/8 bg-[#111411] p-8">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/30 to-transparent" />

              <div className="mb-5 rounded-xl overflow-hidden w-full">
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

              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: "0.001", l: "Starting Price (ETH)" },
                  { v: "0.5%", l: "Creator Fee" },
                  { v: "0%", l: "Gas Cost" },
                ].map((s) => (
                  <div key={s.l} className="text-center py-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    <div className="text-base font-black font-mono text-[#CBFF4D]">{s.v}</div>
                    <div className="text-[9px] text-white/30 mt-1 uppercase tracking-widest">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }}>
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ How it works</div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4">
              Image in,<br />
              <span className="text-[#CBFF4D]">editions out</span>
            </h2>
            <p className="text-white/45 text-lg leading-relaxed mb-8">
              The Art Protocol converts any image into an ERC-1155 edition on a bonding curve. Price rises as more people mint and falls as people burn. No market maker, no liquidity pool. You upload and earn.
            </p>
            <div className="space-y-3">
              {[
                "Image pinned to IPFS as token metadata",
                "ERC-1155 token ID created with your wallet as creator address",
                "Bonding curve starts at 0.001 ETH, rises 0.0001 ETH per edition",
                "0.5% of every mint and burn goes to your wallet instantly",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D] shrink-0 mt-2" />
                  <span className="text-white/60 text-sm leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ Protocol features</div>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Built for{" "}
              <span className="text-[#CBFF4D]">creators</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.08 }}
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
            <div className="text-sm font-mono text-white/30 mb-4 tracking-wider">/ Step by step</div>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Live in{" "}
              <span className="text-[#CBFF4D]">4 steps</span>
            </h2>
          </div>
          <div className="space-y-4">
            {steps.map(({ n, t, d, desc: stepDesc }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-6 p-6 rounded-2xl border border-white/8 bg-white/[0.02]"
              >
                <div className="text-4xl font-black font-mono text-[#CBFF4D]/30 shrink-0 w-12 leading-none">{n}</div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">{t}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{d ?? stepDesc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4">
            Turn your art into<br />
            <span className="text-[#CBFF4D]">on-chain income</span>
          </h2>
          <p className="text-white/40 text-lg mb-10">
            Claim your Subframe identity, upload an image, and start earning from every edition minted. Zero cost to start.
          </p>
          <Link href="/claim">
            <button className="inline-flex items-center gap-2 px-10 py-5 btn-lime rounded-full text-lg font-black">
              Claim Your Subdomain <ArrowUpRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
