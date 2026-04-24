import { Router } from "express";
import { uploadParentAppToIPFS } from "../lib/ipfs";
import { setParentContenthash } from "../lib/ens";
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

export default adminRouter;
