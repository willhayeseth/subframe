import { Router } from "express";
import { eq } from "drizzle-orm";
import { uploadProfileToIPFS, uploadParentAppToIPFS } from "../lib/ipfs";
import { setParentContenthash, fixContenthash } from "../lib/ens";
import { db, subdomainsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const adminRouter = Router();

const ADMIN_SECRET = process.env["SESSION_SECRET"] ?? "";

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const key = req.headers["x-admin-key"];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// Full re-deploy: upload to IPFS from Replit + update ENS
adminRouter.post("/admin/deploy-parent", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    logger.info("[ADMIN] Starting parent IPFS re-deploy...");
    const cid = await uploadParentAppToIPFS();
    if (!cid) { res.status(500).json({ error: "IPFS upload failed" }); return; }
    logger.info(`[ADMIN] Uploaded to IPFS: ${cid}`);
    const tx = await setParentContenthash(cid);
    if (!tx) { res.status(500).json({ error: "ENS contenthash update failed", cid }); return; }
    logger.info(`[ADMIN] ENS contenthash updated. TX: ${tx}, CID: ${cid}`);
    res.json({ ok: true, cid, tx });
  } catch (err) {
    logger.error({ err }, "[ADMIN] deploy-parent failed");
    res.status(500).json({ error: String(err) });
  }
});

// Called by GitHub CI after pinning to IPFS — only updates ENS, no upload needed
// Secrets stay in Replit; GitHub only sends the CID
adminRouter.post("/admin/update-ens", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const { cid } = req.body as { cid?: string };
  if (!cid || typeof cid !== "string") {
    res.status(400).json({ error: "cid required" });
    return;
  }
  try {
    logger.info(`[ADMIN] Updating ENS contenthash for subframe.eth → ${cid}`);
    const tx = await setParentContenthash(cid);
    if (!tx) { res.status(500).json({ error: "ENS update failed" }); return; }
    logger.info(`[ADMIN] ENS updated. TX: ${tx}`);
    res.json({ ok: true, cid, tx });
  } catch (err) {
    logger.error({ err }, "[ADMIN] update-ens failed");
    res.status(500).json({ error: String(err) });
  }
});

// Bulk re-upload all subdomain profiles to IPFS with latest template + update ENS contenthash
// Processes one at a time to avoid rate limits; responds immediately, runs in background
adminRouter.post("/admin/reupload-all-profiles", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const subs = await db.select().from(subdomainsTable);
    const eligible = subs.filter((s) => s.walletAddress && s.status !== "pending");
    logger.info(`[ADMIN] reupload-all-profiles: ${eligible.length} subdomains queued`);
    res.json({ ok: true, queued: eligible.length, names: eligible.map((s) => s.name) });

    (async () => {
      let ok = 0, failed = 0;
      for (const sub of eligible) {
        try {
          const newCid = await uploadProfileToIPFS({
            name: sub.name,
            ensFullName: sub.ensFullName,
            walletAddress: sub.walletAddress,
            bio: sub.bio ?? null,
            avatarUrl: sub.avatarUrl ?? null,
            claimedAt: sub.claimedAt.toISOString(),
            platform: "subframe.eth",
            version: "1.0",
          });
          if (!newCid) { logger.warn(`[ADMIN] IPFS upload failed for ${sub.name}`); failed++; continue; }

          await db.update(subdomainsTable)
            .set({ ipfsCid: newCid, updatedAt: new Date() })
            .where(eq(subdomainsTable.name, sub.name));

          const txHash = await fixContenthash(sub.name, newCid);
          if (txHash) {
            await db.update(subdomainsTable)
              .set({ ensTx2Hash: txHash, updatedAt: new Date() })
              .where(eq(subdomainsTable.name, sub.name));
            logger.info(`[ADMIN] ${sub.name}: CID=${newCid} tx=${txHash}`);
          } else {
            logger.warn(`[ADMIN] ${sub.name}: IPFS ok (${newCid}) but ENS tx failed`);
          }
          ok++;
        } catch (err) {
          logger.error({ err }, `[ADMIN] reupload failed for ${sub.name}`);
          failed++;
        }
        // Small delay between subdomains to avoid nonce/gas issues
        await new Promise((r) => setTimeout(r, 4000));
      }
      logger.info(`[ADMIN] reupload-all-profiles done: ok=${ok} failed=${failed}`);
    })().catch((err) => logger.error({ err }, "[ADMIN] reupload-all-profiles background error"));
  } catch (err) {
    logger.error({ err }, "[ADMIN] reupload-all-profiles failed");
    res.status(500).json({ error: String(err) });
  }
});

export default adminRouter;
