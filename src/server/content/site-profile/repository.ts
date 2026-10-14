import type { SiteProfileContent } from "@/domain/content/site-profile";
import type { DbTransaction } from "@/server/db/client";

import { and, eq, sql } from "drizzle-orm";

import { siteProfile } from "@/server/db/schema/content";

export type SiteProfileRecord = typeof siteProfile.$inferSelect;

export async function findSiteProfile(transaction: DbTransaction) {
  const [record] = await transaction.select().from(siteProfile).limit(1);

  return record;
}

export async function insertSiteProfile(
  transaction: DbTransaction,
  draftContent: SiteProfileContent,
) {
  const [record] = await transaction
    .insert(siteProfile)
    .values({ draftContent })
    .returning();

  return record;
}

export async function updateSiteProfileVersioned(
  transaction: DbTransaction,
  id: string,
  expectedUpdatedAt: Date,
  values: Partial<typeof siteProfile.$inferInsert>,
) {
  const [record] = await transaction
    .update(siteProfile)
    .set(values)
    .where(
      and(
        eq(siteProfile.id, id),
        sql`date_trunc('milliseconds', ${siteProfile.updatedAt}) = ${expectedUpdatedAt}`,
      ),
    )
    .returning();

  return record;
}
