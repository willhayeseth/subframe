import { Router } from "express";
import { eq } from "drizzle-orm";
import { privateKeyToAccount } from "viem/accounts";
import { uploadProfileToIPFS, uploadParentAppToIPFS, uploadArtMetadataFolder } from "../lib/ipfs";
import { setParentContenthash, fixContenthash, registerSubdomainOnChain, setNameForWallet, setContenthashForWallet } from "../lib/ens";
import { deployArtToken, buildTokenMeta, setTokenBaseUri, reseedTokenLiquidity } from "../lib/token.js";
import type { Address } from "viem";
import { db, subdomainsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const adminRouter = Router();

const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "";

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const key = req.headers["x-admin-key"];
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// In-memory seed job store
type SeedStatus = "pending" | "ipfs" | "ens" | "setname" | "done" | "error";
interface SeedWalletJob {
  name: string;
  address: string;
  status: SeedStatus;
  error?: string;
  ipfsCid?: string;
  ensTx?: string;
  setNameTx?: string;
}
interface SeedJob {
  id: string;
  startedAt: string;
  wallets: SeedWalletJob[];
  done: boolean;
}

const seedJobs = new Map<string, SeedJob>();

const SEED_AVATARS: Record<string, string> = {
  unicorn: "https://gateway.pinata.cloud/ipfs/QmevQLnTxgNHrwJprrMo5YNxBELo5RECkhWQeeH82qb42m",
  og:      "https://gateway.pinata.cloud/ipfs/QmVBofb5XU3KXuaYrfg1jJ4J81yQj9b7WDVUyyoDAdowMn",
  rachel:  "https://gateway.pinata.cloud/ipfs/QmZZxqGyvqeHVxykhKMgj6EAEksmwN7ph5npWZCYmckwa6",
  gonner:  "https://gateway.pinata.cloud/ipfs/QmV4QxxaKCVtEcSwjRbyKndxey4aeAxN7Me66nXHJpZFH4",
  will:    "https://gateway.pinata.cloud/ipfs/QmRx17cEmFZd3TNfXb9oV1pkcLgk2pAdfJff2f6Q7DzTGP",
  alien:   "https://gateway.pinata.cloud/ipfs/Qmf625x4ogaS5NiGgFzqCrWT79jXsY3akaC5fhSAcJJUHG",
  moon:    "https://gateway.pinata.cloud/ipfs/QmQ5onHPupNTa6fYCYe5AyWQdwfegA5dbgF3wYJQD2MBaa",
  test1:   "https://gateway.pinata.cloud/ipfs/QmQK5B9qLw6K1t5hELzUCMggjbQ3bsBpqUcJahg9Gf44SS",
  one:     "https://gateway.pinata.cloud/ipfs/QmXoC8VHoMRjdmZuVmz5XzA1KbXZG6SGGmRz3Yjx4ct224",
  my:      "https://gateway.pinata.cloud/ipfs/QmazANo6P5c9tNWjXh7iowMdF1pAkd8RSjmnRQwMyZiZGb",
  huang:   "https://gateway.pinata.cloud/ipfs/QmcAEGaUAkB6trM2KgT2qCR961huNnD4L4kqvuaHQ2vU4c",
  smith:   "https://gateway.pinata.cloud/ipfs/Qmcc6eYDEMXBpGf1GT3xzuN92vEw2LKLnGLPgyjfDGu5mn",
  weirdo:  "https://gateway.pinata.cloud/ipfs/QmVXeVUBV2NSq1EwbwjihAh8zKernCktV6BJ9QgrkkC3kV",
};

function getSeedWallets(): Array<{ name: string; privateKey: string; address: string }> {
  const wallets: Array<{ name: string; privateKey: string; address: string }> = [];
  for (const [key, val] of Object.entries(process.env)) {
    if (!key.startsWith("WALLET_") || !val) continue;
    const name = key.replace("WALLET_", "").toLowerCase();
    if (!val.startsWith("0x") || val.length !== 66) continue;
    try {
      const { address } = privateKeyToAccount(val as `0x${string}`);
      wallets.push({ name, privateKey: val, address });
    } catch { /* skip invalid keys */ }
  }
  return wallets;
}

// POST /admin/seed-wallets — start seeding all WALLET_* secrets
adminRouter.post("/admin/seed-wallets", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const wallets = getSeedWallets();
  if (wallets.length === 0) {
    res.status(400).json({ error: "No WALLET_* secrets found with valid private keys" });
    return;
  }

  const jobId = Date.now().toString();
  const job: SeedJob = {
    id: jobId,
    startedAt: new Date().toISOString(),
    done: false,
    wallets: wallets.map((w) => ({ name: w.name, address: w.address, status: "pending" })),
  };
  seedJobs.set(jobId, job);

  res.json({ ok: true, jobId, total: wallets.length, names: wallets.map((w) => w.name) });

  // Background processing — sequential to avoid nonce collisions
  (async () => {
    for (let i = 0; i < wallets.length; i++) {
      const w = wallets[i];
      const jobWallet = job.wallets[i];

      try {
        // Check if already registered
        const existing = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, w.name)).limit(1);

        let subdomain = existing[0] ?? null;
        let cid = subdomain?.ipfsCid ?? null;

        // If fully done (linked) — skip entirely
        if (subdomain?.status === "linked") {
          logger.info(`[SEED] ${w.name} already linked, skipping`);
          jobWallet.status = "done";
          jobWallet.ipfsCid = cid ?? undefined;
          continue;
        }

        const avatarUrl = SEED_AVATARS[w.name] ?? null;

        // Step 1: Upload IPFS profile (skip if already has CID)
        if (!cid) {
          jobWallet.status = "ipfs";
          logger.info(`[SEED] ${w.name}: uploading IPFS profile...`);
          cid = await uploadProfileToIPFS({
            name: w.name,
            ensFullName: `${w.name}.subframe.eth`,
            walletAddress: w.address,
            bio: null,
            avatarUrl,
            claimedAt: new Date().toISOString(),
            platform: "subframe.eth",
            version: "1.0",
          });
          if (!cid) throw new Error("IPFS upload returned no CID");
          logger.info(`[SEED] ${w.name}: IPFS CID = ${cid}`);
        }
        jobWallet.ipfsCid = cid;

        // Insert into DB if not exists, or update CID/avatar if missing
        if (!subdomain) {
          const [inserted] = await db
            .insert(subdomainsTable)
            .values({
              name: w.name,
              walletAddress: w.address,
              ensFullName: `${w.name}.subframe.eth`,
              bio: null,
              avatarUrl,
              ipfsCid: cid,
              status: "active",
            })
            .returning();
          subdomain = inserted;
        } else {
          await db.update(subdomainsTable).set({ ipfsCid: cid, avatarUrl, updatedAt: new Date() }).where(eq(subdomainsTable.name, w.name));
        }

        // Step 2: ENS registration (Tx1-4 using backend wallet)
        jobWallet.status = "ens";
        logger.info(`[SEED] ${w.name}: starting ENS registration...`);
        const ensResult = await registerSubdomainOnChain(
          w.name,
          w.address,
          cid,
          async (step, txHash) => {
            logger.info(`[SEED] ${w.name}: ENS step ${step} confirmed: ${txHash}`);
            if (step === 1) await db.update(subdomainsTable).set({ ensTx1Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.id, subdomain.id));
            else if (step === 2) await db.update(subdomainsTable).set({ ensTx2Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.id, subdomain.id));
            else if (step === 3) await db.update(subdomainsTable).set({ ensTx3Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.id, subdomain.id));
            else if (step === 4) {
              await db.update(subdomainsTable).set({ ensTx4Hash: txHash, status: "linked", updatedAt: new Date() }).where(eq(subdomainsTable.id, subdomain.id));
              jobWallet.ensTx = txHash;
            }
          }
        );
        if (!ensResult) throw new Error("ENS registration returned null");

        // Step 3: setName (primary ENS) using user wallet private key
        jobWallet.status = "setname";
        logger.info(`[SEED] ${w.name}: setting primary ENS name...`);
        const setNameTx = await setNameForWallet(w.name, w.privateKey);
        if (setNameTx) {
          jobWallet.setNameTx = setNameTx;
          logger.info(`[SEED] ${w.name}: setName TX = ${setNameTx}`);
        }

        jobWallet.status = "done";
        logger.info(`[SEED] ${w.name}: COMPLETE ✅`);

      } catch (err) {
        jobWallet.status = "error";
        jobWallet.error = String(err);
        logger.error({ err }, `[SEED] ${w.name}: FAILED`);
      }

      // Small delay between wallets
      await new Promise((r) => setTimeout(r, 3000));
    }

    job.done = true;
    const done = job.wallets.filter((w) => w.status === "done").length;
    const errors = job.wallets.filter((w) => w.status === "error").length;
    logger.info(`[SEED] All done: ${done} success, ${errors} errors`);
  })().catch((err) => logger.error({ err }, "[SEED] background error"));
});

// GET /admin/seed-status?jobId=xxx
adminRouter.get("/admin/seed-status", (req, res) => {
  if (!checkAuth(req, res)) return;
  const jobId = req.query["jobId"] as string;
  if (!jobId) {
    const all = Array.from(seedJobs.values()).map((j) => ({
      id: j.id, startedAt: j.startedAt, done: j.done,
      total: j.wallets.length,
      completed: j.wallets.filter((w) => w.status === "done").length,
      errors: j.wallets.filter((w) => w.status === "error").length,
    }));
    res.json(all);
    return;
  }
  const job = seedJobs.get(jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

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

// POST /admin/import-subdomain — copy a subdomain record from dev DB into prod DB
adminRouter.post("/admin/import-subdomain", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const d = req.body as Record<string, unknown>;
  if (!d.name || !d.walletAddress) {
    res.status(400).json({ error: "name and walletAddress required" });
    return;
  }
  try {
    const str = (v: unknown) => (typeof v === "string" && v ? v : null);
    const validTokenStatus = ["none","deploying","deployed","failed"] as const;
    const validStatus = ["pending","active","linked"] as const;
    await db.insert(subdomainsTable).values({
      name: d.name as string,
      walletAddress: d.walletAddress as string,
      ensFullName: str(d.ensFullName),
      ipfsCid: str(d.ipfsCid),
      avatarUrl: str(d.avatarUrl),
      bio: str(d.bio),
      status: validStatus.includes(d.status as never) ? d.status as "pending"|"active"|"linked" : "linked",
      ensTx1Hash: str(d.ensTx1Hash),
      ensTx2Hash: str(d.ensTx2Hash),
      ensTx3Hash: str(d.ensTx3Hash),
      ensTx4Hash: str(d.ensTx4Hash),
      tokenStatus: validTokenStatus.includes(d.tokenStatus as never) ? d.tokenStatus as "none"|"deploying"|"deployed"|"failed" : "none",
      tokenAddress: str(d.tokenAddress),
      tokenSymbol: str(d.tokenSymbol),
      tokenName: str(d.tokenName),
      tokenDeployTxHash: str(d.tokenDeployTxHash),
      uniswapPairAddress: str(d.uniswapPairAddress),
      uniswapLiquidityTxHash: str(d.uniswapLiquidityTxHash),
      artTokenId: str(d.artTokenId),
      artBaseUri: str(d.artBaseUri),
    }).onConflictDoNothing();
    res.json({ ok: true, name: d.name });
  } catch (err) {
    logger.error({ err }, "[ADMIN] import-subdomain failed");
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
        await new Promise((r) => setTimeout(r, 4000));
      }
      logger.info(`[ADMIN] reupload-all-profiles done: ok=${ok} failed=${failed}`);
    })().catch((err) => logger.error({ err }, "[ADMIN] reupload-all-profiles background error"));
  } catch (err) {
    logger.error({ err }, "[ADMIN] reupload-all-profiles failed");
    res.status(500).json({ error: String(err) });
  }
});

// Map of wallet name → env var name for user wallets
const WALLET_ENV_MAP: Record<string, string> = {
  unicorn: "WALLET_UNICORN",
  og:      "WALLET_OG",
  rachel:  "WALLET_RACHEL",
  gonner:  "WALLET_GONNER",
  will:    "WALLET_WILL",
  alien:   "WALLET_ALIEN",
  moon:    "WALLET_MOON",
  test1:   "WALLET_TEST1",
  one:     "WALLET_ONE",
  my:      "WALLET_MY",
  huang:   "WALLET_HUANG",
  smith:   "WALLET_SMITH",
  weirdo:  "WALLET_WEIRDO",
};

// POST /admin/fix-all-contenthash
// Re-uploads IPFS profiles with avatars and updates ENS contenthash via each user's own wallet private key.
// Responds immediately, runs in background.
adminRouter.post("/admin/fix-all-contenthash", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const subs = await db.select().from(subdomainsTable);
    const eligible = subs.filter((s) => s.status !== "pending" && WALLET_ENV_MAP[s.name]);
    logger.info(`[ADMIN] fix-all-contenthash: ${eligible.length} subdomains queued`);
    res.json({ ok: true, queued: eligible.length, names: eligible.map((s) => s.name) });

    (async () => {
      let ok = 0, failed = 0;
      for (const sub of eligible) {
        try {
          const walletEnvKey = WALLET_ENV_MAP[sub.name];
          const userPrivateKey = process.env[walletEnvKey];
          if (!userPrivateKey) {
            logger.warn(`[ADMIN] fix-contenthash: no private key for ${sub.name} (${walletEnvKey})`);
            failed++;
            continue;
          }

          // Re-upload IPFS profile with latest avatar + template
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
          if (!newCid) {
            logger.warn(`[ADMIN] fix-contenthash: IPFS upload failed for ${sub.name}`);
            failed++;
            continue;
          }

          // Update DB with new CID
          await db.update(subdomainsTable)
            .set({ ipfsCid: newCid, updatedAt: new Date() })
            .where(eq(subdomainsTable.name, sub.name));

          // Set contenthash on ENS using the subdomain owner's wallet
          const txHash = await setContenthashForWallet(sub.name, newCid, userPrivateKey);
          if (txHash) {
            await db.update(subdomainsTable)
              .set({ ensTx2Hash: txHash, updatedAt: new Date() })
              .where(eq(subdomainsTable.name, sub.name));
            logger.info(`[ADMIN] fix-contenthash: ${sub.name} ok — CID=${newCid} tx=${txHash}`);
            ok++;
          } else {
            logger.warn(`[ADMIN] fix-contenthash: ${sub.name} IPFS ok (${newCid}) but ENS tx failed`);
            failed++;
          }
        } catch (err) {
          logger.error({ err }, `[ADMIN] fix-contenthash failed for ${sub.name}`);
          failed++;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      logger.info(`[ADMIN] fix-all-contenthash done: ok=${ok} failed=${failed}`);
    })().catch((err) => logger.error({ err }, "[ADMIN] fix-all-contenthash background error"));
  } catch (err) {
    logger.error({ err }, "[ADMIN] fix-all-contenthash failed");
    res.status(500).json({ error: String(err) });
  }
});

// POST /admin/set-primary-names — set primary ENS name for 8 chosen seeded wallets
// Only does setName (reverse record) — skips IPFS/ENS registration
const PRIMARY_NAME_TARGETS = ["og", "alien", "unicorn", "rachel", "gonner", "will", "moon", "weirdo"];

adminRouter.post("/admin/set-primary-names", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const allWallets = getSeedWallets();
  const wallets = allWallets.filter((w) => PRIMARY_NAME_TARGETS.includes(w.name));

  if (wallets.length === 0) {
    res.status(400).json({ error: "No matching WALLET_* secrets found" });
    return;
  }

  const results: Array<{ name: string; address: string; status: string; tx?: string; error?: string }> = wallets.map(
    (w) => ({ name: w.name, address: w.address, status: "pending" })
  );

  res.json({ ok: true, total: wallets.length, note: "Running in background — check logs", wallets: results.map((r) => ({ name: r.name, address: r.address })) });

  (async () => {
    for (let i = 0; i < wallets.length; i++) {
      const w = wallets[i];
      const r = results[i];
      try {
        logger.info(`[SET-PRIMARY] ${w.name} (${w.address}): setting primary name...`);
        // setNameForWallet(subdomain_name, privateKey) — name only, function appends .subframe.eth
        const txHash = await setNameForWallet(w.name, w.privateKey);
        r.status = "done";
        r.tx = txHash ?? undefined;
        logger.info(`[SET-PRIMARY] ${w.name}: done — tx=${txHash}`);
      } catch (err: unknown) {
        r.status = "error";
        r.error = String(err);
        logger.error({ err }, `[SET-PRIMARY] ${w.name}: FAILED`);
      }
      if (i < wallets.length - 1) await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    logger.info(`[SET-PRIMARY] All done — ${JSON.stringify(results.map((r) => ({ n: r.name, s: r.status, tx: r.tx?.slice(0, 20) })))}`);
  })().catch((err) => logger.error({ err }, "[SET-PRIMARY] background error"));
});

// POST /admin/deploy-token/:name — retroactively deploy ERC-404 token for a single subdomain
adminRouter.post("/admin/deploy-token/:name", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const { name } = req.params;

  const rows = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, name));
  if (rows.length === 0) {
    res.status(404).json({ error: `Subdomain '${name}' not found` });
    return;
  }
  const sub = rows[0]!;

  if (sub.tokenStatus === "deployed") {
    res.json({ ok: true, already: true, tokenAddress: sub.tokenAddress, pairAddress: sub.uniswapPairAddress });
    return;
  }

  const { tokenName, tokenSymbol } = buildTokenMeta(name);
  logger.info(`[ADMIN] deploy-token: starting for ${name} (${sub.walletAddress})`);

  try {
    await db.update(subdomainsTable)
      .set({ tokenStatus: "deploying", tokenName, tokenSymbol, updatedAt: new Date() })
      .where(eq(subdomainsTable.id, sub.id));

    const result = await deployArtToken({
      subdomainName: name,
      creatorWallet:  sub.walletAddress as `0x${string}`,
      tokenName,
      tokenSymbol,
    });

    await db.update(subdomainsTable).set({
      tokenStatus:            "deployed",
      tokenAddress:           result.contractAddress,
      tokenDeployTxHash:      result.createTxHash,
      artTokenId:             result.artTokenId,
      uniswapPairAddress:     result.pairAddress,
      uniswapLiquidityTxHash: result.liquidityTxHash,
      tokenName,
      tokenSymbol,
      updatedAt: new Date(),
    }).where(eq(subdomainsTable.id, sub.id));

    logger.info(`[ADMIN] deploy-token: SUCCESS ${name} → token=${result.contractAddress} pool=${result.pairAddress}`);
    res.json({
      ok:           true,
      tokenAddress: result.contractAddress,
      pairAddress:  result.pairAddress,
      deployTx:     result.createTxHash,
      liquidityTx:  result.liquidityTxHash,
      artTokenId:   result.artTokenId,
    });
  } catch (err: unknown) {
    await db.update(subdomainsTable)
      .set({ tokenStatus: "failed", updatedAt: new Date() })
      .where(eq(subdomainsTable.id, sub.id));
    logger.error({ err }, `[ADMIN] deploy-token FAILED for ${name}`);
    res.status(500).json({ error: String(err) });
  }
});

// POST /admin/fix-token-uri/:name
// For a token that already exists but has a placeholder baseURI:
// 1) Upload art metadata to IPFS  2) Call setBaseURI on the existing token  3) Update DB
adminRouter.post("/admin/fix-token-uri/:name", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const { name } = req.params;

  const rows = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, name));
  if (rows.length === 0) return void res.status(404).json({ error: `Subdomain '${name}' not found` });

  const sub = rows[0]!;
  if (!sub.tokenAddress) return void res.status(400).json({ error: "No token deployed — deploy first" });

  res.status(202).json({ message: "Fix started — check server logs", name, tokenAddress: sub.tokenAddress });

  (async () => {
    const { tokenName } = buildTokenMeta(name);

    // Step 1: Upload art metadata if not already pinned
    let baseUri = sub.artBaseUri ?? undefined;
    if (!baseUri) {
      logger.info(`[FIX-URI] Uploading art metadata for ${name}...`);
      baseUri = await uploadArtMetadataFolder(sub.id, name, tokenName) ?? undefined;
      if (!baseUri) {
        logger.error(`[FIX-URI] IPFS upload failed for ${name}. Aborting.`);
        return;
      }
      await db.update(subdomainsTable)
        .set({ artBaseUri: baseUri, updatedAt: new Date() })
        .where(eq(subdomainsTable.id, sub.id));
      logger.info(`[FIX-URI] Art pinned: ${baseUri}`);
    } else {
      logger.info(`[FIX-URI] Already pinned: ${baseUri}`);
    }

    // Step 2: Call setBaseURI on the existing token contract
    logger.info(`[FIX-URI] Calling setBaseURI on ${sub.tokenAddress}...`);
    const txHash = await setTokenBaseUri(sub.tokenAddress as Address, baseUri);
    logger.info(`[FIX-URI] Done! ${name} → baseURI="${baseUri}" tx=${txHash}`);
  })().catch((err) => logger.error({ err }, `[FIX-URI] Failed for ${name}`));
});

// POST /admin/redeploy-token/:name
// Force-redeploy an ERC-404 token from the NEW factory, even if one already exists.
// Use when the existing token was deployed from an old/broken factory.
// Steps: 1) upload art metadata → IPFS baseURI  2) deploy from new factory  3) update DB
adminRouter.post("/admin/redeploy-token/:name", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const { name } = req.params;

  const rows = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, name));
  if (rows.length === 0) return void res.status(404).json({ error: `Subdomain '${name}' not found` });

  const sub = rows[0]!;

  // Mark as deploying so frontend can show progress
  await db.update(subdomainsTable)
    .set({ tokenStatus: "deploying", updatedAt: new Date() })
    .where(eq(subdomainsTable.id, sub.id));

  res.status(202).json({ message: "Redeploy started — check server logs", name });

  (async () => {
    const { tokenName, tokenSymbol } = buildTokenMeta(name);

    // Step 1: upload art metadata to IPFS if not already done
    let baseUri = sub.artBaseUri ?? undefined;
    if (!baseUri) {
      logger.info(`[REDEPLOY] Uploading art metadata for ${name}...`);
      baseUri = await uploadArtMetadataFolder(sub.id, name, tokenName) ?? undefined;
      if (baseUri) {
        await db.update(subdomainsTable)
          .set({ artBaseUri: baseUri, updatedAt: new Date() })
          .where(eq(subdomainsTable.id, sub.id));
        logger.info(`[REDEPLOY] Art metadata pinned: ${baseUri}`);
      } else {
        logger.warn(`[REDEPLOY] Art metadata upload failed — deploying with placeholder baseURI`);
      }
    } else {
      logger.info(`[REDEPLOY] Using existing art baseUri: ${baseUri}`);
    }

    // Step 2: deploy fresh token from new factory + new V4 pool
    logger.info(`[REDEPLOY] Deploying new token for ${name} from factory ${process.env["ART_FACTORY_ADDRESS"]}...`);
    const result = await deployArtToken({
      subdomainName:  name,
      creatorWallet:  sub.walletAddress as `0x${string}`,
      tokenName,
      tokenSymbol,
      metadataUri:    baseUri,
    });

    // Step 3: overwrite all token fields in DB
    await db.update(subdomainsTable).set({
      tokenStatus:            "deployed",
      tokenAddress:           result.contractAddress,
      tokenDeployTxHash:      result.createTxHash,
      artTokenId:             result.artTokenId,
      uniswapPairAddress:     result.pairAddress,
      uniswapLiquidityTxHash: result.liquidityTxHash,
      tokenName,
      tokenSymbol,
      updatedAt: new Date(),
    }).where(eq(subdomainsTable.id, sub.id));

    logger.info(`[REDEPLOY] Done! ${name} → token=${result.contractAddress} pool=${result.pairAddress} baseUri=${baseUri ?? "placeholder"}`);
  })().catch(async (err) => {
    logger.error({ err }, `[REDEPLOY] Failed for ${name}`);
    await db.update(subdomainsTable)
      .set({ tokenStatus: "failed", updatedAt: new Date() })
      .where(eq(subdomainsTable.id, sub.id));
  });
});

// POST /admin/reseed-liquidity/:name
// Re-approve PERMIT2 to the correct mainnet PositionManager and reseed V4 liquidity.
// Use when a previous seed TX went to the wrong contract (e.g. Sepolia POSM address on mainnet).
// Requires: platform wallet still holds the full 6900-token supply.
adminRouter.post("/admin/reseed-liquidity/:name", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const { name } = req.params;

  const rows = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, name));
  if (rows.length === 0) return void res.status(404).json({ error: `Subdomain '${name}' not found` });

  const sub = rows[0]!;
  if (!sub.tokenAddress) return void res.status(400).json({ error: `No tokenAddress for '${name}' — deploy token first` });

  res.status(202).json({ message: "Reseed started — check server logs", name, tokenAddress: sub.tokenAddress });

  (async () => {
    logger.info(`[RESEED] Starting reseed for ${name} (token: ${sub.tokenAddress})`);
    const treasury = (process.env["PROTOCOL_TREASURY"] ?? process.env["ENS_WALLET_ADDRESS"] ?? sub.walletAddress) as `0x${string}`;

    const result = await reseedTokenLiquidity(
      sub.tokenAddress as `0x${string}`,
      sub.walletAddress as `0x${string}`,
      treasury,
    );

    await db.update(subdomainsTable).set({
      uniswapLiquidityTxHash: result.liquidityTxHash,
      updatedAt: new Date(),
    }).where(eq(subdomainsTable.id, sub.id));

    logger.info(`[RESEED] Done for ${name}! permit2Tx=${result.permit2TxHash} liqTx=${result.liquidityTxHash} hookTx=${result.hookRegHash}`);
  })().catch((err) => {
    logger.error({ err }, `[RESEED] Failed for ${name}`);
  });
});

export default adminRouter;
