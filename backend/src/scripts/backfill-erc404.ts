/**
 * backfill-erc404.ts
 *
 * One-time script to deploy ERC-404 tokens for all existing subdomains
 * that don't have one yet (tokenStatus = "none" or "failed").
 *
 * Usage:
 *   cd artifacts/api-server
 *   npx tsx src/scripts/backfill-erc404.ts
 *
 * Set ART_FACTORY_ADDRESS env var before running so it uses the existing
 * factory rather than deploying a new one.
 */

import { db, subdomainsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { deployArtToken, buildTokenMeta } from "../lib/token.js";
import type { Address } from "viem";

async function main() {
  console.log("[BACKFILL] Starting ERC-404 backfill...");
  console.log("[BACKFILL] ART_FACTORY_ADDRESS:", process.env["ART_FACTORY_ADDRESS"] ?? "(not set - will deploy factory)");

  const subdomains = await db
    .select()
    .from(subdomainsTable)
    .where(
      or(
        eq(subdomainsTable.tokenStatus, "none"),
        eq(subdomainsTable.tokenStatus, "failed"),
      ),
    );

  console.log(`[BACKFILL] Found ${subdomains.length} subdomains to process`);

  let success = 0;
  let failed  = 0;

  for (const sub of subdomains) {
    console.log(`\n[BACKFILL] Processing: ${sub.name} (wallet: ${sub.walletAddress})`);

    try {
      await db
        .update(subdomainsTable)
        .set({ tokenStatus: "deploying", updatedAt: new Date() })
        .where(eq(subdomainsTable.id, sub.id));

      const { tokenName, tokenSymbol } = buildTokenMeta(sub.name);
      console.log(`[BACKFILL] Token: ${tokenName} ($${tokenSymbol})`);

      const result = await deployArtToken({
        subdomainName: sub.name,
        creatorWallet:  sub.walletAddress as Address,
        tokenName,
        tokenSymbol,
      });

      await db
        .update(subdomainsTable)
        .set({
          tokenStatus:            "deployed",
          tokenAddress:           result.tokenAddress,
          tokenName,
          tokenSymbol,
          tokenDeployTxHash:      result.createTxHash,
          artTokenId:             result.artTokenId,
          uniswapPairAddress:     result.pairAddress,
          uniswapLiquidityTxHash: result.liquidityTxHash,
          updatedAt: new Date(),
        })
        .where(eq(subdomainsTable.id, sub.id));

      console.log(`[BACKFILL] OK: ${sub.name} -> ${result.tokenAddress}`);
      success++;
    } catch (err) {
      console.error(`[BACKFILL] FAILED: ${sub.name}:`, (err as Error).message);

      await db
        .update(subdomainsTable)
        .set({ tokenStatus: "failed", updatedAt: new Date() })
        .where(eq(subdomainsTable.id, sub.id));

      failed++;
    }
  }

  console.log(`\n[BACKFILL] Done. Success: ${success}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[BACKFILL] Fatal:", err);
  process.exit(1);
});
