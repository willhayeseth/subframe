#!/usr/bin/env node
// Pin frontend dist/ to Pinata IPFS and call backend to update ENS contenthash.
// Run from repo root: node frontend/scripts/pin-to-ipfs.mjs
// Env: PINATA_JWT, BACKEND_URL, ADMIN_SECRET

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist/public");
const JWT = process.env.PINATA_JWT;
const BACKEND_URL = process.env.BACKEND_URL ?? "https://subframedev.replit.app";
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!JWT) { console.error("PINATA_JWT not set"); process.exit(1); }
if (!ADMIN_SECRET) { console.error("ADMIN_SECRET not set"); process.exit(1); }

function walk(dir, base = dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full, base));
    else result.push({ full, rel: path.relative(base, full) });
  }
  return result;
}

const files = walk(DIST);
console.log(`[IPFS] Pinning ${files.length} files to Pinata...`);

const form = new FormData();
for (const { full, rel } of files) {
  const buf = fs.readFileSync(full);
  form.append("file", new Blob([buf]), `subframe/${rel}`);
}
form.append("pinataMetadata", JSON.stringify({ name: `subframe-frontend-${Date.now()}` }));
form.append("pinataOptions", JSON.stringify({ cidVersion: 0, wrapWithDirectory: false }));

let cid;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const pinRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${JWT}` },
      body: form,
    });
    const data = await pinRes.json();
    if (data.IpfsHash) { cid = data.IpfsHash; break; }
    console.error(`[IPFS] Attempt ${attempt} failed:`, JSON.stringify(data).slice(0, 120));
  } catch (err) {
    console.error(`[IPFS] Attempt ${attempt} error:`, err.message);
  }
  if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
}

if (!cid) { console.error("[IPFS] All pin attempts failed"); process.exit(1); }
console.log(`[IPFS] Pinned! CID: ${cid}`);

console.log(`[ENS] Calling backend to update subframe.eth contenthash...`);
const ensRes = await fetch(`${BACKEND_URL}/api/admin/update-ens`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_SECRET },
  body: JSON.stringify({ cid }),
});
const ensData = await ensRes.json();
if (!ensRes.ok || !ensData.ok) {
  console.error("[ENS] Backend update failed:", JSON.stringify(ensData));
  process.exit(1);
}
console.log(`[ENS] Done! TX: ${ensData.tx}`);
console.log(`\nsubframe.eth now points to ${cid}`);
