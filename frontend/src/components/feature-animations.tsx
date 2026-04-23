import ensMarket from "/subframe-ens-market.webp";
import aiWallet from "/subframe-ai-wallet.webp";
import aiChat   from "/subframe-ai-chat.webp";

const SHARED_STYLES = `
  @keyframes parallax-drift {
    0%, 100% { transform: scale(1.04) translate(0px, 0px); }
    33%  { transform: scale(1.06) translate(-6px, -4px); }
    66%  { transform: scale(1.05) translate(4px, -6px); }
  }
  @keyframes scanline-move {
    0%   { transform: translateY(-100%); opacity: 0; }
    8%   { opacity: 0.18; }
    92%  { opacity: 0.08; }
    100% { transform: translateY(200%); opacity: 0; }
  }
  @keyframes vignette-pulse {
    0%, 100% { opacity: 0.55; }
    50%       { opacity: 0.7; }
  }
  @keyframes glow-border {
    0%, 100% { box-shadow: 0 0 18px 2px rgba(203,255,77,0.08), inset 0 0 24px rgba(203,255,77,0.03); }
    50%       { box-shadow: 0 0 36px 6px rgba(203,255,77,0.18), inset 0 0 40px rgba(203,255,77,0.07); }
  }
  @keyframes float-particle {
    0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
    10%  { opacity: 0.7; }
    90%  { opacity: 0.2; }
    100% { transform: translateY(-80px) translateX(var(--px, 15px)); opacity: 0; }
  }
  @keyframes noise-shift {
    0%,100% { background-position: 0% 0%; }
    25%  { background-position: 100% 0%; }
    50%  { background-position: 100% 100%; }
    75%  { background-position: 0% 100%; }
  }
`;

const PARTICLES = [
  { left: "12%",  top: "70%", delay: 0,   dur: 5,   px: "8px" },
  { left: "28%",  top: "80%", delay: 1.2, dur: 6.5, px: "-12px" },
  { left: "45%",  top: "75%", delay: 2.5, dur: 4.8, px: "15px" },
  { left: "62%",  top: "82%", delay: 0.7, dur: 7,   px: "-8px" },
  { left: "78%",  top: "72%", delay: 3.1, dur: 5.5, px: "10px" },
  { left: "88%",  top: "78%", delay: 1.8, dur: 6,   px: "-14px" },
  { left: "5%",   top: "60%", delay: 4.0, dur: 5.2, px: "6px" },
  { left: "55%",  top: "65%", delay: 2.0, dur: 7.5, px: "-9px" },
];

function AnimCard({ img, alt, tint = "rgba(203,255,77,0.04)" }: {
  img: string; alt: string; tint?: string;
}) {
  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-2xl bg-black"
      style={{ animation: "glow-border 4s ease-in-out infinite" }}
    >
      <style>{SHARED_STYLES}</style>

      {/* Main image with slow parallax */}
      <img
        src={img}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ animation: "parallax-drift 14s ease-in-out infinite" }}
      />

      {/* Green tint overlay */}
      <div
        className="absolute inset-0"
        style={{ background: tint, mixBlendMode: "screen" }}
      />

      {/* Scanline effect */}
      <div
        className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#CBFF4D] to-transparent pointer-events-none"
        style={{ top: 0, animation: "scanline-move 5s linear infinite" }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.7) 100%)",
          animation: "vignette-pulse 6s ease-in-out infinite",
        }}
      />

      {/* Floating particles (dust) */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#CBFF4D] pointer-events-none"
          style={{
            left: p.left,
            top: p.top,
            ["--px" as string]: p.px,
            animation: `float-particle ${p.dur}s ease-in ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* Bottom fade to black */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}
      />

      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 h-8 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)" }}
      />
    </div>
  );
}

export function EnsMarketplaceAnim() {
  return <AnimCard img={ensMarket} alt="ENS marketplace with people" />;
}

export function EnsVideoAnim() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black">
      <video
        src="/subframe-ens-identity.mp4"
        autoPlay
        loop
        muted
        playsInline
        controlsList="nodownload"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}

export function AiWalletVideoAnim() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black">
      <video
        src="/subframe-ai-wallet.mp4"
        autoPlay
        loop
        muted
        playsInline
        controlsList="nodownload"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}

export function AiWalletAnim() {
  return <AnimCard img={aiWallet} alt="AI wallet analyzer" tint="rgba(203,255,77,0.06)" />;
}

export function AiChatAnim() {
  return <AnimCard img={aiChat} alt="AI on-chain chat" tint="rgba(203,255,77,0.04)" />;
}

export function AiChatVideoAnim() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black">
      <video
        src="/subframe-ai-chat.mp4"
        autoPlay
        loop
        muted
        playsInline
        controlsList="nodownload"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
