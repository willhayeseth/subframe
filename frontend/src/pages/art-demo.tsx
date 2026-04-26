import React, { useState, useRef, useCallback, useEffect } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "");

const STYLE_LABELS = [
  "Pixel Art",
  "Watercolor",
  "Oil Painting",
  "3D Render",
  "Anime / Manga",
  "Cyberpunk",
  "Sketch",
  "Stained Glass",
  "Low Poly",
  "Vaporwave",
];

const VARIATION_LABELS = [
  "Vibrant",
  "Earthy",
  "Dark",
  "Pastel",
  "High Contrast",
  "Golden Hour",
  "Cool Blue",
  "Neon",
  "Mono",
  "Rainbow",
];

const STYLE_COLORS: Record<number, string> = {
  0: "#ff6b35",
  1: "#74c7e8",
  2: "#f4a261",
  3: "#06ffd3",
  4: "#ff85a1",
  5: "#9d4edd",
  6: "#e0e0e0",
  7: "#f7b731",
  8: "#48bb78",
  9: "#ed64a6",
};

interface GeneratedImage {
  index: number;
  imageB64: string | null;
  style: string;
  variation: string;
  categoryIndex: number;
  variationIndex: number;
  error?: string;
}

type GenStatus = "idle" | "analyzing" | "generating" | "complete" | "error";

export default function ArtDemo() {
  const [status, setStatus] = useState<GenStatus>("idle");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(69);
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [newImageIdx, setNewImageIdx] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const getStyleLabel = (categoryIndex: number, variationIndex: number) =>
    `${STYLE_LABELS[categoryIndex] ?? "?"} · ${VARIATION_LABELS[variationIndex] ?? "?"}`;

  const startGeneration = useCallback(async () => {
    if (status === "generating" || status === "analyzing") return;

    setImages([]);
    setProgress(0);
    setTotalCost(0);
    setDescription("");
    setErrorMsg("");
    setStatus("analyzing");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/api/art-demo/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const rawJson = line.slice(6).trim();
          if (!rawJson) continue;

          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(rawJson);
          } catch {
            continue;
          }

          if (evt.type === "status") {
            setStatus("analyzing");
          } else if (evt.type === "analyzed") {
            setDescription(String(evt.description ?? ""));
          } else if (evt.type === "started") {
            setStatus("generating");
            setTotal(Number(evt.total ?? 100));
          } else if (evt.type === "image") {
            const img: GeneratedImage = {
              index: Number(evt.index),
              imageB64: evt.imageB64 as string | null,
              style: String(evt.style ?? ""),
              variation: String(evt.variation ?? ""),
              categoryIndex: Number(evt.categoryIndex ?? 0),
              variationIndex: Number(evt.variationIndex ?? 0),
              error: evt.error as string | undefined,
            };
            setImages((prev) => [...prev, img]);
            setProgress(Number(evt.index ?? 0));
            setTotalCost(Number(evt.totalCost ?? 0));
            setNewImageIdx(img.index);
            setTimeout(() => setNewImageIdx(null), 800);
          } else if (evt.type === "complete") {
            setStatus("complete");
            setTotalCost(Number(evt.totalCost ?? 0));
          } else if (evt.type === "error") {
            setStatus("error");
            setErrorMsg(String(evt.message ?? "Unknown error"));
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Connection failed");
    }
  }, [status]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  const progressPct = total > 0 ? Math.round((progress / total) * 100) : 0;

  useEffect(() => {
    if (images.length > 0 && gridRef.current) {
      const lastCard = gridRef.current.lastElementChild;
      lastCard?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [images.length]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e0e0e0",
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        paddingBottom: "4rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #1a1a1a",
          padding: "2rem 2rem 1.5rem",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "2rem", flexWrap: "wrap" }}>
          {/* Source PFP */}
          <div style={{ flexShrink: 0 }}>
            <p style={{ color: "#555", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Source PFP
            </p>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                overflow: "hidden",
                border: "2px solid #06ffd3",
                boxShadow: "0 0 16px rgba(6,255,211,0.2)",
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}demo-pfp.png`}
                alt="Source PFP"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>

          {/* Title + Description */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1
              style={{
                fontSize: "1.8rem",
                fontWeight: 700,
                margin: 0,
                background: "linear-gradient(135deg, #06ffd3, #9d4edd)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Art Token · 69 Variations
            </h1>
            <p style={{ color: "#666", fontSize: "0.875rem", margin: "0.4rem 0 0", lineHeight: 1.5 }}>
              Each buyer gets 1 of 69 unique AI-generated artworks. 10 styles x 10 color variations, first 69 of 100.
            </p>
            {description && (
              <p
                style={{
                  color: "#888",
                  fontSize: "0.8rem",
                  fontStyle: "italic",
                  margin: "0.5rem 0 0",
                  padding: "0.5rem 0.75rem",
                  background: "#111",
                  borderRadius: 6,
                  border: "1px solid #222",
                  maxWidth: 600,
                }}
              >
                "{description}"
              </p>
            )}
          </div>

          {/* CTA + Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-end" }}>
            {/* Cost Badge */}
            <div
              style={{
                background: "#111",
                border: "1px solid #333",
                borderRadius: 10,
                padding: "0.6rem 1rem",
                textAlign: "right",
              }}
            >
              <div style={{ fontSize: "0.65rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                API Cost
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: totalCost > 0 ? "#06ffd3" : "#555" }}>
                ${totalCost.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#444" }}>
                {progress}/{total} × $0.011
              </div>
            </div>

            {/* Button */}
            {status === "idle" || status === "complete" || status === "error" ? (
              <button
                onClick={startGeneration}
                style={{
                  background: "linear-gradient(135deg, #06ffd3, #048a6e)",
                  color: "#000",
                  border: "none",
                  borderRadius: 10,
                  padding: "0.75rem 1.5rem",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(6,255,211,0.3)",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {status === "complete"
                  ? "↺ Regenerate All"
                  : status === "error"
                    ? "↺ Retry"
                    : "⚡ Generate 69 Variations"}
              </button>
            ) : (
              <button
                onClick={stopGeneration}
                style={{
                  background: "transparent",
                  color: "#ff4444",
                  border: "1px solid #ff4444",
                  borderRadius: 10,
                  padding: "0.75rem 1.5rem",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ✕ Stop
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {(status === "generating" || status === "analyzing" || status === "complete") && (
          <div style={{ marginTop: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.4rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "#666" }}>
                {status === "analyzing"
                  ? "🔍 Analyzing PFP..."
                  : status === "complete"
                    ? "✅ Complete!"
                    : `⚡ Generating ${progress}/${total}...`}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#444" }}>{progressPct}%</span>
            </div>
            <div
              style={{
                height: 4,
                background: "#1a1a1a",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${status === "analyzing" ? 5 : progressPct}%`,
                  background:
                    status === "complete"
                      ? "#06ffd3"
                      : "linear-gradient(90deg, #06ffd3, #9d4edd)",
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                  boxShadow: "0 0 8px rgba(6,255,211,0.5)",
                }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && errorMsg && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              background: "#1a0000",
              border: "1px solid #440000",
              borderRadius: 8,
              color: "#ff6666",
              fontSize: "0.875rem",
            }}
          >
            Error: {errorMsg}
          </div>
        )}
      </div>

      {/* Style Legend */}
      <div
        style={{
          maxWidth: 1200,
          margin: "1rem auto 0",
          padding: "0 2rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {STYLE_LABELS.map((label, i) => (
          <span
            key={i}
            style={{
              fontSize: "0.7rem",
              padding: "0.2rem 0.6rem",
              borderRadius: 4,
              background: `${STYLE_COLORS[i]}18`,
              border: `1px solid ${STYLE_COLORS[i]}44`,
              color: STYLE_COLORS[i],
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Empty state */}
      {images.length === 0 && status === "idle" && (
        <div
          style={{
            maxWidth: 1200,
            margin: "4rem auto",
            padding: "0 2rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎨</div>
          <p style={{ color: "#444", fontSize: "1rem" }}>
            Click "Generate 69 Variations" to start creating your art collection.
          </p>
          <p style={{ color: "#333", fontSize: "0.8rem", marginTop: "0.5rem" }}>
            This will generate 69 unique AI images at ~$0.76 total cost (69 × $0.011).
            Takes approximately 3–5 minutes.
          </p>
        </div>
      )}

      {/* Placeholder grid while generating (before first image) */}
      {images.length === 0 && (status === "generating" || status === "analyzing") && (
        <div
          style={{
            maxWidth: 1200,
            margin: "1.5rem auto 0",
            padding: "0 2rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {Array.from({ length: 69 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                background: "#111",
                borderRadius: 10,
                border: "1px solid #1a1a1a",
                animation: "pulse 2s ease-in-out infinite",
                animationDelay: `${(i % 10) * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div
          ref={gridRef}
          style={{
            maxWidth: 1200,
            margin: "1.5rem auto 0",
            padding: "0 2rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {images.map((img) => {
            const accentColor = STYLE_COLORS[img.categoryIndex] ?? "#06ffd3";
            const isNew = newImageIdx === img.index;

            return (
              <div
                key={img.index}
                style={{
                  position: "relative",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: `1px solid ${isNew ? accentColor : "#1e1e1e"}`,
                  boxShadow: isNew ? `0 0 16px ${accentColor}66` : "none",
                  transition: "border-color 0.6s, box-shadow 0.6s",
                  background: "#111",
                  aspectRatio: "1",
                  animation: "fadeInUp 0.4s ease forwards",
                }}
              >
                {img.imageB64 ? (
                  <img
                    src={`data:image/png;base64,${img.imageB64}`}
                    alt={`${img.style} ${img.variation}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#333",
                      fontSize: "1.5rem",
                    }}
                  >
                    ✕
                  </div>
                )}
                {/* Label overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "1.5rem 0.4rem 0.4rem",
                    background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      color: accentColor,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {STYLE_LABELS[img.categoryIndex]}
                  </div>
                  <div
                    style={{
                      fontSize: "0.55rem",
                      color: "#888",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {VARIATION_LABELS[img.variationIndex]}
                  </div>
                </div>
                {/* Number badge */}
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "rgba(0,0,0,0.7)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: "0.6rem",
                    color: "#555",
                    fontWeight: 700,
                  }}
                >
                  #{img.index}
                </div>
              </div>
            );
          })}

          {/* Remaining placeholders while still generating */}
          {status === "generating" &&
            Array.from({ length: Math.max(0, total - images.length) }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                style={{
                  aspectRatio: "1",
                  background: "#111",
                  borderRadius: 10,
                  border: "1px solid #1a1a1a",
                  animation: "pulse 2s ease-in-out infinite",
                  animationDelay: `${(i % 10) * 0.1}s`,
                }}
              />
            ))}
        </div>
      )}

      {/* Complete Summary */}
      {status === "complete" && (
        <div
          style={{
            maxWidth: 1200,
            margin: "2rem auto 0",
            padding: "0 2rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #001a14, #0d0d1a)",
              border: "1px solid #06ffd344",
              borderRadius: 12,
              padding: "1.5rem 2rem",
              display: "flex",
              gap: "3rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: "0.7rem", color: "#06ffd388", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Total Generated
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#06ffd3" }}>
                {images.filter((i) => i.imageB64).length} / {total}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#06ffd388", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Total API Cost
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#06ffd3" }}>
                ${totalCost.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#06ffd388", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Cost per NFT
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#06ffd3" }}>
                ${(totalCost / total).toFixed(3)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#06ffd388", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Variations
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#06ffd3" }}>69</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
