import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { subdomainsTable } from "./subdomains";

export const artGenStatusEnum = pgEnum("art_gen_status", ["none", "generating", "done", "failed"]);

export const artVariationsTable = pgTable("art_variations", {
  id: serial("id").primaryKey(),
  subdomainId: integer("subdomain_id").notNull().references(() => subdomainsTable.id, { onDelete: "cascade" }),
  variationIndex: integer("variation_index").notNull(),
  style: text("style").notNull(),
  variation: text("variation").notNull(),
  imageUrl: text("image_url"),
  ipfsCid: text("ipfs_cid"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export type ArtVariation = typeof artVariationsTable.$inferSelect;
