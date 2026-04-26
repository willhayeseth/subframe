import { Router } from "express";
import { eq, desc, count, inArray } from "drizzle-orm";
import { db, subdomainsTable } from "@workspace/db";
import {
  CreateSubdomainBody,
  UpdateSubdomainBody,
  GetSubdomainParams,
  GetSubdomainByNameParams,
  CheckSubdomainAvailabilityParams,
  UpdateSubdomainParams,
} from "@workspace/api-zod";
import { uploadProfileToIPFS, uploadParentAppToIPFS } from "../lib/ipfs.js";
import { registerSubdomainOnChain, fixContenthash, transferSubdomainOwnership, setParentContenthash } from "../lib/ens.js";
import { claimLimiter } from "../lib/rateLimit.js";
import { pushRegistryUpdate } from "../lib/github.js";
import { deployArtToken, buildTokenMeta } from "../lib/token.js";
import { generateArtForSubdomain } from "../lib/art-gen.js";

const RESERVED_NAMES = new Set(["vitalik", "vb", "vb2"]);

const router = Router();

// Called after every ENS registration completes (step 4).
// Updates GitHub registry and regenerates the parent subframe.eth IPFS page + ENS contenthash.
async function afterRegistrationComplete(name: string): Promise<void> {
  pushRegistryUpdate(name).catch(() => void 0);
  try {
    const cid = await uploadParentAppToIPFS();
    if (cid) {
      const tx = await setParentContenthash(cid);
      if (tx) console.log(`[PARENT-ENS] Updated subframe.eth contenthash: ${tx} (CID: ${cid})`);
    }
  } catch (err) {
    console.error("[PARENT-ENS] Failed to update parent contenthash (non-fatal):", err);
  }
}

router.get("/subdomains", async (req, res) => {
  try {
    const subdomains = await db
      .select()
      .from(subdomainsTable)
      .orderBy(desc(subdomainsTable.claimedAt));
    res.json(subdomains);
  } catch (err) {
    req.log.error({ err }, "Failed to list subdomains");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subdomains", claimLimiter, async (req, res) => {
  const parsed = CreateSubdomainBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { name, walletAddress, bio, avatarUrl } = parsed.data;
  const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (RESERVED_NAMES.has(cleanName)) {
    res.status(409).json({ error: "Subdomain name already taken" });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(subdomainsTable)
      .where(eq(subdomainsTable.name, cleanName))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Subdomain name already taken" });
      return;
    }

    const [subdomain] = await db
      .insert(subdomainsTable)
      .values({
        name: cleanName,
        walletAddress,
        ensFullName: `${cleanName}.subframe.eth`,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
        status: "pending",
      })
      .returning();

    // Background: IPFS upload then ENS registration (non-blocking)
    setImmediate(async () => {
      console.log(`[CLAIM] Starting background processing for ${cleanName}.subframe.eth (wallet: ${walletAddress})`);

      // Check env vars upfront
      if (!process.env["PINATA_JWT"]) {
        console.error("[CLAIM] PINATA_JWT is not set — IPFS upload will be skipped");
      }
      if (!process.env["ENS_PRIVATE_KEY"]) {
        console.error("[CLAIM] ENS_PRIVATE_KEY is not set — on-chain registration will be skipped");
      }

      try {
        console.log(`[CLAIM] Step 1/3: Uploading profile to IPFS via Pinata...`);
        const cid = await uploadProfileToIPFS({
          name: cleanName,
          ensFullName: `${cleanName}.subframe.eth`,
          walletAddress,
          bio: bio ?? null,
          avatarUrl: avatarUrl ?? null,
          claimedAt: subdomain.claimedAt.toISOString(),
          platform: "subframe.eth",
          version: "1.0",
        });

        if (!cid) {
          console.error(`[CLAIM] Step 1 FAILED: IPFS upload returned no CID. Check PINATA_JWT is valid.`);
          return;
        }

        console.log(`[CLAIM] Step 1 OK: IPFS CID = ${cid}`);

        await db
          .update(subdomainsTable)
          .set({ ipfsCid: cid, status: "active", updatedAt: new Date() })
          .where(eq(subdomainsTable.id, subdomain.id));

        // Auto-generate 69 art variations in background (fire-and-forget)
        if (avatarUrl) {
          console.log(`[CLAIM] Triggering art generation for ${cleanName}...`);
          generateArtForSubdomain(subdomain.id, cleanName, avatarUrl).catch((err) => {
            console.error(`[CLAIM] Art generation failed for ${cleanName}:`, err);
          });
        }

        // Run ENS registration and Art Token deployment in parallel
        console.log(`[CLAIM] Step 2/3: Starting ENS registration + Art Token deployment in parallel...`);

        const { tokenName, tokenSymbol } = buildTokenMeta(cleanName);

        await db
          .update(subdomainsTable)
          .set({ tokenStatus: "deploying", tokenName, tokenSymbol, updatedAt: new Date() })
          .where(eq(subdomainsTable.id, subdomain.id));

        const [ensResult, tokenResult] = await Promise.allSettled([
          // ENS registration
          registerSubdomainOnChain(cleanName, walletAddress, cid, async (step, txHash) => {
            console.log(`[CLAIM] ENS Step ${step} confirmed: ${txHash}`);
            if (step === 1) {
              await db.update(subdomainsTable).set({ ensTx1Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.id, subdomain.id));
            } else if (step === 2) {
              await db.update(subdomainsTable).set({ ensTx2Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.id, subdomain.id));
            } else if (step === 3) {
              await db.update(subdomainsTable).set({ ensTx3Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.id, subdomain.id));
            } else {
              await db.update(subdomainsTable).set({ ensTx4Hash: txHash, status: "linked", updatedAt: new Date() }).where(eq(subdomainsTable.id, subdomain.id));
              afterRegistrationComplete(cleanName).catch(() => void 0);
            }
          }),
          // Art Token deployment
          deployArtToken({
            subdomainName: cleanName,
            creatorWallet: walletAddress as `0x${string}`,
            tokenName,
            tokenSymbol,
          }),
        ]);

        if (ensResult.status === "fulfilled" && ensResult.value) {
          console.log(`[CLAIM] ENS complete: ${cleanName}.subframe.eth is live on-chain`);
        } else if (ensResult.status === "rejected") {
          console.error("[CLAIM] ENS FAILED:", ensResult.reason);
        } else {
          console.error(`[CLAIM] ENS SKIPPED: wallet may not control subframe.eth`);
        }

        if (tokenResult.status === "fulfilled") {
          const { contractAddress, artTokenId, createTxHash } = tokenResult.value;
          await db.update(subdomainsTable).set({
            tokenStatus: "deployed",
            tokenAddress: contractAddress,
            tokenDeployTxHash: createTxHash,
            artTokenId,
            updatedAt: new Date(),
          }).where(eq(subdomainsTable.id, subdomain.id));
          console.log(`[CLAIM] Art Token created: contract=${contractAddress} tokenId=${artTokenId}`);
        } else {
          console.error("[CLAIM] Art Token deployment FAILED:", tokenResult.reason);
          await db.update(subdomainsTable).set({
            tokenStatus: "failed",
            updatedAt: new Date(),
          }).where(eq(subdomainsTable.id, subdomain.id));
        }
      } catch (err) {
        console.error("[CLAIM] Background processing failed:", err);
      }
    });

    res.status(201).json(subdomain);
  } catch (err) {
    req.log.error({ err }, "Failed to create subdomain");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subdomains/stats", async (req, res) => {
  try {
    const [totalResult] = await db.select({ value: count() }).from(subdomainsTable);
    const [activeResult] = await db
      .select({ value: count() })
      .from(subdomainsTable)
      .where(eq(subdomainsTable.status, "active"));
    const [linkedResult] = await db
      .select({ value: count() })
      .from(subdomainsTable)
      .where(eq(subdomainsTable.status, "linked"));

    const recentClaims = await db
      .select()
      .from(subdomainsTable)
      .orderBy(desc(subdomainsTable.claimedAt))
      .limit(6);

    res.json({
      totalSubdomains: Number(totalResult.value),
      activeSubdomains: Number(activeResult.value),
      linkedToIPFS: Number(linkedResult.value),
      recentClaims,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get subdomain stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subdomains/check/:name", async (req, res) => {
  const parsed = CheckSubdomainAvailabilityParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid name" });
    return;
  }

  const cleanName = parsed.data.name.toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (RESERVED_NAMES.has(cleanName)) {
    res.json({ available: false, name: cleanName });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(subdomainsTable)
      .where(eq(subdomainsTable.name, cleanName))
      .limit(1);

    res.json({ available: existing.length === 0, name: cleanName });
  } catch (err) {
    req.log.error({ err }, "Failed to check subdomain availability");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subdomains/by-name/:name", async (req, res) => {
  const parsed = GetSubdomainByNameParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid name" });
    return;
  }

  try {
    const [subdomain] = await db
      .select()
      .from(subdomainsTable)
      .where(eq(subdomainsTable.name, parsed.data.name))
      .limit(1);

    if (!subdomain) {
      res.status(404).json({ error: "Subdomain not found" });
      return;
    }

    res.json(subdomain);
  } catch (err) {
    req.log.error({ err }, "Failed to get subdomain by name");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subdomains/:id", async (req, res) => {
  const parsed = GetSubdomainParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [subdomain] = await db
      .select()
      .from(subdomainsTable)
      .where(eq(subdomainsTable.id, parsed.data.id))
      .limit(1);

    if (!subdomain) {
      res.status(404).json({ error: "Subdomain not found" });
      return;
    }

    res.json(subdomain);
  } catch (err) {
    req.log.error({ err }, "Failed to get subdomain" );
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/subdomains/:id", async (req, res) => {
  const paramsParsed = UpdateSubdomainParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const bodyParsed = UpdateSubdomainBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const updates: Partial<typeof subdomainsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (bodyParsed.data.ipfsCid !== undefined) updates.ipfsCid = bodyParsed.data.ipfsCid;
    if (bodyParsed.data.bio !== undefined) updates.bio = bodyParsed.data.bio;
    if (bodyParsed.data.avatarUrl !== undefined) updates.avatarUrl = bodyParsed.data.avatarUrl;
    if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;

    const [updated] = await db
      .update(subdomainsTable)
      .set(updates)
      .where(eq(subdomainsTable.id, paramsParsed.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Subdomain not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update subdomain");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Re-upload to IPFS (directory) and re-set ENS contenthash with correct encoding
router.post("/subdomains/:name/fix-contenthash", async (req, res) => {
  try {
    const { name } = req.params;
    const [sub] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, name)).limit(1);
    if (!sub) {
      res.status(404).json({ error: "Subdomain not found" });
      return;
    }

    res.status(202).json({ message: "Fix started", name });

    (async () => {
      // Step A: re-upload as directory (wrapWithDirectory:true) to get a proper dag-pb CID
      console.log(`[FIXCID] Re-uploading ${name} to IPFS as directory...`);
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
      if (!newCid) { console.error("[FIXCID] IPFS re-upload failed"); return; }
      console.log(`[FIXCID] New directory CID: ${newCid}`);

      await db.update(subdomainsTable).set({ ipfsCid: newCid, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));

      // Step B: fix contenthash on-chain with new CID + correct encoding
      const txHash = await fixContenthash(name, newCid);
      if (txHash) {
        await db.update(subdomainsTable).set({ ensTx2Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
        console.log(`[FIXCID] Done. new CID=${newCid} tx=${txHash}`);
      }
    })().catch((err) => console.error(`[FIXCID] Error:`, err));
  } catch (err) {
    req.log.error({ err }, "Failed to start contenthash fix");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/subdomains/:name/transfer-ownership
// Transfers ENS subdomain ownership to the user's wallet (for existing subdomains that were registered before Step 4 was added)
router.post("/subdomains/:name/transfer-ownership", async (req, res) => {
  try {
    const { name } = req.params;
    const [sub] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, name));
    if (!sub) return void res.status(404).json({ error: "Subdomain not found" });

    res.status(202).json({ message: "Transfer started", name });

    (async () => {
      console.log(`[TRANSFER] Transferring ${name}.subframe.eth ownership to ${sub.walletAddress}...`);
      const txHash = await transferSubdomainOwnership(name, sub.walletAddress);
      if (txHash) {
        await db.update(subdomainsTable).set({ ensTx4Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
        console.log(`[TRANSFER] Done. tx=${txHash}`);
      } else {
        console.error("[TRANSFER] transferSubdomainOwnership returned null");
      }
    })().catch((err) => console.error(`[TRANSFER] Error:`, err));
  } catch (err) {
    req.log.error({ err }, "Failed to start ownership transfer");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/subdomains/:name/refresh-ipfs
// Re-uploads IPFS profile page (new standalone design) and returns new CID + encoded contenthash
// Does NOT update ENS — that's done by the user from their wallet in onboarding
router.post("/subdomains/:name/refresh-ipfs", async (req, res) => {
  try {
    const { name } = req.params;
    const [sub] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, name)).limit(1);
    if (!sub) return void res.status(404).json({ error: "Subdomain not found" });

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

    if (!newCid) return void res.status(500).json({ error: "IPFS upload failed" });

    await db.update(subdomainsTable).set({ ipfsCid: newCid, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));

    // Encode contenthash for ENS (ipfs-ns codec prefix 0xe3 0x01 + CIDv1 bytes)
    const { CID } = await import("multiformats/cid");
    const cid = CID.parse(newCid);
    const cidV1Bytes = cid.toV1().bytes;
    const bytes = new Uint8Array([0xe3, 0x01, ...cidV1Bytes]);
    const encodedContenthash = `0x${Buffer.from(bytes).toString("hex")}`;

    res.json({ ipfsCid: newCid, encodedContenthash });
  } catch (err) {
    req.log.error({ err }, "Failed to refresh IPFS");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/subdomains/:name/retry-ens
// Re-triggers full ENS registration for a subdomain stuck in "active" state
router.post("/subdomains/:name/retry-ens", async (req, res) => {
  try {
    const { name } = req.params;
    const [sub] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, name)).limit(1);
    if (!sub) return void res.status(404).json({ error: "Subdomain not found" });
    if (sub.status === "linked") return void res.status(200).json({ message: "Already linked", name });
    if (!sub.ipfsCid) return void res.status(400).json({ error: "No IPFS CID, claim flow incomplete" });

    // Determine which step to resume from based on what's already in DB
    let resumeFrom: 1 | 2 | 3 | 4 = 1;
    if (sub.ensTx3Hash) resumeFrom = 4;
    else if (sub.ensTx2Hash) resumeFrom = 3;
    else if (sub.ensTx1Hash) resumeFrom = 2;

    res.status(202).json({ message: "ENS retry started", name, resumeFrom });

    (async () => {
      console.log(`[RETRY-ENS] Starting ENS for ${name}.subframe.eth from step ${resumeFrom} (wallet: ${sub.walletAddress})`);
      try {
        const ens = await registerSubdomainOnChain(name, sub.walletAddress, sub.ipfsCid!, async (step, txHash) => {
          console.log(`[RETRY-ENS] Step ${step} confirmed: ${txHash}`);
          if (step === 1) {
            await db.update(subdomainsTable).set({ ensTx1Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
          } else if (step === 2) {
            await db.update(subdomainsTable).set({ ensTx2Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
          } else if (step === 3) {
            await db.update(subdomainsTable).set({ ensTx3Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
          } else {
            await db.update(subdomainsTable).set({ ensTx4Hash: txHash, status: "linked", updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
            afterRegistrationComplete(name).catch(() => void 0);
          }
        }, resumeFrom);
        if (ens) {
          console.log(`[RETRY-ENS] Done: ${name}.subframe.eth is live on-chain`);
        } else {
          console.error(`[RETRY-ENS] registerSubdomainOnChain returned null. Backend wallet may not control subframe.eth`);
        }
      } catch (err) {
        console.error(`[RETRY-ENS] Failed:`, err);
      }
    })().catch((err) => console.error(`[RETRY-ENS] Outer error:`, err));
  } catch (err) {
    req.log.error({ err }, "Failed to start ENS retry");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/subdomains/:name/set-ens-step
// Admin: manually record a confirmed on-chain ENS step (for recovery when backend job missed it)
router.post("/subdomains/:name/set-ens-step", async (req, res) => {
  try {
    const { name } = req.params;
    const { step, txHash } = req.body as { step: number; txHash: string };
    if (!step || !txHash || ![1, 2, 3, 4].includes(step)) {
      return void res.status(400).json({ error: "step (1-4) and txHash required" });
    }
    const [sub] = await db.select().from(subdomainsTable).where(eq(subdomainsTable.name, name)).limit(1);
    if (!sub) return void res.status(404).json({ error: "Subdomain not found" });

    if (step === 1) {
      await db.update(subdomainsTable).set({ ensTx1Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
    } else if (step === 2) {
      await db.update(subdomainsTable).set({ ensTx2Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
    } else if (step === 3) {
      await db.update(subdomainsTable).set({ ensTx3Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
    } else {
      await db.update(subdomainsTable).set({ ensTx4Hash: txHash, status: "linked", updatedAt: new Date() }).where(eq(subdomainsTable.name, name));
      afterRegistrationComplete(name).catch(() => void 0);
    }
    req.log.info(`[SET-ENS-STEP] ${name} step ${step}: ${txHash}`);
    res.json({ ok: true, name, step, txHash });
  } catch (err) {
    req.log.error({ err }, "Failed to set ENS step");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* Admin: set contenthash on subframe.eth (parent domain).
   If `cid` is provided in the body, skip the IPFS upload step.
   Otherwise uploads a redirect SPA page to IPFS first.
   Backend wallet pays all gas. Idempotent. */
router.delete("/admin/subdomains", async (req, res) => {
  try {
    const adminKey = process.env["ADMIN_KEY"];
    if (adminKey && req.headers["x-admin-key"] !== adminKey) {
      return void res.status(401).json({ error: "Unauthorized" });
    }
    const { ids } = req.body as { ids?: number[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return void res.status(400).json({ error: "ids array required" });
    }
    const deleted = await db
      .delete(subdomainsTable)
      .where(inArray(subdomainsTable.id, ids))
      .returning({ id: subdomainsTable.id, name: subdomainsTable.name });
    res.json({ deleted, count: deleted.length });
  } catch (err) {
    req.log.error({ err }, "Failed to delete subdomains");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/set-parent-contenthash", async (req, res) => {
  try {
    const adminKey = process.env["ADMIN_KEY"];
    if (adminKey && req.headers["x-admin-key"] !== adminKey) {
      return void res.status(401).json({ error: "Unauthorized" });
    }

    let cid: string | null = (req.body as { cid?: string })?.cid ?? null;

    if (!cid) {
      req.log.info("Uploading parent app to IPFS...");
      cid = await uploadParentAppToIPFS();
      if (!cid) return void res.status(500).json({ error: "IPFS upload failed" });
    }

    req.log.info({ cid }, "Setting ENS contenthash on subframe.eth...");
    const txHash = await setParentContenthash(cid);
    if (!txHash) return void res.status(500).json({ error: "ENS tx failed" });

    res.json({ cid, txHash, limoUrl: "https://subframe.eth.limo" });
  } catch (err) {
    req.log.error({ err }, "Failed to set parent contenthash");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
