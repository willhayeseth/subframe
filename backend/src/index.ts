import app from "./app";
import { logger } from "./lib/logger";
import { db, subdomainsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { registerSubdomainOnChain } from "./lib/ens";
import { pushRegistryUpdate } from "./lib/github";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // On startup: retry ENS registration for subdomains stuck in "active" state
  setTimeout(async () => {
    try {
      const stuck = await db
        .select()
        .from(subdomainsTable)
        .where(eq(subdomainsTable.status, "active"));

      const pending = stuck.filter((s) => s.ipfsCid && !s.ensTx4Hash);

      if (pending.length === 0) return;

      logger.info(`[STARTUP] Found ${pending.length} subdomain(s) with ENS pending. Retrying...`);

      for (const sub of pending) {
        logger.info(`[STARTUP] Retrying ENS for ${sub.name}.subframe.eth`);
        registerSubdomainOnChain(sub.name, sub.walletAddress, sub.ipfsCid!, async (step, txHash) => {
          logger.info(`[STARTUP] ${sub.name} ENS step ${step}: ${txHash}`);
          if (step === 1) {
            await db.update(subdomainsTable).set({ ensTx1Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.id, sub.id));
          } else if (step === 2) {
            await db.update(subdomainsTable).set({ ensTx2Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.id, sub.id));
          } else if (step === 3) {
            await db.update(subdomainsTable).set({ ensTx3Hash: txHash, updatedAt: new Date() }).where(eq(subdomainsTable.id, sub.id));
          } else {
            await db.update(subdomainsTable).set({ ensTx4Hash: txHash, status: "linked", updatedAt: new Date() }).where(eq(subdomainsTable.id, sub.id));
            pushRegistryUpdate(sub.name).catch(() => void 0);
          }
        }).then((res) => {
          if (res) {
            logger.info(`[STARTUP] ENS complete: ${sub.name}.subframe.eth`);
          } else {
            logger.error(`[STARTUP] ENS returned null for ${sub.name}. Backend wallet may not control subframe.eth`);
          }
        }).catch((err) => {
          logger.error({ err }, `[STARTUP] ENS failed for ${sub.name}`);
        });
      }
    } catch (err) {
      logger.error({ err }, "[STARTUP] Failed to retry pending ENS registrations");
    }
  }, 5000);
});
