import type { AppDatabase, DbTransaction } from "@/server/db/client";

import { asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/server/db/client";
import { mediaAssets, mediaUsage } from "@/server/db/schema/content";

type Database = AppDatabase | DbTransaction;

export type MediaAssetRecord = typeof mediaAssets.$inferSelect;
export type MediaAssetInsert = typeof mediaAssets.$inferInsert;

export async function insertMediaAsset(
  database: Database,
  values: MediaAssetInsert,
) {
  const [record] = await database
    .insert(mediaAssets)
    .values(values)
    .returning();

  return record;
}

export async function findMediaAsset(
  database: Database,
  id: string,
  lock = false,
) {
  const query = database
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  const [record] = lock ? await query.for("update") : await query;

  return record;
}

export async function findMediaAssetByPublicId(
  database: Database,
  publicId: string,
) {
  const [record] = await database
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.publicId, publicId))
    .limit(1);

  return record;
}

export function listMediaAssets(database: Database = db) {
  return database
    .select()
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt), asc(mediaAssets.publicId));
}

export async function updateMediaAssetText(
  database: Database,
  id: string,
  values: Pick<MediaAssetInsert, "altText" | "caption">,
) {
  const [record] = await database
    .update(mediaAssets)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(mediaAssets.id, id))
    .returning();

  return record;
}

export function listMediaUsage(database: Database, mediaAssetId: string) {
  return database
    .select()
    .from(mediaUsage)
    .where(eq(mediaUsage.mediaAssetId, mediaAssetId))
    .orderBy(
      asc(mediaUsage.contentType),
      asc(mediaUsage.contentId),
      asc(mediaUsage.snapshot),
      asc(mediaUsage.field),
    );
}

export async function countMediaUsage(
  database: Database,
  mediaAssetId: string,
) {
  const [row] = await database
    .select({ value: count() })
    .from(mediaUsage)
    .where(eq(mediaUsage.mediaAssetId, mediaAssetId));

  return row?.value ?? 0;
}

export async function deleteMediaAssetRecord(database: Database, id: string) {
  const [record] = await database
    .delete(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .returning({ id: mediaAssets.id });

  return record;
}
