import { motion } from "framer-motion";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0C0C0C] px-6"
      style={{ fontFamily: "inherit" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        <div className="mb-6 w-16 h-16 rounded-2xl bg-[#CBFF4D]/8 border border-[#CBFF4D]/15 flex items-center justify-center">
          <img src="/logo-subframe.png" className="w-9 h-9 opacity-60" alt="Subframe" />
        </div>

        <p className="font-mono text-[#CBFF4D]/40 text-xs tracking-widest uppercase mb-3">404</p>

        <h1 className="text-2xl font-bold text-white/80 mb-3 leading-snug">
          This page doesn't exist
        </h1>
        <p className="text-sm text-white/30 leading-relaxed mb-8">
          The subdomain or page you're looking for hasn't been claimed yet, or the link might be wrong.
        </p>

        <div className="flex items-center gap-3">
          <Link href="/explore">
            <button className="px-5 py-2.5 rounded-full bg-[#CBFF4D] text-black text-sm font-semibold hover:bg-[#d9ff6e] transition-colors">
              Explore Profiles
            </button>
          </Link>
          <Link href="/">
            <button className="px-5 py-2.5 rounded-full border border-white/10 text-white/40 text-sm hover:border-white/20 hover:text-white/60 transition-colors">
              Go Home
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
