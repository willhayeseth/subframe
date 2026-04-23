import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, X, ChevronRight, Menu, BookOpen, Zap, AtSign,
  Fuel, User, Database, Globe, BarChart2, MessageSquare,
  Code2, FileCode, Webhook, Twitter, Send, Inbox,
  ThumbsUp, ThumbsDown, Minus, Hash, ExternalLink,
  Image as ImageIcon, Layers, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocPage {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  badge?: string;
  children?: DocPage[];
}

export const DOC_SECTIONS: { title: string; pages: DocPage[] }[] = [
  {
    title: "GET STARTED",
    pages: [
      { id: "overview", path: "/docs", label: "Overview", icon: BookOpen, section: "GET STARTED" },
      { id: "quickstart", path: "/docs/quickstart", label: "Quickstart", icon: Zap, section: "GET STARTED" },
      { id: "claim", path: "/docs/claim", label: "Claim Your Subdomain", icon: AtSign, section: "GET STARTED" },
      { id: "zero-gas", path: "/docs/zero-gas", label: "Zero Gas Claiming", icon: Fuel, section: "GET STARTED" },
    ],
  },
  {
    title: "YOUR SUBDOMAIN",
    pages: [
      { id: "profile", path: "/docs/profile", label: "Profile Page", icon: User, section: "YOUR SUBDOMAIN" },
      { id: "ens-records", path: "/docs/ens-records", label: "ENS Records", icon: Database, section: "YOUR SUBDOMAIN" },
      { id: "ipfs-hosting", path: "/docs/ipfs-hosting", label: "IPFS Hosting", icon: Globe, section: "YOUR SUBDOMAIN" },
      { id: "avatar", path: "/docs/avatar", label: "Avatar and Identity", icon: ImageIcon, section: "YOUR SUBDOMAIN" },
    ],
  },
  {
    title: "AI FEATURES",
    pages: [
      { id: "ai-wallet", path: "/docs/ai-wallet", label: "AI Wallet Analyzer", icon: BarChart2, section: "AI FEATURES" },
      { id: "ai-chat", path: "/docs/ai-chat", label: "On-chain AI Chat", icon: MessageSquare, section: "AI FEATURES" },
    ],
  },
  {
    title: "BOTS AND INTEGRATIONS",
    pages: [
      { id: "x-bot", path: "/docs/x-bot", label: "X Bot", icon: Twitter, section: "BOTS AND INTEGRATIONS", badge: "Soon" },
      { id: "telegram-bot", path: "/docs/telegram-bot", label: "Telegram Bot", icon: Send, section: "BOTS AND INTEGRATIONS", badge: "Soon" },
      { id: "messaging", path: "/docs/messaging", label: "Messaging Integrations", icon: Inbox, section: "BOTS AND INTEGRATIONS", badge: "Soon" },
    ],
  },
  {
    title: "ART PROTOCOL",
    pages: [
      { id: "art-protocol", path: "/docs/art-protocol", label: "Art Protocol", icon: Layers, section: "ART PROTOCOL" },
      { id: "art-trading", path: "/docs/art-trading", label: "Trading and Fees", icon: BarChart2, section: "ART PROTOCOL" },
    ],
  },
  {
    title: "DEVELOPERS",
    pages: [
      { id: "api-reference", path: "/docs/api", label: "API Reference", icon: Code2, section: "DEVELOPERS" },
      { id: "ens-api", path: "/docs/ens-api", label: "ENS Records API", icon: FileCode, section: "DEVELOPERS" },
      { id: "webhooks", path: "/docs/webhooks", label: "Webhooks", icon: Webhook, section: "DEVELOPERS" },
      { id: "rate-limits", path: "/docs/rate-limits", label: "Rate Limits", icon: Shield, section: "DEVELOPERS" },
    ],
  },
];

const ALL_PAGES = DOC_SECTIONS.flatMap((s) => s.pages);

const TOP_TABS = [
  { label: "Documentation", path: "/docs" },
  { label: "Guides", path: "/docs/guides" },
  { label: "API", path: "/docs/api" },
  { label: "Changelog", path: "/docs/changelog" },
];

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results = query.length > 1
    ? ALL_PAGES.filter((p) =>
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        p.section.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="relative w-full max-w-[560px] mx-4 rounded-xl border border-white/10 overflow-hidden shadow-2xl"
        style={{ background: "#161616" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search className="w-4 h-4 text-white/35 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="flex-1 bg-transparent text-white/90 text-sm placeholder:text-white/30 outline-none"
          />
          <button onClick={onClose}>
            <X className="w-4 h-4 text-white/35 hover:text-white/60 transition-colors" />
          </button>
        </div>
        {results.length > 0 ? (
          <div className="py-2 max-h-80 overflow-y-auto">
            {results.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                  onClick={() => { navigate(r.path); onClose(); }}
                >
                  <Icon className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-white/80">{r.label}</div>
                    <div className="text-xs text-white/30 mt-0.5">{r.section}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : query.length > 1 ? (
          <div className="px-4 py-8 text-center text-sm text-white/30">
            No results for "{query}"
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-white/25">
            Type to search across all documentation
          </div>
        )}
      </div>
    </div>
  );
}

function Sidebar({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="py-6 px-3 overflow-y-auto h-full">
      {DOC_SECTIONS.map((section) => (
        <div key={section.title} className="mb-6">
          <div
            className="px-3 mb-1.5 text-[10.5px] font-semibold tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            {section.title}
          </div>
          {section.pages.map((page) => {
            const Icon = page.icon;
            const isActive = currentPath === page.path || (page.path === "/docs" && currentPath === "/docs");
            return (
              <Link
                key={page.id}
                href={page.path}
                onClick={onNavigate}
              >
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13.5px] transition-all cursor-pointer group relative",
                    isActive
                      ? "font-medium"
                      : "hover:bg-white/4"
                  )}
                  style={
                    isActive
                      ? { color: "#CBFF4D", background: "rgba(203,255,77,0.07)" }
                      : { color: "rgba(255,255,255,0.58)" }
                  }
                >
                  {isActive && (
                    <div
                      className="absolute left-0 top-1 bottom-1 w-[2.5px] rounded-full"
                      style={{ background: "#CBFF4D" }}
                    />
                  )}
                  <Icon
                    className="w-[15px] h-[15px] flex-shrink-0"
                    style={isActive ? { color: "#CBFF4D" } : { color: "rgba(255,255,255,0.35)" }}
                  />
                  <span className="flex-1">{page.label}</span>
                  {page.badge && (
                    <span
                      className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded tracking-wider uppercase"
                      style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
                    >
                      {page.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export interface DocSection {
  id: string;
  title: string;
}

interface RightPanelProps {
  sections: DocSection[];
  activeSection: string;
}

function RightPanel({ sections, activeSection }: RightPanelProps) {
  const [helpful, setHelpful] = useState<"yes" | "no" | "mid" | null>(null);

  return (
    <div className="py-6 px-4 sticky top-[113px]">
      {sections.length > 0 && (
        <div className="mb-8">
          <div
            className="text-[10.5px] font-semibold tracking-widest uppercase mb-3"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            On this page
          </div>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block text-[12.5px] py-1 transition-colors"
              style={
                activeSection === s.id
                  ? { color: "#CBFF4D" }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              {s.title}
            </a>
          ))}
        </div>
      )}
      <div>
        <div
          className="text-[11.5px] mb-3"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Was this helpful?
        </div>
        <div className="flex items-center gap-2">
          {(["yes", "mid", "no"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setHelpful(v)}
              className={cn(
                "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                helpful === v
                  ? "border-transparent"
                  : "border-white/10 hover:border-white/20"
              )}
              style={
                helpful === v
                  ? { background: "rgba(203,255,77,0.12)", borderColor: "rgba(203,255,77,0.3)" }
                  : { background: "rgba(255,255,255,0.04)" }
              }
            >
              {v === "yes" && <ThumbsUp className="w-3.5 h-3.5" style={{ color: helpful === v ? "#CBFF4D" : "rgba(255,255,255,0.4)" }} />}
              {v === "mid" && <Minus className="w-3.5 h-3.5" style={{ color: helpful === v ? "#CBFF4D" : "rgba(255,255,255,0.4)" }} />}
              {v === "no" && <ThumbsDown className="w-3.5 h-3.5" style={{ color: helpful === v ? "#CBFF4D" : "rgba(255,255,255,0.4)" }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DocsLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  rightSections?: DocSection[];
  activeSection?: string;
  breadcrumb?: string;
}

export function DocsLayout({
  children,
  currentPath,
  rightSections = [],
  activeSection = "",
  breadcrumb = "",
}: DocsLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentPath]);

  const isDocsTab = !currentPath.includes("/guides") && !currentPath.includes("/changelog");

  return (
    <div className="min-h-screen" style={{ background: "#0C0C0C", color: "rgba(255,255,255,0.85)" }}>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* Top header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{ background: "#0C0C0C", borderColor: "rgba(255,255,255,0.07)" }}
      >
        {/* Main navbar row */}
        <div className="flex items-center gap-4 px-5 h-[58px]">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo-full-transparent.png" alt="Subframe" className="h-7 w-auto" />
          </Link>

          <button
            className="flex-1 max-w-[440px] flex items-center gap-2.5 h-8 px-3 rounded-lg border text-left transition-all hover:border-white/15"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)" }}
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            <span className="flex-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Search docs...</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded border font-mono"
              style={{ color: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
            >
              Ctrl K
            </span>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <a
              href="https://github.com/willhayeseth/subframe"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 text-[12.5px] transition-colors"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link href="/claim">
              <button
                className="hidden md:flex items-center px-4 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all"
                style={{ background: "#CBFF4D", color: "#0C0C0C" }}
              >
                Get Subdomain
              </button>
            </Link>
            <button
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab nav row */}
        <div
          className="flex items-center gap-1 px-5 border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          {TOP_TABS.map((tab) => {
            const isActive = tab.path === "/docs"
              ? isDocsTab
              : currentPath.startsWith(tab.path);
            return (
              <Link key={tab.path} href={tab.path}>
                <div
                  className="flex items-center gap-1.5 px-3 py-2.5 text-[13px] transition-colors relative cursor-pointer"
                  style={{ color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.42)" }}
                >
                  {tab.label}
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                      style={{ background: "#CBFF4D" }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className="relative w-72 h-full overflow-y-auto"
            style={{ background: "#111111", borderRight: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <span className="text-sm font-medium text-white/70">Navigation</span>
              <button onClick={() => setMobileNavOpen(false)}>
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>
            <Sidebar currentPath={currentPath} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Body: sidebar + content + right panel */}
      <div className="flex pt-[113px] min-h-screen">
        {/* Left sidebar */}
        <aside
          className="hidden md:block fixed top-[113px] left-0 bottom-0 overflow-y-auto"
          style={{
            width: "256px",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            background: "#0e0e0e",
          }}
        >
          <Sidebar currentPath={currentPath} />
        </aside>

        {/* Main content */}
        <main
          className="flex-1 min-w-0 md:ml-[256px]"
          style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="max-w-[740px] mx-auto px-8 py-12">
            {breadcrumb && (
              <div
                className="text-[11px] font-semibold tracking-widest uppercase mb-5"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                {breadcrumb}
              </div>
            )}
            {children}
          </div>
        </main>

        {/* Right panel */}
        <div className="hidden xl:block flex-shrink-0" style={{ width: "208px" }}>
          <RightPanel sections={rightSections} activeSection={activeSection} />
        </div>
      </div>
    </div>
  );
}
