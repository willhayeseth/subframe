import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, ExternalLink, Grid3X3, List } from "lucide-react";
import { useListSubdomains } from "@workspace/api-client-react";
import type { Subdomain } from "@workspace/api-client-react";

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    linked: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    active: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-mono ${c[status] ?? c.pending}`}>
      {status}
    </span>
  );
}

function GridCard({ subdomain }: { subdomain: Subdomain }) {
  const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  return (
    <Link href={`/profile/${subdomain.name}`}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="group p-5 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-[#CBFF4D]/25 hover:bg-[#CBFF4D]/[0.03] transition-all cursor-pointer overflow-hidden relative"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-11 h-11 rounded-xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center text-xs font-black text-[#CBFF4D]">
            {subdomain.name.slice(0, 2).toUpperCase()}
          </div>
          <StatusBadge status={subdomain.status} />
        </div>
        <div className="font-mono font-bold text-white/90 text-sm group-hover:text-[#CBFF4D] transition-colors truncate">
          {subdomain.ensFullName}
        </div>
        <div className="font-mono text-xs text-white/30 mt-1 truncate">{short(subdomain.walletAddress)}</div>
        {subdomain.bio && (
          <p className="text-xs text-white/35 mt-2 line-clamp-2 leading-relaxed">{subdomain.bio}</p>
        )}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-white/25">{new Date(subdomain.claimedAt).toLocaleDateString()}</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#CBFF4D]/20 group-hover:text-[#CBFF4D]/60 transition-colors" />
        </div>
      </motion.div>
    </Link>
  );
}

function ListRow({ subdomain }: { subdomain: Subdomain }) {
  const short = (a: string) => `${a.slice(0, 8)}...${a.slice(-6)}`;
  return (
    <Link href={`/profile/${subdomain.name}`}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        data-testid={`explore-row-${subdomain.id}`}
        className="group flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-[#CBFF4D]/[0.03] transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center text-xs font-black text-[#CBFF4D] shrink-0">
          {subdomain.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono font-bold text-white/90 text-sm group-hover:text-[#CBFF4D] transition-colors truncate">
            {subdomain.ensFullName}
          </div>
          {subdomain.bio && <div className="text-xs text-white/30 truncate mt-0.5">{subdomain.bio}</div>}
        </div>
        <div className="hidden sm:flex items-center gap-5 shrink-0">
          <span className="font-mono text-xs text-white/25">{short(subdomain.walletAddress)}</span>
          <StatusBadge status={subdomain.status} />
          <span className="text-xs text-white/25 w-20 text-right">{new Date(subdomain.claimedAt).toLocaleDateString()}</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#CBFF4D]/20 group-hover:text-[#CBFF4D]/60 transition-colors" />
        </div>
      </motion.div>
    </Link>
  );
}

export default function Explore() {
  const { data: subdomains, isLoading } = useListSubdomains();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "linked" | "active" | "pending">("all");
  const [view, setView] = useState<"grid" | "list">("list");

  const filtered = (subdomains ?? []).filter((s: Subdomain) => {
    const q = search.toLowerCase();
    const matchSearch = s.ensFullName.includes(q) || s.walletAddress.toLowerCase().includes(q) || (s.bio ?? "").toLowerCase().includes(q);
    const matchFilter = filter === "all" || s.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex-1 px-5 py-16 bg-[#0C0C0C]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#CBFF4D]/30 bg-[#CBFF4D]/8 text-[#CBFF4D] text-xs font-black uppercase tracking-widest mb-5">
            <Grid3X3 className="w-3.5 h-3.5" />
            ENS Registry
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Protocol{" "}
            <span className="text-[#CBFF4D]">Registry</span>
          </h1>
          <p className="mt-3 text-white/45">
            All registered subdomains on Subframe Protocol
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              data-testid="input-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, address or bio..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/8 bg-white/[0.04] text-white placeholder:text-white/20 focus:outline-none focus:border-[#CBFF4D]/40 focus:ring-1 focus:ring-[#CBFF4D]/15 text-sm transition-all"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "linked", "active", "pending"] as const).map((f) => (
              <button
                key={f}
                data-testid={`filter-${f}`}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                  filter === f
                    ? "bg-[#CBFF4D]/12 border-[#CBFF4D]/30 text-[#CBFF4D]"
                    : "border-white/8 text-white/35 hover:text-white/60 hover:bg-white/5"
                }`}
              >
                {f}
              </button>
            ))}
            <div className="flex border border-white/8 rounded-xl overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={`px-3 py-3 transition-colors ${view === "list" ? "bg-[#CBFF4D]/12 text-[#CBFF4D]" : "text-white/30 hover:text-white/60"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={`px-3 py-3 transition-colors ${view === "grid" ? "bg-[#CBFF4D]/12 text-[#CBFF4D]" : "text-white/30 hover:text-white/60"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.015] overflow-hidden">
          {view === "list" && (
            <div className="hidden sm:flex items-center px-5 py-3 border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-white/25 uppercase tracking-wider">
              <div className="flex-1">Name</div>
              <div className="flex items-center gap-5 shrink-0">
                <div className="w-36 text-left">Wallet</div>
                <div className="w-16">Status</div>
                <div className="w-20 text-right">Claimed</div>
                <div className="w-4" />
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-20 text-white/30 text-sm">
              <Loader2Icon className="w-5 h-5 animate-spin mr-2 text-[#CBFF4D]/50" />
              Loading registry...
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-white/30 text-sm">
              <Search className="w-10 h-10 text-white/10 mb-3" />
              No subdomains found
            </div>
          )}

          {view === "list" && filtered.map((s) => <ListRow key={s.id} subdomain={s} />)}

          {view === "grid" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {filtered.map((s) => <GridCard key={s.id} subdomain={s} />)}
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-white/25 text-right font-mono">
          {filtered.length} of {subdomains?.length ?? 0} subdomains
        </div>
      </div>
    </div>
  );
}

function Loader2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
    </svg>
  );
}
