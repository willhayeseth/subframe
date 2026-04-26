import { useState, useRef, useLayoutEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Move } from "lucide-react";
import type { Subdomain } from "@workspace/api-client-react";
import { ipfsImg } from "@/lib/ipfs-url";

const CANVAS_W = 900;
const CANVAS_H = 700;
const SPREAD_W = 580;
const SPREAD_H = 440;

function nameToPos(name: string): { x: number; y: number } {
  let h1 = 5381, h2 = 9876;
  for (const c of name) {
    h1 = ((h1 << 5) + h1 + c.charCodeAt(0)) | 0;
    h2 = ((h2 << 3) + h2 ^ c.charCodeAt(0)) | 0;
  }
  return {
    x: (Math.abs(h1) % SPREAD_W) + (CANVAS_W - SPREAD_W) / 2,
    y: (Math.abs(h2) % SPREAD_H) + (CANVAS_H - SPREAD_H) / 2,
  };
}

interface SubframeNetworkMapProps {
  subdomains: Subdomain[];
  currentName?: string;
  onNodeClick?: (name: string) => void;
}

export function SubframeNetworkMap({ subdomains, currentName = "", onNodeClick }: SubframeNetworkMapProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const applyTransform = (x: number, y: number) => {
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  };

  const clampPan = (x: number, y: number, cw: number, ch: number) => ({
    x: Math.min(0, Math.max(cw - CANVAS_W, x)),
    y: Math.min(0, Math.max(ch - CANVAS_H, y)),
  });

  const clamp = (x: number, y: number) => {
    const el = outerRef.current;
    if (!el) return { x, y };
    return clampPan(x, y, el.clientWidth, el.clientHeight);
  };

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    let tx: number, ty: number;
    const cur = subdomains.find((s) => s.name === currentName);
    if (cur) {
      const pos = nameToPos(cur.name);
      tx = Math.round(cw / 2 - pos.x);
      ty = Math.round(ch / 2 - pos.y);
    } else {
      tx = Math.round((cw - CANVAS_W) / 2);
      ty = Math.round((ch - CANVAS_H) / 2);
    }
    const clamped = clampPan(tx, ty, cw, ch);
    panRef.current = clamped;
    applyTransform(clamped.x, clamped.y);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentName, subdomains.length]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y };
    didDrag.current = false;
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.mx;
    const dy = e.clientY - dragState.current.my;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag.current = true;
    if (!didDrag.current) return;
    const { x, y } = clamp(dragState.current.px + dx, dragState.current.py + dy);
    panRef.current = { x, y };
    applyTransform(x, y);
  };

  const onMouseUp = () => {
    dragState.current = null;
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/[0.06] bg-[#080808] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center justify-between shrink-0">
        <div>
          <div className="text-sm font-bold text-white/80">Subframe Network</div>
          <div className="text-xs text-white/25 mt-0.5 font-mono">
            {subdomains.length} identit{subdomains.length === 1 ? "y" : "ies"} on-chain
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-white/20 text-xs font-mono select-none">
            <Move className="w-3 h-3" />
            drag
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D] animate-pulse" />
            <span className="text-xs text-[#CBFF4D]/60 font-mono">Live</span>
          </div>
        </div>
      </div>

      <div
        ref={outerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          backgroundImage: `
            linear-gradient(rgba(203,255,77,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(203,255,77,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(203,255,77,0.04),transparent_70%)] pointer-events-none z-10" />

        {subdomains.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/15 text-sm font-mono z-10">
            No identities yet
          </div>
        )}

        <div
          ref={canvasRef}
          className="absolute top-0 left-0"
          style={{ width: CANVAS_W, height: CANVAS_H, willChange: "transform" }}
        >
          {subdomains.map((s, idx) => {
            const pos = nameToPos(s.name);
            const isCurrent = s.name === currentName;
            const isLinked = s.status === "linked";
            const size = isCurrent ? 72 : 44 + (s.name.length % 3) * 8;

            const bubbleContent = (
              <motion.div
                className={`w-full h-full rounded-full overflow-hidden flex flex-col items-center justify-center border transition-all duration-200
                  ${isCurrent
                    ? "border-[#CBFF4D] shadow-[0_0_24px_rgba(203,255,77,0.35)]"
                    : hovered === idx
                      ? "border-[#CBFF4D]/50 shadow-[0_0_16px_rgba(203,255,77,0.18)]"
                      : isLinked
                        ? "border-[#CBFF4D]/20 shadow-[0_0_8px_rgba(203,255,77,0.05)]"
                        : "border-white/8"
                  } ${s.avatarUrl ? "" : isCurrent ? "bg-[#CBFF4D]/10" : "bg-[#0e0e0e]"}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: hovered === idx ? 1.15 : 1 }}
                transition={{ delay: idx * 0.03, type: "spring", damping: 15 }}
              >
                {s.avatarUrl ? (
                  <img src={ipfsImg(s.avatarUrl)} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <span className={`font-black tracking-wider leading-none transition-colors
                      ${isCurrent ? "text-[#CBFF4D] text-[11px]" : hovered === idx ? "text-[#CBFF4D] text-[9px]" : "text-white/50 text-[9px]"}`}>
                      {s.name.slice(0, 3).toUpperCase()}
                    </span>
                    {(isCurrent || isLinked) && (
                      <span className={`w-1 h-1 rounded-full mt-0.5 ${isCurrent ? "bg-[#CBFF4D]" : "bg-[#CBFF4D]/40"}`} />
                    )}
                  </>
                )}
              </motion.div>
            );

            return (
              <div
                key={s.id}
                className="absolute"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: size,
                  height: size,
                  transform: "translate(-50%, -50%)",
                  zIndex: isCurrent ? 10 : hovered === idx ? 15 : 1,
                }}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
              >
                {onNodeClick ? (
                  <div
                    className="w-full h-full cursor-pointer"
                    onClick={() => { if (!didDrag.current) onNodeClick(s.name); }}
                  >
                    {bubbleContent}
                  </div>
                ) : (
                  <Link
                    href={`/profile/${s.name}`}
                    onClick={(e) => { if (didDrag.current) e.preventDefault(); }}
                  >
                    {bubbleContent}
                  </Link>
                )}

                <AnimatePresence>
                  {hovered === idx && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap px-2.5 py-1.5 rounded-lg border border-white/8 bg-[#0C0C0C]/98 backdrop-blur text-xs font-mono text-[#CBFF4D] pointer-events-none shadow-xl"
                      style={{ zIndex: 100 }}
                    >
                      {s.ensFullName}
                      {isCurrent && <span className="ml-1.5 text-[#CBFF4D]/50">you</span>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
