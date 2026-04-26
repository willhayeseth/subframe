#!/usr/bin/env node
// Pin frontend dist/ to Pinata IPFS and update ENS contenthash directly via viem.
// Run from repo root: node artifacts/subframe/scripts/pin-to-ipfs.mjs
// Env: PINATA_JWT, ENS_PRIVATE_KEY (optional — skips ENS if missing)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPublicClient, createWalletClient, http, namehash } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { CID } from "multiformats/cid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist/public");
const JWT = process.env.PINATA_JWT;
const RAW_ENS_KEY = process.env.ENS_PRIVATE_KEY;

if (!JWT) { console.error("PINATA_JWT not set"); process.exit(1); }

// ── ENS constants ────────────────────────────────────────────────────────────
const ENS_REGISTRY    = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";
const PARENT_NODE     = namehash("subframe.eth");

const ENS_REGISTRY_ABI = [
  {
    name: "resolver",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "setResolver",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "resolver", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

const RESOLVER_ABI = [
  {
    name: "setContenthash",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "hash", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

function cidToContentHash(cidStr) {
  const cid = CID.parse(cidStr);
  const cidV1Bytes = cid.toV1().bytes;
  const bytes = new Uint8Array([0xe3, 0x01, ...cidV1Bytes]);
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

async function updateENS(cid) {
  if (!RAW_ENS_KEY) {
    console.warn("[ENS] ENS_PRIVATE_KEY not set — skipping ENS update");
    console.warn(`[ENS] CID pinned: ${cid} — update ENS manually if needed`);
    return;
  }

  const privateKey = RAW_ENS_KEY.startsWith("0x") ? RAW_ENS_KEY : `0x${RAW_ENS_KEY}`;
  const account = privateKeyToAccount(privateKey);

  const RPCS = [
    "https://eth.drpc.org",
    "https://ethereum.publicnode.com",
    "https://rpc.ankr.com/eth",
  ];

  let publicClient, walletClient;
  for (const rpc of RPCS) {
    try {
      const transport = http(rpc);
      publicClient  = createPublicClient({ chain: mainnet, transport });
      walletClient  = createWalletClient({ account, chain: mainnet, transport });
      const chainId = await publicClient.getChainId();
      if (chainId === 1) {
        console.log(`[ENS] Connected via ${rpc}`);
        break;
      }
    } catch {
      console.warn(`[ENS] RPC ${rpc} failed, trying next...`);
    }
  }

  if (!publicClient) {
    console.warn("[ENS] All RPCs failed — skipping ENS update");
    return;
  }

  const feeData = await publicClient.estimateFeesPerGas();
  const maxPriorityFeePerGas = BigInt(2_000_000_000);
  const maxFeePerGas = (feeData.maxFeePerGas ?? BigInt(10_000_000_000)) * 2n + maxPriorityFeePerGas;

  // Step 1: ensure resolver is set to PUBLIC_RESOLVER
  const currentResolver = await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: ENS_REGISTRY_ABI,
    functionName: "resolver",
    args: [PARENT_NODE],
  });

  if (currentResolver.toLowerCase() !== PUBLIC_RESOLVER.toLowerCase()) {
    console.log(`[ENS] Switching resolver to PUBLIC_RESOLVER...`);
    const tx1 = await walletClient.writeContract({
      address: ENS_REGISTRY,
      abi: ENS_REGISTRY_ABI,
      functionName: "setResolver",
      args: [PARENT_NODE, PUBLIC_RESOLVER],
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
    console.log(`[ENS] setResolver TX: ${tx1}`);
    await publicClient.waitForTransactionReceipt({ hash: tx1, timeout: 10 * 60 * 1000 });
    console.log(`[ENS] Resolver updated.`);
  } else {
    console.log(`[ENS] Resolver already PUBLIC_RESOLVER — skipping.`);
  }

  // Step 2: setContenthash
  const contenthash = cidToContentHash(cid);
  const feeData2 = await publicClient.estimateFeesPerGas();
  const mfpg2 = (feeData2.maxFeePerGas ?? BigInt(10_000_000_000)) * 2n + maxPriorityFeePerGas;

  console.log(`[ENS] Setting contenthash on subframe.eth → ${cid}`);
  const tx2 = await walletClient.writeContract({
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setContenthash",
    args: [PARENT_NODE, contenthash],
    maxFeePerGas: mfpg2,
    maxPriorityFeePerGas,
  });

  console.log(`[ENS] TX submitted: ${tx2}`);
  console.log(`[ENS] Etherscan: https://etherscan.io/tx/${tx2}`);
  await publicClient.waitForTransactionReceipt({ hash: tx2, timeout: 10 * 60 * 1000 });
  console.log(`[ENS] ✅ subframe.eth → ipfs://${cid}`);
  console.log(`[ENS] eth.limo will propagate within ~5-10 minutes.`);
}

// ── IPFS pin ─────────────────────────────────────────────────────────────────

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

// ── ENS update ───────────────────────────────────────────────────────────────
await updateENS(cid);

console.log(`\n[DONE] CID: ${cid}`);
