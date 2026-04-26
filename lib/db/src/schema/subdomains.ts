import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subdomainStatusEnum = pgEnum("subdomain_status", ["pending", "active", "linked"]);
export const tokenStatusEnum = pgEnum("token_status", ["none", "deploying", "deployed", "failed"]);

export const subdomainsTable = pgTable("subdomains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  walletAddress: text("wallet_address").notNull(),
  ensFullName: text("ens_full_name").notNull(),
  ipfsCid: text("ipfs_cid"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  status: subdomainStatusEnum("status").notNull().default("pending"),
  ensTx1Hash: text("ens_tx1_hash"),
  ensTx2Hash: text("ens_tx2_hash"),
  ensTx3Hash: text("ens_tx3_hash"),
  ensTx4Hash: text("ens_tx4_hash"),
  tokenStatus: tokenStatusEnum("token_status").notNull().default("none"),
  tokenAddress: text("token_address"),
  tokenSymbol: text("token_symbol"),
  tokenName: text("token_name"),
  tokenDeployTxHash: text("token_deploy_tx_hash"),
  uniswapPairAddress: text("uniswap_pair_address"),
  uniswapLiquidityTxHash: text("uniswap_liquidity_tx_hash"),
  artTokenId: text("art_token_id"),
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSubdomainSchema = createInsertSchema(subdomainsTable).omit({
  id: true,
  claimedAt: true,
  updatedAt: true,
});

export type InsertSubdomain = z.infer<typeof insertSubdomainSchema>;
export type Subdomain = typeof subdomainsTable.$inferSelect;
