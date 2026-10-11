import { relations } from "drizzle-orm";

import { account, session, user } from "@/server/db/schema/auth";
import {
  contentEvents,
  mediaAssets,
  mediaUsage,
} from "@/server/db/schema/content";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  contentEvents: many(contentEvents),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  usages: many(mediaUsage),
}));

export const mediaUsageRelations = relations(mediaUsage, ({ one }) => ({
  asset: one(mediaAssets, {
    fields: [mediaUsage.mediaAssetId],
    references: [mediaAssets.id],
  }),
}));

export const contentEventsRelations = relations(contentEvents, ({ one }) => ({
  actor: one(user, {
    fields: [contentEvents.actorId],
    references: [user.id],
  }),
}));
