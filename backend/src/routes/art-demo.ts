import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// Strict limiter: max 2 full generation runs per hour per IP (~$0.76 each)
const artDemoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many generation requests. Please wait before generating again." },
});

// gpt-image-1 low quality: ~$0.011/image
const COST_PER_IMAGE = 0.011;
const COLLECTION_SIZE = 69;

const STYLE_CATEGORIES = [
  "pixel art 8-bit retro game sprite",
  "watercolor painting soft dreamy brushstrokes",
  "oil painting impressionist textured",
  "3D render Pixar animation CGI style",
  "anime manga Japanese illustration",
  "cyberpunk neon glow dark urban",
  "pencil sketch hand-drawn crosshatch",
  "stained glass mosaic geometric pattern",
  "low poly flat geometric triangles",
  "vaporwave retro aesthetic synthwave",
];

const STYLE_VARIATIONS = [
  "vibrant saturated colors bold palette",
  "muted earthy tones desaturated warm",
  "dark dramatic moody shadowy atmosphere",
  "pastel soft delicate color palette",
  "high contrast stark black and white accents",
  "golden hour warm orange glow sunset light",
  "cool blue tones icy crystalline",
  "neon electric fluorescent glowing",
  "monochromatic single hue tonal variation",
  "rainbow multicolor prismatic spectrum",
];

interface StylePrompt {
  style: string;
  variation: string;
  categoryIndex: number;
  variationIndex: number;
}

function buildPrompts(): StylePrompt[] {
  const prompts: StylePrompt[] = [];
  for (let c = 0; c < STYLE_CATEGORIES.length; c++) {
    for (let v = 0; v < STYLE_VARIATIONS.length; v++) {
      prompts.push({
        style: STYLE_CATEGORIES[c],
        variation: STYLE_VARIATIONS[v],
        categoryIndex: c,
        variationIndex: v,
      });
    }
  }
  return prompts.slice(0, COLLECTION_SIZE);
}

function findPfpPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "../../attached_assets/image_1777137198293.png"),
    path.resolve(process.cwd(), "attached_assets/image_1777137198293.png"),
    "/home/runner/workspace/attached_assets/image_1777137198293.png",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("PFP source image not found.");
}

async function analyzeImage(imagePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64}`, detail: "low" },
          },
          {
            type: "text",
            text: "Describe this character in 2 sentences: physical appearance, clothing, accessories, pose, background. Be concise and specific for image generation.",
          },
        ],
      },
    ],
  });

  return (
    response.choices[0]?.message?.content ??
    "hip-hop cartoon character, gold chain, boombox, graffiti wall background, street art style"
  );
}

async function processParallel<T, R>(
  items: T[],
  concurrency: number,
  shouldCancel: () => boolean,
  processor: (item: T) => Promise<R>,
  onResult: (result: R | null, item: T, idx: number, completed: number) => void
): Promise<void> {
  let nextIdx = 0;
  let completed = 0;

  async function runWorker(): Promise<void> {
    while (nextIdx < items.length) {
      if (shouldCancel()) return;
      const idx = nextIdx++;
      const item = items[idx];
      try {
        const result = await processor(item);
        if (shouldCancel()) return;
        completed++;
        onResult(result, item, idx, completed);
      } catch {
        if (shouldCancel()) return;
        completed++;
        onResult(null, item, idx, completed);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker)
  );
}

// POST to avoid side-effectful GET semantics on a billing-heavy operation
router.post("/art-demo/generate", artDemoLimiter, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Disable TCP nagle buffering so data reaches client immediately
  if (req.socket) {
    req.socket.setNoDelay(true);
    req.socket.setTimeout(0);
  }

  res.flushHeaders();

  // Server-side cancellation: stop generation when client disconnects
  let cancelled = false;
  req.on("close", () => {
    cancelled = true;
  });

  const send = (obj: Record<string, unknown>) => {
    if (!res.writableEnded && !cancelled) {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    }
  };

  // Send keepalive comments every 5s to prevent proxy timeout
  const keepAlive = setInterval(() => {
    if (!res.writableEnded && !cancelled) {
      res.write(": ping\n\n");
    }
  }, 5000);

  const cleanup = () => clearInterval(keepAlive);

  try {
    send({ type: "status", message: "Analyzing PFP image..." });

    const pfpPath = findPfpPath();
    const characterDescription = await analyzeImage(pfpPath);

    if (cancelled) { cleanup(); res.end(); return; }

    send({ type: "analyzed", description: characterDescription });

    const prompts = buildPrompts();
    const total = prompts.length;

    send({ type: "started", total, costPerImage: COST_PER_IMAGE });

    await processParallel(
      prompts,
      3,
      () => cancelled,
      async (item) => {
        const prompt = `${item.style} art, ${item.variation}: ${characterDescription}. Clean composition, no text, no watermarks, high quality character art.`;
        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt,
          size: "1024x1024",
          quality: "low",
        });
        const b64 = (response.data ?? [])[0]?.b64_json ?? "";
        if (!b64) throw new Error("Empty image response");
        return b64;
      },
      (imageB64, item, _idx, completed) => {
        const totalCost = Math.round(completed * COST_PER_IMAGE * 1000) / 1000;
        send({
          type: "image",
          index: completed,
          total,
          imageB64: imageB64 ?? null,
          style: item.style,
          variation: item.variation,
          categoryIndex: item.categoryIndex,
          variationIndex: item.variationIndex,
          cost: COST_PER_IMAGE,
          totalCost,
          error: imageB64 === null ? "Generation failed" : undefined,
        });
      }
    );

    if (!cancelled) {
      send({
        type: "complete",
        total,
        totalCost: Math.round(total * COST_PER_IMAGE * 1000) / 1000,
      });
    }
  } catch (err) {
    send({
      type: "error",
      message: err instanceof Error ? err.message : "Generation failed",
    });
  } finally {
    cleanup();
  }

  res.end();
});

export default router;
