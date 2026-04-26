import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, X, LogOut, User, MessageSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ipfsImg } from "@/lib/ipfs-url";
import { useAccount, useDisconnect } from "wagmi";
import { useListSubdomains } from "@workspace/api-client-react";

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.726-8.83L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

const navItems: { href: string; label: string }[] = [];

const SOCIAL_LINKS = [
  { href: "https://x.com/subframeeth", icon: XIcon, label: "X (Twitter)" },
  { href: "https://github.com/willhayeseth/subframe", icon: GitHubIcon, label: "GitHub" },
  { href: "https://t.me/subframeeth", icon: TelegramIcon, label: "Telegram" },
];

const FOOTER_LINKS = {
  Protocol: [
    { label: "Registry", href: "/explore" },
    { label: "Claim", href: "/claim" },
    { label: "Documentation", href: "/docs" },
  ],
  Community: [
    { label: "X / Twitter", href: "https://x.com/subframeeth", external: true },
    { label: "Telegram", href: "https://t.me/subframeeth", external: true },
    { label: "GitHub", href: "https://github.com/willhayeseth/subframe", external: true },
  ],
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const isFullscreen = location.startsWith("/explore");
  const [inboxOpen, setInboxOpen] = useState(false);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: allSubdomains } = useListSubdomains();

  const userSubdomain = isConnected && address
    ? allSubdomains?.find((s) => s.walletAddress.toLowerCase() === address.toLowerCase())
    : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isConnected && userSubdomain && location === "/claim") {
      navigate(`/profile/${userSubdomain.name}`);
    }
  }, [isConnected, userSubdomain?.name, location]);

  useEffect(() => {
    if (isConnected && address && allSubdomains && userSubdomain) {
      const prevConnected = sessionStorage.getItem("sf_connected");
      if (!prevConnected) {
        sessionStorage.setItem("sf_connected", address);
        navigate(`/profile/${userSubdomain.name}`);
      }
    }
    if (!isConnected) {
      sessionStorage.removeItem("sf_connected");
    }
  }, [isConnected, address, userSubdomain?.name, allSubdomains]);

  return (
    <div className={cn(
      "bg-[#0C0C0C] text-white flex flex-col selection:bg-[#CBFF4D]/30",
      isFullscreen ? "h-screen overflow-hidden" : "min-h-screen overflow-x-hidden"
    )}>
      {/* Inbox Coming Soon Modal */}
      <AnimatePresence>
        {inboxOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setInboxOpen(false)}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/30 to-transparent" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-[#CBFF4D]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Inbox</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#CBFF4D]/15 text-[#CBFF4D] border border-[#CBFF4D]/25 uppercase tracking-wider">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setInboxOpen(false)} className="text-white/30 hover:text-white transition-colors mt-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-white/40 leading-relaxed">
                  Receive on-chain encrypted messages from other Subframe users. Powered by XMTP, all messages are stored decentrally and visible only to you.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          location === "/" && "max-md:hidden",
          scrolled
            ? "bg-[#0C0C0C]/90 backdrop-blur-xl border-b border-white/6"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-[70px] flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <img
              src="/logo-full-transparent.png"
              alt="Subframe Protocol"
              className="h-9 w-auto object-contain group-hover:opacity-90 transition-opacity"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    isActive ? "text-[#CBFF4D]" : "text-white/50 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* Social icons — desktop only */}
            <div className="hidden md:flex items-center gap-2">
              {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            {/* Auth / claim button — desktop */}
            {userSubdomain ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href={`/profile/${userSubdomain.name}`}>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#CBFF4D]/30 text-[#CBFF4D] text-sm font-bold hover:bg-[#CBFF4D]/8 transition-all">
                    {userSubdomain.avatarUrl ? (
                      <img src={ipfsImg(userSubdomain.avatarUrl)} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    {userSubdomain.name}.subframe.eth
                  </button>
                </Link>
                <button
                  onClick={() => setInboxOpen(true)}
                  className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-[#CBFF4D] hover:border-[#CBFF4D]/30 transition-all"
                  title="Inbox"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { disconnect(); sessionStorage.removeItem("sf_connected"); }}
                  className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-400/30 transition-all"
                  title="Disconnect wallet"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/claim">
                <button className="hidden md:flex items-center gap-2 px-6 py-2.5 btn-lime rounded-full text-sm font-black">
                  Claim
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </Link>
            )}

            {/* Mobile: show profile button if connected, nothing (no hamburger) otherwise */}
            {userSubdomain ? (
              <Link href={`/profile/${userSubdomain.name}`} className="md:hidden">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#CBFF4D]/30 text-[#CBFF4D] text-sm font-bold">
                  {userSubdomain.avatarUrl ? (
                    <img src={ipfsImg(userSubdomain.avatarUrl)} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="max-w-[90px] truncate">{userSubdomain.name}</span>
                </button>
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className={cn(
        "flex-1 flex flex-col relative z-0",
        isFullscreen ? "overflow-hidden" : location === "/" ? "md:pt-[70px]" : "pt-[70px]"
      )}>
        {children}
      </main>

      {!isFullscreen && (
        <footer className="border-t border-white/8 bg-[#0C0C0C]">
          {/* Top section */}
          <div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">

              {/* Brand column */}
              <div className="md:col-span-2 flex flex-col gap-5">
                <img
                  src="/logo-full-transparent.png"
                  alt="Subframe Protocol"
                  className="h-8 w-auto object-contain self-start opacity-90"
                />
                <p className="text-sm text-white/35 leading-relaxed max-w-xs">
                  Permanent Web3 identity on Ethereum. Claim your <span className="font-mono text-white/55">name.subframe.eth</span> subdomain and go on-chain forever.
                </p>
                {/* Social icons — both mobile and desktop */}
                <div className="flex items-center gap-3 mt-1">
                  {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Link columns */}
              {Object.entries(FOOTER_LINKS).map(([title, links]) => (
                <div key={title} className="flex flex-col gap-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/25">{title}</h4>
                  <ul className="flex flex-col gap-3">
                    {links.map((link) => (
                      <li key={link.label}>
                        {"external" in link && link.external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-white/45 hover:text-white transition-colors flex items-center gap-1.5 group"
                          >
                            {link.label}
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </a>
                        ) : (
                          <Link href={link.href}>
                            <span className="text-sm text-white/45 hover:text-white transition-colors cursor-pointer">
                              {link.label}
                            </span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Partner / Powered-by logos */}
          <div className="border-t border-white/6">
            <div className="max-w-7xl mx-auto px-5 md:px-8 py-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/18 mb-5">
                Built on
              </p>
              <div className="flex flex-wrap items-center gap-6 md:flex-nowrap md:justify-between md:gap-0">
                {[
                  { src: "/logo-eth.png",     label: "Ethereum",  href: "https://ethereum.org", size: "w-10 h-10 md:w-16 md:h-16" },
                  { src: "/logo-ens.png",     label: "ENS",       href: "https://ens.domains",  size: "w-8 h-8 md:w-14 md:h-14" },
                  { src: "/logo-ipfs.png",    label: "IPFS",      href: "https://ipfs.tech",    size: "w-8 h-8 md:w-14 md:h-14" },
                  { src: "/logo-pinata.png",  label: "Pinata",    href: "https://pinata.cloud", size: "w-8 h-8 md:w-14 md:h-14" },
                  { src: "/logo-uniswap.png", label: "Uniswap",   href: "https://uniswap.org",  size: "w-8 h-8 md:w-14 md:h-14" },
                  { src: "/logo-openai.png",  label: "OpenAI",    href: "https://openai.com",   size: "w-11 h-11 md:w-20 md:h-20" },
                ].map(({ src, label, href, size }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 md:gap-4 group opacity-35 hover:opacity-75 transition-opacity"
                  >
                    <img
                      src={src}
                      alt={label}
                      className={`${size} object-contain grayscale group-hover:grayscale-0 transition-all`}
                    />
                    <span className="text-sm md:text-xl font-bold text-white/80 tracking-wide whitespace-nowrap">
                      {label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/6">
            <div className="max-w-7xl mx-auto px-5 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-white/20 font-mono">
                © {new Date().getFullYear()} Subframe Protocol. All rights reserved.
              </p>
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1.5 text-xs text-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D]/60 animate-pulse" />
                  Live on Ethereum Mainnet
                </span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
