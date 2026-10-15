import type { PostContent } from "@/domain/content/post";
import type { DbTransaction } from "@/server/db/client";

import { and, eq, isNull, ne, sql } from "drizzle-orm";

import { posts } from "@/server/db/schema/content";

export type PostRecord = typeof posts.$inferSelect;

export async function findPost(transaction: DbTransaction, id: string) {
  const [record] = await transaction
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  return record;
}

export async function findActivePostBySlug(
  transaction: DbTransaction,
  slug: string,
  excludeId?: string,
) {
  const [record] = await transaction
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.slug, slug),
        isNull(posts.deletedAt),
        excludeId ? ne(posts.id, excludeId) : undefined,
      ),
    )
    .limit(1);

  return record;
}

export async function insertPost(
  transaction: DbTransaction,
  values: { slug: string; draftContent: PostContent },
) {
  const [record] = await transaction.insert(posts).values(values).returning();

  return record;
}

export async function updatePostVersioned(
  transaction: DbTransaction,
  id: string,
  expectedUpdatedAt: Date,
  values: Partial<typeof posts.$inferInsert>,
) {
  const [record] = await transaction
    .update(posts)
    .set(values)
    .where(
      and(
        eq(posts.id, id),
        sql`date_trunc('milliseconds', ${posts.updatedAt}) = ${expectedUpdatedAt}`,
      ),
    )
    .returning();

  return record;
}

export async function deletePostRecord(
  transaction: DbTransaction,
  id: string,
  expectedUpdatedAt: Date,
) {
  const [record] = await transaction
    .delete(posts)
    .where(
      and(
        eq(posts.id, id),
        sql`date_trunc('milliseconds', ${posts.updatedAt}) = ${expectedUpdatedAt}`,
      ),
    )
    .returning();

  return record;
}
