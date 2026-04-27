#!/usr/bin/env node
// Pin frontend dist/ to Pinata IPFS, then ask Replit backend to update ENS.
// ENS_PRIVATE_KEY NEVER touches GitHub — it stays only in Replit.
//
// GitHub Secrets needed: PINATA_JWT, ADMIN_SECRET
// Replit env vars needed: ENS_PRIVATE_KEY (already set)
//
// Run from repo root: node artifacts/subframe/scripts/pin-to-ipfs.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist/public");
const JWT = process.env.PINATA_JWT;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const API_URL = process.env.API_URL ?? "https://subframe.network";

if (!JWT) { console.error("PINATA_JWT not set"); process.exit(1); }

// ── Walk dist/ ────────────────────────────────────────────────────────────────

function walk(dir, base = dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full, base));
    else result.push({ full, rel: path.relative(base, full) });
  }
  return result;
}

// ── Pin to IPFS ───────────────────────────────────────────────────────────────

const files = walk(DIST);
console.log(`[IPFS] Pinning ${files.length} files to Pinata...`);

const form = new FormData();
for (const { full, rel } of files) {
  const buf = fs.readFileSync(full);
  form.append("file", new Blob([buf]), rel);
}
// SPA fallback: eth.limo / IPFS gateways honour _redirects to serve index.html for any path
form.append("file", new Blob(["/* /index.html 200\n"], { type: "text/plain" }), "_redirects");
form.append("pinataMetadata", JSON.stringify({ name: `subframe-frontend-${Date.now()}` }));
form.append("pinataOptions", JSON.stringify({ cidVersion: 1, wrapWithDirectory: false }));

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
    console.error(`[IPFS] Attempt ${attempt} failed:`, JSON.stringify(data).slice(0, 200));
  } catch (err) {
    console.error(`[IPFS] Attempt ${attempt} error:`, err.message);
  }
  if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
}

if (!cid) { console.error("[IPFS] All pin attempts failed"); process.exit(1); }
console.log(`[IPFS] Pinned! CID: ${cid}`);
console.log(`[IPFS] Gateway: https://ipfs.io/ipfs/${cid}`);

// ── Tell Replit backend to update ENS ─────────────────────────────────────────
// ENS_PRIVATE_KEY stays in Replit — CI never sees it.

if (!ADMIN_SECRET) {
  console.warn("[ENS] ADMIN_SECRET not set — skipping ENS update");
  console.warn(`[ENS] To update manually: POST ${API_URL}/api/admin/update-ens { cid: "${cid}" }`);
  process.exit(0);
}

console.log(`[ENS] Asking Replit backend to update subframe.eth → ${cid}`);
let ensOk = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const ensRes = await fetch(`${API_URL}/api/admin/update-ens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_SECRET,
      },
      body: JSON.stringify({ cid }),
    });
    const data = await ensRes.json();
    if (ensRes.ok && data.ok) {
      console.log(`[ENS] ✅ subframe.eth updated. TX: ${data.tx}`);
      console.log(`[ENS] eth.limo will propagate within ~5-10 minutes.`);
      ensOk = true;
      break;
    }
    console.error(`[ENS] Attempt ${attempt} failed:`, JSON.stringify(data).slice(0, 200));
  } catch (err) {
    console.error(`[ENS] Attempt ${attempt} error:`, err.message);
  }
  if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
}

if (!ensOk) {
  console.error(`[ENS] ENS update failed — CID was pinned: ${cid}`);
  console.error(`[ENS] Manual fix: POST ${API_URL}/api/admin/update-ens { cid: "${cid}" }`);
  process.exit(1);
}

console.log(`\n[DONE] CID: ${cid}`);
