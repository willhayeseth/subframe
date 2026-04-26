import { Router } from "express";
import rateLimit from "express-rate-limit";
import { eq, count, and, isNotNull } from "drizzle-orm";
import { db, subdomainsTable, artVariationsTable } from "@workspace/db";
import { generateArtForSubdomain, generateMissingArtForSubdomain, COLLECTION_SIZE } from "../lib/art-gen.js";

const router = Router();

const artGenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many generation requests. Please wait before trying again." },
});

// GET /api/art/:subdomain - fetch stored variations
router.get("/art/:subdomain", async (req, res) => {
  try {
    const cleanName = (req.params.subdomain as string).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const [subdomain] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, cleanName)).limit(1);
    if (!subdomain) return res.status(404).json({ error: "Subdomain not found" });

    const variations = await db
      .select()
      .from(artVariationsTable)
      .where(eq(artVariationsTable.subdomainId, subdomain.id))
      .orderBy(artVariationsTable.variationIndex);

    return res.json({
      subdomain: {
        name: subdomain.name,
        ensFullName: subdomain.ensFullName,
        avatarUrl: subdomain.avatarUrl,
        tokenAddress: subdomain.tokenAddress,
        artTokenId: subdomain.artTokenId,
      },
      variations,
      total: variations.length,
      complete: variations.length >= COLLECTION_SIZE,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch art variations" });
  }
});

// POST /api/art/:subdomain/generate - SSE streaming art generation
router.post("/art/:subdomain/generate", artGenLimiter, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (req.socket) {
    req.socket.setNoDelay(true);
    req.socket.setTimeout(0);
  }

  res.flushHeaders();

  let isCancelled = false;
  req.on("close", () => { isCancelled = true; });

  const send = (obj: Record<string, unknown>) => {
    if (!res.writableEnded && !isCancelled) res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  const keepAlive = setInterval(() => {
    if (!res.writableEnded && !isCancelled) res.write(": ping\n\n");
  }, 5000);

  try {
    const cleanName = (req.params.subdomain as string).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const [subdomain] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, cleanName)).limit(1);
    if (!subdomain) { send({ type: "error", message: "Subdomain not found" }); return; }

    if (!subdomain.avatarUrl) {
      send({ type: "error", message: "No profile image found." });
      return;
    }

    await generateArtForSubdomain(
      subdomain.id,
      subdomain.name,
      subdomain.avatarUrl,
      () => isCancelled,
      send
    );
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : "Generation failed" });
  } finally {
    clearInterval(keepAlive);
  }

  res.end();
});

// POST /api/art/admin/generate-all - trigger art generation for all users missing art
router.post("/art/admin/generate-all", async (req, res) => {
  const adminSecret = process.env.SESSION_SECRET;
  if (!adminSecret || req.headers["x-admin-secret"] !== adminSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const all = await db.select().from(subdomainsTable).where(isNotNull(subdomainsTable.avatarUrl));

    const results: { name: string; status: string }[] = [];

    for (const sub of all) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(artVariationsTable)
        .where(eq(artVariationsTable.subdomainId, sub.id));

      if (Number(total) >= COLLECTION_SIZE) {
        results.push({ name: sub.name, status: "already_complete" });
        continue;
      }

      if (!sub.avatarUrl) {
        results.push({ name: sub.name, status: "no_avatar" });
        continue;
      }

      results.push({ name: sub.name, status: "queued" });

      generateArtForSubdomain(sub.id, sub.name, sub.avatarUrl, () => false, () => {}).catch((err) => {
        console.error(`Art gen failed for ${sub.name}:`, err);
      });
    }

    return res.json({ queued: results.filter(r => r.status === "queued").length, results });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

// POST /api/art/admin/fill-missing - generate only missing variations for all incomplete users
router.post("/art/admin/fill-missing", async (req, res) => {
  const adminSecret = process.env.SESSION_SECRET;
  if (!adminSecret || req.headers["x-admin-secret"] !== adminSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const all = await db.select().from(subdomainsTable).where(isNotNull(subdomainsTable.avatarUrl));
    const results: { name: string; status: string; missing?: number }[] = [];

    for (const sub of all) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(artVariationsTable)
        .where(eq(artVariationsTable.subdomainId, sub.id));

      const current = Number(total);

      if (current >= COLLECTION_SIZE) {
        results.push({ name: sub.name, status: "already_complete" });
        continue;
      }

      if (!sub.avatarUrl) {
        results.push({ name: sub.name, status: "no_avatar" });
        continue;
      }

      const missing = COLLECTION_SIZE - current;
      results.push({ name: sub.name, status: "queued", missing });

      generateMissingArtForSubdomain(sub.id, sub.name, sub.avatarUrl, () => false, (evt) => {
        if (evt.type === "complete" || evt.type === "error") {
          console.log(`[fill-missing] ${sub.name}:`, evt);
        }
      }).catch((err) => {
        console.error(`[fill-missing] failed for ${sub.name}:`, err);
      });
    }

    return res.json({
      queued: results.filter(r => r.status === "queued").length,
      already_complete: results.filter(r => r.status === "already_complete").length,
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

export default router;
