import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ExternalLink, Layers, Globe } from "lucide-react";
import { useListSubdomains } from "@workspace/api-client-react";
import type { Subdomain } from "@workspace/api-client-react";
import { SubframeNetworkMap } from "../components/network-map";
import { ArtCard } from "@/components/art-card";

const MOCK_ART = [
  { id: 1, image: "/art/art1.png", creator: "vitalik.subframe.eth", name: "ETH Crystal", mintPrice: "0.0055", editions: 45 },
  { id: 2, image: "/art/art2.png", creator: "hayes.subframe.eth", name: "Spiral Infinite", mintPrice: "0.0021", editions: 11 },
  { id: 3, image: "/art/art3.png", creator: "cryptoninja.subframe.eth", name: "Neon City", mintPrice: "0.0089", editions: 79 },
  { id: 4, image: "/art/art4.png", creator: "defiwhale.subframe.eth", name: "Glitch Protocol", mintPrice: "0.0031", editions: 21 },
  { id: 5, image: "/art/art5.png", creator: "satoshi.subframe.eth", name: "Cosmic Jelly", mintPrice: "0.0201", editions: 191 },
  { id: 6, image: "/art/art6.png", creator: "liquidmeta.subframe.eth", name: "Liquid Gold", mintPrice: "0.0058", editions: 48 },
  { id: 7, image: "/art/art7.png", creator: "mandala.subframe.eth", name: "Sacred Geometry", mintPrice: "0.0074", editions: 64 },
  { id: 8, image: "/art/art8.png", creator: "synth.subframe.eth", name: "Synthwave Horizon", mintPrice: "0.0033", editions: 23 },
];

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    linked: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    active: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono ${c[status] ?? c.pending}`}>
      {status}
    </span>
  );
}

function openProfile(name: string) {
  window.open(`https://subframe.eth.limo/${name}`, "_blank", "noopener,noreferrer");
}

export default function Explore() {
  const { data: subdomains, isLoading } = useListSubdomains();
  const [view, setView] = useState<"identities" | "art">("identities");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "linked" | "active" | "pending">("all");
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const filtered = (subdomains ?? []).filter((s: Subdomain) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.ensFullName.includes(q) ||
      s.walletAddress.toLowerCase().includes(q) ||
      (s.bio ?? "").toLowerCase().includes(q);
    const matchFilter = filter === "all" || s.status === filter;
    return matchSearch && matchFilter;
  });

  const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="flex-1 flex flex-col bg-[#0C0C0C] overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex flex-1 min-h-0 gap-0">

        {/* LEFT: full-height map */}
        <div className={`${view === "identities" ? "hidden lg:flex" : "hidden"} flex-col flex-1 min-w-0 p-5 pr-2.5`}>
          <SubframeNetworkMap
            subdomains={subdomains ?? []}
            currentName={highlighted ?? ""}
            onNodeClick={(name) => openProfile(name)}
          />
        </div>

        {/* RIGHT: list */}
        <div className="flex flex-col w-full lg:w-[400px] xl:w-[440px] shrink-0 border-l border-white/[0.05]">
          {/* Header + filters */}
          <div className="px-5 pt-5 pb-3 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-black text-white">Protocol Registry</h1>
                <p className="text-xs text-white/35 mt-0.5 font-mono">
                  {(subdomains ?? []).length} subdomains on-chain
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D] animate-pulse" />
                <span className="text-xs text-[#CBFF4D]/60 font-mono">Live</span>
              </div>
            </div>

            <div className="flex gap-1.5 mb-3">
              {(["identities", "art"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${
                    view === v
                      ? "bg-[#CBFF4D]/12 border-[#CBFF4D]/30 text-[#CBFF4D]"
                      : "border-white/8 text-white/35 hover:text-white/60 hover:bg-white/5"
                  }`}
                >
                  {v === "art" ? <Layers className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  {v}
                </button>
              ))}
            </div>

            {view === "identities" && (
            <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                data-testid="input-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, address, bio..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.04] text-white placeholder:text-white/20 focus:outline-none focus:border-[#CBFF4D]/40 focus:ring-1 focus:ring-[#CBFF4D]/15 text-sm transition-all"
              />
            </div>

            <div className="flex gap-1.5">
              {(["all", "linked", "active", "pending"] as const).map((f) => (
                <button
                  key={f}
                  data-testid={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${
                    filter === f
                      ? "bg-[#CBFF4D]/12 border-[#CBFF4D]/30 text-[#CBFF4D]"
                      : "border-white/8 text-white/35 hover:text-white/60 hover:bg-white/5"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            </>
            )}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
          {view === "art" && (
            <div className="p-4 grid grid-cols-2 gap-3">
              {MOCK_ART.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <ArtCard
                    image={item.image}
                    creator={item.creator}
                    name={item.name}
                    mintPrice={item.mintPrice}
                    editions={item.editions}
                  />
                </motion.div>
              ))}
            </div>
          )}
          {view === "identities" && (
            <>
            {isLoading && (
              <div className="flex items-center justify-center py-16 text-white/30 text-sm gap-2">
                <svg className="w-4 h-4 animate-spin text-[#CBFF4D]/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                </svg>
                Loading registry...
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-white/25 text-sm gap-2">
                <Search className="w-8 h-8 text-white/10" />
                No subdomains found
              </div>
            )}

            {filtered.map((s: Subdomain, i: number) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                data-testid={`explore-row-${s.id}`}
                className={`group flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04] last:border-0 cursor-pointer transition-all ${
                  highlighted === s.name
                    ? "bg-[#CBFF4D]/[0.06] border-l-2 border-l-[#CBFF4D]/50"
                    : "hover:bg-[#CBFF4D]/[0.03]"
                }`}
                onMouseEnter={() => setHighlighted(s.name)}
                onMouseLeave={() => setHighlighted(null)}
                onClick={() => openProfile(s.name)}
              >
                <div className="w-9 h-9 rounded-xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center text-xs font-black text-[#CBFF4D] shrink-0">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono font-bold text-white/90 text-sm group-hover:text-[#CBFF4D] transition-colors truncate">
                    {s.ensFullName}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-white/25">{short(s.walletAddress)}</span>
                    {s.bio && (
                      <span className="text-xs text-white/25 truncate max-w-[120px]">{s.bio}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={s.status} />
                  <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-[#CBFF4D]/60 transition-colors" />
                </div>
              </motion.div>
            ))}
            </>
          )}
          </div>

          {view === "identities" && (
          <div className="px-5 py-2.5 border-t border-white/[0.05] shrink-0">
            <p className="text-xs text-white/20 font-mono text-right">
              {filtered.length} of {subdomains?.length ?? 0} shown
            </p>
          </div>
          )}
        </div>

      </div>
    </div>
  );
}
