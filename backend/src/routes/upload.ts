import { Router } from "express";
import { uploadAvatarToIPFS } from "../lib/ipfs";

const router = Router();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BASE64_LEN = 4 * 1024 * 1024; // ~3MB file

router.post("/upload/avatar", async (req, res) => {
  const { imageBase64, mimeType } = req.body ?? {};

  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }
  if (!mimeType || !ALLOWED_TYPES.includes(mimeType)) {
    res.status(400).json({ error: "mimeType must be jpeg, png, webp, or gif" });
    return;
  }
  if (imageBase64.length > MAX_BASE64_LEN) {
    res.status(400).json({ error: "Image too large (max 3MB)" });
    return;
  }

  const url = await uploadAvatarToIPFS(imageBase64, mimeType);
  if (!url) {
    res.status(500).json({ error: "Failed to upload image to IPFS" });
    return;
  }

  res.json({ url });
});

export default router;
