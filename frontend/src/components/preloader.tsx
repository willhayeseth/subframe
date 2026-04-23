import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const COLS = 10;
const ROWS = 10;
const TOTAL = COLS * ROWS;
const LOGO_APPEAR_DURATION = 0.5;
const BLOCKS_START_DELAY = 0.55;

function waveDelay(i: number, reverse = false): number {
  const idx = reverse ? TOTAL - 1 - i : i;
  const col = idx % COLS;
  const row = Math.floor(idx / COLS);
  return BLOCKS_START_DELAY + (col + row) * 0.035;
}

function waveDelayExit(i: number): number {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return (col + row) * 0.03;
}

interface PreloaderProps {
  onDone: () => void;
}

export function Preloader({ onDone }: PreloaderProps) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const exitCalled = useRef(false);

  const triggerExit = useCallback(() => {
    if (exitCalled.current) return;
    exitCalled.current = true;
    setExiting(true);
    const maxBlockDelay = waveDelayExit(TOTAL - 1) * 1000 + 180;
    setTimeout(() => onDone(), maxBlockDelay + 300);
  }, [onDone]);

  useEffect(() => {
    const startedAt = Date.now();
    const MIN_TIME = 2200;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_TIME - elapsed);
      setTimeout(triggerExit, wait);
    };

    setProgress(10);

    const vid = document.createElement("video");
    vid.preload = "auto";
    vid.muted = true;
    vid.playsInline = true;
    const onLoad = () => { setProgress(100); finish(); };
    vid.oncanplaythrough = onLoad;
    vid.onerror = onLoad;
    vid.src = "/subframe-hero.mp4";

    let pct = 10;
    const ticker = setInterval(() => {
      if (vid.buffered.length > 0 && vid.duration) {
        pct = Math.min(95, Math.round((vid.buffered.end(vid.buffered.length - 1) / vid.duration) * 100));
      } else {
        pct = Math.min(pct + 3, 85);
      }
      setProgress(pct);
    }, 150);

    const fallback = setTimeout(() => { clearInterval(ticker); finish(); }, 5500);

    return () => { clearInterval(ticker); clearTimeout(fallback); };
  }, [triggerExit]);

  const blockVariants = {
    hidden: { scale: 0, opacity: 0, borderRadius: "50%" },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      borderRadius: "3px",
      transition: { delay: waveDelay(i), duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    }),
    exit: (i: number) => ({
      scale: 0,
      opacity: 0,
      borderRadius: "50%",
      transition: { delay: waveDelayExit(TOTAL - 1 - i), duration: 0.15, ease: [0.7, 0, 0.84, 0] },
    }),
  };

  const logoVariants = {
    hidden: { scale: 0.6, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: LOGO_APPEAR_DURATION, ease: [0.16, 1, 0.3, 1] },
    },
    exit: {
      scale: 0.6,
      opacity: 0,
      transition: { delay: waveDelayExit(TOTAL - 1) + 0.1, duration: 0.25, ease: [0.7, 0, 0.84, 0] },
    },
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{ background: "#0C0C0C" }}
    >
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: "5px",
          width: "min(72vw, 320px)",
          aspectRatio: "1",
        }}
      >
        {Array.from({ length: TOTAL }).map((_, i) => (
          <motion.div
            key={i}
            custom={i}
            initial="hidden"
            animate={exiting ? "exit" : "visible"}
            variants={blockVariants}
            style={{ background: "#CBFF4D", width: "100%", aspectRatio: "1" }}
          />
        ))}

        <motion.div
          initial="hidden"
          animate={exiting ? "exit" : "visible"}
          variants={logoVariants}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <img
            src="/subframe-logomark.webp"
            alt="Subframe"
            style={{ width: "24%", height: "auto", objectFit: "contain", borderRadius: "50%" }}
          />
        </motion.div>
      </div>

      <div
        style={{
          marginTop: "20px",
          width: "min(72vw, 320px)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            height: "2px",
            background: "rgba(203,255,77,0.12)",
            borderRadius: "99px",
            overflow: "hidden",
          }}
        >
          <motion.div
            style={{ height: "100%", background: "#CBFF4D", borderRadius: "99px" }}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.25 }}
          />
        </div>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            color: "rgba(203,255,77,0.35)",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          Loading
        </span>
      </div>
    </div>
  );
}
