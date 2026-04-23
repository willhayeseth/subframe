import { Router } from "express";
import { uploadParentAppToIPFS } from "../lib/ipfs";
import { setParentContenthash } from "../lib/ens";
import { logger } from "../lib/logger";

const adminRouter = Router();

const ADMIN_SECRET = process.env["SESSION_SECRET"] ?? "";

adminRouter.post("/admin/deploy-parent", async (req, res) => {
  const key = req.headers["x-admin-key"];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    logger.info("[ADMIN] Starting parent IPFS re-deploy...");
    const cid = await uploadParentAppToIPFS();
    if (!cid) {
      res.status(500).json({ error: "IPFS upload failed" });
      return;
    }
    logger.info(`[ADMIN] Uploaded to IPFS: ${cid}`);

    const tx = await setParentContenthash(cid);
    if (!tx) {
      res.status(500).json({ error: "ENS contenthash update failed", cid });
      return;
    }

    logger.info(`[ADMIN] ENS contenthash updated. TX: ${tx}, CID: ${cid}`);
    res.json({ ok: true, cid, tx });
  } catch (err) {
    logger.error({ err }, "[ADMIN] deploy-parent failed");
    res.status(500).json({ error: String(err) });
  }
});

export default adminRouter;
