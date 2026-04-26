import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ExternalLink } from "lucide-react";
import { useListSubdomains } from "@workspace/api-client-react";
import type { Subdomain } from "@workspace/api-client-react";
import { SubframeNetworkMap } from "../components/network-map";
import { ipfsImg } from "@/lib/ipfs-url";

function openProfile(name: string) {
  window.open(`https://subframe.eth.limo/${name}`, "_blank", "noopener,noreferrer");
}

export default function Explore() {
  const { data: subdomains, isLoading } = useListSubdomains();
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = "";
    };
  }, []);

  const filtered = (subdomains ?? []).filter((s: Subdomain) => {
    const q = search.toLowerCase();
    return (
      s.ensFullName.includes(q) ||
      s.walletAddress.toLowerCase().includes(q) ||
      (s.bio ?? "").toLowerCase().includes(q)
    );
  });

  const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="flex-1 flex flex-col bg-[#0C0C0C] overflow-hidden">
      <div className="flex flex-1 min-h-0 gap-0">

        {/* LEFT: full-height map — always visible on desktop */}
        <div className="hidden lg:flex flex-col flex-1 min-w-0 p-5 pr-2.5">
          <SubframeNetworkMap
            subdomains={subdomains ?? []}
            currentName={highlighted ?? ""}
            onNodeClick={(name) => openProfile(name)}
          />
        </div>

        {/* RIGHT: list */}
        <div className="flex flex-col w-full lg:w-[400px] xl:w-[440px] shrink-0 border-l border-white/[0.05] h-full overflow-hidden">
          {/* Header + search */}
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

            <div className="relative">
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
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto min-h-0">
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
                <div className="w-9 h-9 rounded-xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center text-xs font-black text-[#CBFF4D] shrink-0 overflow-hidden">
                  {s.avatarUrl ? (
                    <img
                      src={ipfsImg(s.avatarUrl)}
                      alt={s.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                        (e.currentTarget.parentElement as HTMLElement).textContent = s.name.slice(0, 2).toUpperCase();
                      }}
                    />
                  ) : (
                    s.name.slice(0, 2).toUpperCase()
                  )}
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
                <div className="shrink-0">
                  <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-[#CBFF4D]/60 transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="px-5 py-2.5 border-t border-white/[0.05] shrink-0">
            <p className="text-xs text-white/20 font-mono text-right">
              {filtered.length} of {subdomains?.length ?? 0} shown
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
