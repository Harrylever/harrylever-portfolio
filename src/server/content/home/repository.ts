import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";
import type { DbTransaction } from "@/server/db/client";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db/client";
import { homeSections, projects } from "@/server/db/schema/content";

export type HomeSectionRecord = typeof homeSections.$inferSelect;

export async function findHomeSection(
  transaction: DbTransaction,
  type: HomeSectionType,
) {
  const [record] = await transaction
    .select()
    .from(homeSections)
    .where(eq(homeSections.type, type))
    .limit(1);

  return record;
}

export function listHomeSections(transaction: DbTransaction) {
  return transaction
    .select()
    .from(homeSections)
    .orderBy(asc(homeSections.draftPosition));
}

export async function insertHomeSection(
  transaction: DbTransaction,
  values: {
    type: HomeSectionType;
    draftContent: HomeSectionContent;
    draftVisible: boolean;
    draftPosition: number;
  },
) {
  const [record] = await transaction
    .insert(homeSections)
    .values(values)
    .returning();

  return record;
}

export async function updateHomeSectionVersioned(
  transaction: DbTransaction,
  id: string,
  expectedUpdatedAt: Date,
  values: Partial<typeof homeSections.$inferInsert>,
) {
  const [record] = await transaction
    .update(homeSections)
    .set(values)
    .where(
      and(
        eq(homeSections.id, id),
        sql`date_trunc('milliseconds', ${homeSections.updatedAt}) = ${expectedUpdatedAt}`,
      ),
    )
    .returning();

  return record;
}

export async function getHomepageSnapshot(snapshot: "draft" | "published") {
  const sectionRows = await db
    .select()
    .from(homeSections)
    .orderBy(
      snapshot === "draft"
        ? asc(homeSections.draftPosition)
        : asc(homeSections.publishedPosition),
    );
  const featuredProjects = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      content: projects.publishedContent,
      featuredOrder: projects.featuredOrder,
    })
    .from(projects)
    .where(
      and(
        eq(projects.status, "published"),
        eq(projects.featured, true),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(asc(projects.featuredOrder));

  return {
    sections: sectionRows.map((section) => ({
      id: section.id,
      type: section.type,
      content:
        snapshot === "draft" ? section.draftContent : section.publishedContent,
      visible:
        snapshot === "draft" ? section.draftVisible : section.publishedVisible,
      position:
        snapshot === "draft"
          ? section.draftPosition
          : section.publishedPosition,
    })),
    featuredProjects,
  };
}
