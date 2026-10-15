import type { ProjectContent } from "@/domain/content/project";
import type { DbTransaction } from "@/server/db/client";

import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";

import { projects } from "@/server/db/schema/content";

export type ProjectRecord = typeof projects.$inferSelect;

export async function findProject(transaction: DbTransaction, id: string) {
  const [record] = await transaction
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  return record;
}

export async function findActiveProjectBySlug(
  transaction: DbTransaction,
  slug: string,
  excludeId?: string,
) {
  const [record] = await transaction
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.slug, slug),
        isNull(projects.deletedAt),
        excludeId ? ne(projects.id, excludeId) : undefined,
      ),
    )
    .limit(1);

  return record;
}

export async function insertProject(
  transaction: DbTransaction,
  values: {
    slug: string;
    draftContent: ProjectContent;
    displayOrder?: number;
    featured?: boolean;
    featuredOrder?: number | null;
  },
) {
  const [record] = await transaction
    .insert(projects)
    .values(values)
    .returning();

  return record;
}

export async function updateProjectVersioned(
  transaction: DbTransaction,
  id: string,
  expectedUpdatedAt: Date,
  values: Partial<typeof projects.$inferInsert>,
) {
  const [record] = await transaction
    .update(projects)
    .set(values)
    .where(
      and(
        eq(projects.id, id),
        sql`date_trunc('milliseconds', ${projects.updatedAt}) = ${expectedUpdatedAt}`,
      ),
    )
    .returning();

  return record;
}

export async function deleteProjectRecord(
  transaction: DbTransaction,
  id: string,
  expectedUpdatedAt: Date,
) {
  const [record] = await transaction
    .delete(projects)
    .where(
      and(
        eq(projects.id, id),
        sql`date_trunc('milliseconds', ${projects.updatedAt}) = ${expectedUpdatedAt}`,
      ),
    )
    .returning();

  return record;
}

export async function listActiveProjects(transaction: DbTransaction) {
  return transaction
    .select()
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(asc(projects.displayOrder), asc(projects.createdAt));
}
