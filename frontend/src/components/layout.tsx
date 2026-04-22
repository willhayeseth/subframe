import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Menu, X, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
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

const navItems = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Registry" },
  { href: "/analyze", label: "AI Analyzer" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: allSubdomains } = useListSubdomains();

  const userSubdomain = isConnected && address
    ? allSubdomains?.find((s) => s.walletAddress.toLowerCase() === address.toLowerCase())
    : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setMobileOpen(false);
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
    <div className="min-h-screen bg-[#0C0C0C] text-white flex flex-col overflow-x-hidden selection:bg-[#CBFF4D]/30">
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
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
            <div className="hidden md:flex items-center gap-2">
              <a
                href="https://x.com/subframeeth"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
              >
                <XIcon className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/willhayeseth/subframe"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
              >
                <GitHubIcon className="w-4 h-4" />
              </a>
            </div>

            {userSubdomain ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href={`/profile/${userSubdomain.name}`}>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#CBFF4D]/30 text-[#CBFF4D] text-sm font-bold hover:bg-[#CBFF4D]/8 transition-all">
                    {userSubdomain.avatarUrl ? (
                      <img src={userSubdomain.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    {userSubdomain.name}.subframe.eth
                  </button>
                </Link>
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

            <button
              className="md:hidden w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/8 bg-[#0C0C0C]/98 backdrop-blur-2xl px-5 py-5 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors",
                  location === item.href ? "text-[#CBFF4D] bg-[#CBFF4D]/8" : "text-white/60 hover:text-white hover:bg-white/5"
                )}>
                  {item.label}
                </div>
              </Link>
            ))}
            {userSubdomain ? (
              <>
                <Link href={`/profile/${userSubdomain.name}`}>
                  <div className="px-4 py-3.5 rounded-xl text-sm font-semibold text-[#CBFF4D] bg-[#CBFF4D]/8 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {userSubdomain.name}.subframe.eth
                  </div>
                </Link>
                <button
                  onClick={() => { disconnect(); sessionStorage.removeItem("sf_connected"); setMobileOpen(false); }}
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-semibold text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </>
            ) : (
              <Link href="/claim">
                <button className="w-full mt-3 py-3.5 btn-lime rounded-full text-sm font-black">
                  Claim Free
                </button>
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col pt-[70px] relative z-0">
        {children}
      </main>

      <footer className="border-t border-white/6 py-12 px-5 bg-[#0C0C0C]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo-full-transparent.png"
              alt="Subframe Protocol"
              className="h-7 w-auto object-contain opacity-80"
            />
          </div>
          <div className="flex gap-6 text-sm text-white/30">
            <Link href="/explore"><span className="hover:text-white cursor-pointer transition-colors">Registry</span></Link>
            <Link href="/analyze"><span className="hover:text-white cursor-pointer transition-colors">AI Analyzer</span></Link>
            <Link href="/claim"><span className="hover:text-white cursor-pointer transition-colors">Claim</span></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
