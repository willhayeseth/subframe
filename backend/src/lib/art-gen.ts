import { eq, count } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, subdomainsTable, artVariationsTable } from "@workspace/db";
import { uploadAvatarToIPFS } from "./ipfs.js";

export const COLLECTION_SIZE = 69;

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

export interface StylePrompt {
  style: string;
  variation: string;
  categoryIndex: number;
  variationIndex: number;
}

export function buildPrompts(): StylePrompt[] {
  const all: StylePrompt[] = [];
  for (let c = 0; c < STYLE_CATEGORIES.length; c++) {
    for (let v = 0; v < STYLE_VARIATIONS.length; v++) {
      all.push({ style: STYLE_CATEGORIES[c], variation: STYLE_VARIATIONS[v], categoryIndex: c, variationIndex: v });
    }
  }
  return all.slice(0, COLLECTION_SIZE);
}

export async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/png";
  const mimeType = contentType.split(";")[0].trim();
  const buffer = Buffer.from(await res.arrayBuffer());
  return { base64: buffer.toString("base64"), mimeType };
}

export async function analyzeImageBase64(base64: string, mimeType: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 300,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" } },
        { type: "text", text: "Describe this character in 2 sentences: physical appearance, clothing, accessories, pose, background. Be concise and specific for image generation." },
      ],
    }],
  });
  return response.choices[0]?.message?.content ?? "stylized character with unique appearance and distinctive visual style";
}

export interface GenerateResult {
  ipfsUrl: string | null;
}

export async function runParallel(
  prompts: StylePrompt[],
  concurrency: number,
  cancelled: () => boolean,
  processor: (item: StylePrompt, idx: number) => Promise<GenerateResult>,
  onResult: (result: GenerateResult | null, item: StylePrompt, idx: number, completed: number) => void
): Promise<void> {
  let nextIdx = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (nextIdx < prompts.length) {
      if (cancelled()) return;
      const idx = nextIdx++;
      const item = prompts[idx];
      try {
        const result = await processor(item, idx);
        if (cancelled()) return;
        onResult(result, item, idx, ++completed);
      } catch {
        if (cancelled()) return;
        onResult(null, item, idx, ++completed);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
}

/**
 * Generate only the missing art variations for a subdomain.
 * Safe to call any time — skips already-generated indices, never creates duplicates.
 */
export async function generateMissingArtForSubdomain(
  subdomainId: number,
  subdomainName: string,
  avatarUrl: string,
  cancelled: () => boolean = () => false,
  onProgress?: (event: Record<string, unknown>) => void
): Promise<void> {
  const emit = (obj: Record<string, unknown>) => { onProgress?.(obj); };

  try {
    const existingRows = await db
      .select({ variationIndex: artVariationsTable.variationIndex })
      .from(artVariationsTable)
      .where(eq(artVariationsTable.subdomainId, subdomainId));

    const existingSet = new Set(existingRows.map(r => r.variationIndex));
    const allPrompts = buildPrompts();
    const missing = allPrompts.filter(p => !existingSet.has(p.categoryIndex * 10 + p.variationIndex));

    if (missing.length === 0) {
      emit({ type: "already_done", total: COLLECTION_SIZE });
      return;
    }

    emit({ type: "status", message: `Generating ${missing.length} missing variations...` });

    const { base64, mimeType } = await fetchImageAsBase64(avatarUrl);
    if (cancelled()) return;

    const characterDescription = await analyzeImageBase64(base64, mimeType);
    if (cancelled()) return;

    emit({ type: "analyzed", description: characterDescription });
    emit({ type: "started", total: missing.length, missing: missing.length });

    let doneCount = 0;

    await runParallel(
      missing,
      3,
      cancelled,
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

        const ipfsUrl = await uploadAvatarToIPFS(b64, "image/png");

        await db.insert(artVariationsTable).values({
          subdomainId,
          variationIndex: item.categoryIndex * 10 + item.variationIndex,
          style: item.style,
          variation: item.variation,
          imageUrl: ipfsUrl,
          ipfsCid: ipfsUrl ? ipfsUrl.split("/ipfs/")[1] ?? null : null,
        });

        return { ipfsUrl };
      },
      (result, item, _idx, comp) => {
        doneCount = comp;
        emit({
          type: "image",
          index: comp,
          total: missing.length,
          imageUrl: result?.ipfsUrl ?? null,
          style: item.style,
          variation: item.variation,
          error: result?.ipfsUrl ? undefined : "Generation failed",
        });
      }
    );

    if (!cancelled()) {
      emit({ type: "complete", total: missing.length, totalCost: Math.round(doneCount * 0.011 * 1000) / 1000 });
    }
  } catch (err) {
    emit({ type: "error", message: err instanceof Error ? err.message : "Generation failed" });
    console.error(`[ART-GEN] fill-missing failed for ${subdomainName}:`, err);
  }
}

/**
 * Generate 69 art variations for a subdomain in the background.
 * Fire-and-forget safe: catches all errors internally.
 * onProgress is optional — used by SSE streaming route.
 */
export async function generateArtForSubdomain(
  subdomainId: number,
  subdomainName: string,
  avatarUrl: string,
  cancelled: () => boolean = () => false,
  onProgress?: (event: Record<string, unknown>) => void
): Promise<void> {
  const emit = (obj: Record<string, unknown>) => { onProgress?.(obj); };

  try {
    // Skip if already fully generated
    const [{ value: existing }] = await db.select({ value: count() }).from(artVariationsTable).where(eq(artVariationsTable.subdomainId, subdomainId));
    if (Number(existing) >= COLLECTION_SIZE) {
      emit({ type: "already_done", total: COLLECTION_SIZE });
      return;
    }

    emit({ type: "status", message: "Analyzing profile image..." });

    const { base64, mimeType } = await fetchImageAsBase64(avatarUrl);
    if (cancelled()) return;

    const characterDescription = await analyzeImageBase64(base64, mimeType);
    if (cancelled()) return;

    emit({ type: "analyzed", description: characterDescription });

    const prompts = buildPrompts();
    emit({ type: "started", total: prompts.length, costPerImage: 0.011 });

    let doneCount = 0;

    await runParallel(
      prompts,
      3,
      cancelled,
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

        const ipfsUrl = await uploadAvatarToIPFS(b64, "image/png");

        await db.insert(artVariationsTable).values({
          subdomainId,
          variationIndex: item.categoryIndex * 10 + item.variationIndex,
          style: item.style,
          variation: item.variation,
          imageUrl: ipfsUrl,
          ipfsCid: ipfsUrl ? ipfsUrl.split("/ipfs/")[1] ?? null : null,
        });

        return { ipfsUrl };
      },
      (result, item, _idx, comp) => {
        doneCount = comp;
        emit({
          type: "image",
          index: comp,
          total: prompts.length,
          imageUrl: result?.ipfsUrl ?? null,
          style: item.style,
          variation: item.variation,
          categoryIndex: item.categoryIndex,
          variationIndex: item.variationIndex,
          cost: 0.011,
          totalCost: Math.round(comp * 0.011 * 1000) / 1000,
          error: result?.ipfsUrl ? undefined : "Generation failed",
        });
      }
    );

    if (!cancelled()) {
      emit({ type: "complete", total: prompts.length, totalCost: Math.round(doneCount * 0.011 * 1000) / 1000 });
    }
  } catch (err) {
    emit({ type: "error", message: err instanceof Error ? err.message : "Generation failed" });
    console.error(`[ART-GEN] Failed for ${subdomainName}:`, err);
  }
}
