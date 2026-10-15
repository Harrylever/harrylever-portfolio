import { relations } from "drizzle-orm";

import { mediaAssets, mediaUsage } from "@/server/db/schema/content";

export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  usages: many(mediaUsage),
}));

export const mediaUsageRelations = relations(mediaUsage, ({ one }) => ({
  asset: one(mediaAssets, {
    fields: [mediaUsage.mediaAssetId],
    references: [mediaAssets.id],
  }),
}));
