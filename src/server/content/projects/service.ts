import type { ActionResult } from "@/domain/content/action-result";
import type { ProjectContent } from "@/domain/content/project";
import type { AdminSession } from "@/server/auth/require-admin";

import { and, eq } from "drizzle-orm";

import { projectContentSchema } from "@/domain/content/project";
import { projectSlugSchema } from "@/domain/content/shared";
import { db } from "@/server/db/client";
import { mediaUsage, projects } from "@/server/db/schema/content";
import { invalidateContentCache } from "@/server/content/cache";
import { recordContentEvent } from "@/server/content/events";
import {
  collectMediaReferences,
  findUnpublishableMedia,
  refreshMediaUsage,
} from "@/server/content/media/usage";
import {
  deleteProjectRecord,
  findActiveProjectBySlug,
  findProject,
  insertProject,
  listActiveProjects,
  type ProjectRecord,
  updateProjectVersioned,
} from "@/server/content/projects/repository";
import {
  failure,
  infrastructureFailure,
  isPostgresError,
  success,
} from "@/server/content/result";

type VersionedProjectInput = {
  id: string;
  expectedUpdatedAt: string;
  actor: AdminSession;
};

function expectedDate(value: string): Date | undefined {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function versionFailure(record: ProjectRecord | undefined, expected: Date) {
  if (!record) return failure("NOT_FOUND", "Project not found");
  if (record.updatedAt.getTime() !== expected.getTime()) {
    return failure(
      "CONFLICT",
      "This project changed since it was opened. Reload before saving.",
    );
  }
}

function validationFailure(message: string) {
  return failure("VALIDATION_ERROR", message);
}

export async function createProject(input: {
  slug: string;
  draft: ProjectContent;
  actor: AdminSession;
  displayOrder?: number;
  featured?: boolean;
  featuredOrder?: number | null;
}): Promise<ActionResult<ProjectRecord>> {
  const slug = projectSlugSchema.safeParse(input.slug);
  const draft = projectContentSchema.safeParse(input.draft);

  if (!slug.success || !draft.success) {
    return validationFailure("Project content is invalid");
  }

  try {
    const result = await db.transaction(async (transaction) => {
      if (await findActiveProjectBySlug(transaction, slug.data)) {
        return validationFailure("An active project already uses this slug");
      }
      const record = await insertProject(transaction, {
        slug: slug.data,
        draftContent: draft.data,
        displayOrder: input.displayOrder,
        featured: input.featured,
        featuredOrder: input.featuredOrder,
      });

      await refreshMediaUsage(
        transaction,
        { type: "project", id: record.id, snapshot: "draft" },
        collectMediaReferences(draft.data),
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "project", id: record.id },
        "create",
        { slug: record.slug },
      );

      return success(record);
    });

    return result;
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return validationFailure("An active project already uses this slug");
    }

    return infrastructureFailure();
  }
}

export async function saveProjectDraft(
  input: VersionedProjectInput & {
    slug: string;
    draft: ProjectContent;
  },
): Promise<ActionResult<ProjectRecord>> {
  const slug = projectSlugSchema.safeParse(input.slug);
  const draft = projectContentSchema.safeParse(input.draft);
  const expected = expectedDate(input.expectedUpdatedAt);

  if (!slug.success || !draft.success || !expected) {
    return validationFailure("Project content is invalid");
  }

  try {
    return await db.transaction(async (transaction) => {
      const current = await findProject(transaction, input.id);
      const conflict = versionFailure(current, expected);

      if (conflict) return conflict;
      if (!current || current.deletedAt)
        return failure("NOT_FOUND", "Project not found");
      if (current.firstPublishedAt && current.slug !== slug.data) {
        return validationFailure("A published project slug cannot be changed");
      }
      if (await findActiveProjectBySlug(transaction, slug.data, current.id)) {
        return validationFailure("An active project already uses this slug");
      }

      const updated = await updateProjectVersioned(
        transaction,
        current.id,
        expected,
        { slug: slug.data, draftContent: draft.data, updatedAt: new Date() },
      );

      if (!updated) return failure("CONFLICT", "Project changed while saving");
      await refreshMediaUsage(
        transaction,
        { type: "project", id: current.id, snapshot: "draft" },
        collectMediaReferences(draft.data),
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "project", id: current.id },
        "update",
        { slug: updated.slug },
      );

      return success(updated);
    });
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return validationFailure("An active project already uses this slug");
    }

    return infrastructureFailure();
  }
}

export async function publishProject(
  input: VersionedProjectInput,
): Promise<ActionResult<ProjectRecord>> {
  const expected = expectedDate(input.expectedUpdatedAt);

  if (!expected) return validationFailure("Invalid project version");
  let slug = "";

  try {
    const result = await db.transaction(async (transaction) => {
      const current = await findProject(transaction, input.id);
      const conflict = versionFailure(current, expected);

      if (conflict) return conflict;
      if (!current || current.deletedAt)
        return failure("NOT_FOUND", "Project not found");
      const draft = projectContentSchema.safeParse(current.draftContent);

      if (!draft.success) return validationFailure("Project draft is invalid");
      const mediaReferences = collectMediaReferences(draft.data);

      if ((await findUnpublishableMedia(transaction, mediaReferences)).length) {
        return validationFailure(
          "Every attached image must exist and have useful alt text",
        );
      }

      const now = new Date();
      const updated = await updateProjectVersioned(
        transaction,
        current.id,
        expected,
        {
          publishedContent: draft.data,
          status: "published",
          firstPublishedAt: current.firstPublishedAt ?? now,
          publishedAt: now,
          updatedAt: now,
        },
      );

      if (!updated)
        return failure("CONFLICT", "Project changed while publishing");
      await refreshMediaUsage(
        transaction,
        { type: "project", id: current.id, snapshot: "published" },
        mediaReferences,
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "project", id: current.id },
        "publish",
        { slug: current.slug },
      );
      slug = current.slug;

      return success(updated);
    });

    invalidateContentCache(result, { type: "project", slug, event: "publish" });

    return result;
  } catch {
    return infrastructureFailure();
  }
}

async function versionedProjectTransition(
  input: VersionedProjectInput,
  event: "unpublish" | "trash" | "restore",
): Promise<ActionResult<ProjectRecord>> {
  const expected = expectedDate(input.expectedUpdatedAt);

  if (!expected) return validationFailure("Invalid project version");
  let slug = "";

  try {
    const result = await db.transaction(async (transaction) => {
      const current = await findProject(transaction, input.id);
      const conflict = versionFailure(current, expected);

      if (conflict) return conflict;
      if (!current) return failure("NOT_FOUND", "Project not found");
      if (event !== "restore" && current.deletedAt) {
        return failure("NOT_FOUND", "Project not found");
      }
      if (event === "restore" && !current.deletedAt) return success(current);
      if (
        event === "restore" &&
        (await findActiveProjectBySlug(transaction, current.slug, current.id))
      ) {
        return failure("CONFLICT", "An active project now uses this slug");
      }

      const now = new Date();
      const values =
        event === "unpublish"
          ? { status: "unpublished" as const, updatedAt: now }
          : event === "trash"
            ? { deletedAt: now, updatedAt: now }
            : { deletedAt: null, updatedAt: now };
      const updated = await updateProjectVersioned(
        transaction,
        current.id,
        expected,
        values,
      );

      if (!updated) return failure("CONFLICT", "Project changed during update");
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "project", id: current.id },
        event,
        { slug: current.slug },
      );
      slug = current.slug;

      return success(updated);
    });

    invalidateContentCache(result, { type: "project", slug, event });

    return result;
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return failure("CONFLICT", "An active project now uses this slug");
    }

    return infrastructureFailure();
  }
}

export const unpublishProject = (input: VersionedProjectInput) =>
  versionedProjectTransition(input, "unpublish");
export const trashProject = (input: VersionedProjectInput) =>
  versionedProjectTransition(input, "trash");
export const restoreProject = (input: VersionedProjectInput) =>
  versionedProjectTransition(input, "restore");

export async function deleteProjectPermanently(
  input: VersionedProjectInput,
): Promise<ActionResult<{ id: string }>> {
  const expected = expectedDate(input.expectedUpdatedAt);

  if (!expected) return validationFailure("Invalid project version");
  let slug = "";

  try {
    const result = await db.transaction(async (transaction) => {
      const current = await findProject(transaction, input.id);
      const conflict = versionFailure(current, expected);

      if (conflict) return conflict;
      if (!current) return failure("NOT_FOUND", "Project not found");
      if (!current.deletedAt) {
        return validationFailure(
          "Trash the project before permanently deleting it",
        );
      }
      await transaction
        .delete(mediaUsage)
        .where(
          and(
            eq(mediaUsage.contentType, "project"),
            eq(mediaUsage.contentId, current.id),
          ),
        );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "project", id: current.id },
        "permanent_delete",
        { slug: current.slug },
      );
      const deleted = await deleteProjectRecord(
        transaction,
        current.id,
        expected,
      );

      if (!deleted)
        return failure("CONFLICT", "Project changed during deletion");
      slug = current.slug;

      return success({ id: current.id });
    });

    invalidateContentCache(result, { type: "project", slug, event: "delete" });

    return result;
  } catch {
    return infrastructureFailure();
  }
}

export async function duplicateProject(input: {
  id: string;
  slug: string;
  actor: AdminSession;
  /** Optional edit to the copied draft (e.g. a "(copy)" name). */
  transformDraft?: (draft: ProjectContent) => ProjectContent;
}): Promise<ActionResult<ProjectRecord>> {
  const slug = projectSlugSchema.safeParse(input.slug);

  if (!slug.success) return validationFailure("Project slug is invalid");

  try {
    return await db.transaction(async (transaction) => {
      const source = await findProject(transaction, input.id);

      if (!source || source.deletedAt)
        return failure("NOT_FOUND", "Project not found");
      if (await findActiveProjectBySlug(transaction, slug.data)) {
        return validationFailure("An active project already uses this slug");
      }
      const transformed = input.transformDraft
        ? projectContentSchema.safeParse(
            input.transformDraft(source.draftContent),
          )
        : undefined;

      if (transformed && !transformed.success) {
        return validationFailure("Project content is invalid");
      }
      const draftContent = transformed?.data ?? source.draftContent;
      const record = await insertProject(transaction, {
        slug: slug.data,
        draftContent,
        displayOrder: source.displayOrder + 1,
        featured: false,
      });

      await refreshMediaUsage(
        transaction,
        { type: "project", id: record.id, snapshot: "draft" },
        collectMediaReferences(record.draftContent),
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "project", id: record.id },
        "create",
        { duplicatedFrom: source.id, slug: record.slug },
      );

      return success(record);
    });
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return validationFailure("An active project already uses this slug");
    }

    return infrastructureFailure();
  }
}

export async function reorderProjects(input: {
  orderedIds: string[];
  featuredIds?: string[];
  actor: AdminSession;
}): Promise<ActionResult<ProjectRecord[]>> {
  const featuredIds = input.featuredIds;

  if (
    new Set(input.orderedIds).size !== input.orderedIds.length ||
    (featuredIds && new Set(featuredIds).size !== featuredIds.length) ||
    featuredIds?.some((id) => !input.orderedIds.includes(id))
  ) {
    return validationFailure("Project order is invalid");
  }

  try {
    const result = await db.transaction(async (transaction) => {
      const active = await listActiveProjects(transaction);

      if (
        active.length !== input.orderedIds.length ||
        active.some((record) => !input.orderedIds.includes(record.id))
      ) {
        return failure("CONFLICT", "Project list changed before reordering");
      }

      const updated: ProjectRecord[] = [];

      for (
        let displayOrder = 0;
        displayOrder < input.orderedIds.length;
        displayOrder += 1
      ) {
        const id = input.orderedIds[displayOrder];
        const [record] = await transaction
          .update(projects)
          .set({
            displayOrder,
            ...(featuredIds
              ? {
                  featured: featuredIds.includes(id),
                  featuredOrder: featuredIds.includes(id)
                    ? featuredIds.indexOf(id)
                    : null,
                }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(projects.id, id))
          .returning();

        updated.push(record);
        await recordContentEvent(
          transaction,
          input.actor,
          { type: "project", id },
          "update",
          { displayOrder },
        );
      }

      return success(updated);
    });

    invalidateContentCache(result, {
      type: "project",
      slug: "",
      event: "reorder",
    });

    return result;
  } catch {
    return infrastructureFailure();
  }
}

/**
 * Turns the homepage feature on or off. `featured` and `featuredOrder` are
 * live columns (not part of the draft), so this takes effect immediately.
 * Featuring appends the project to the end of the featured list. The row's
 * `updatedAt` is kept, so an open editor does not hit a false conflict.
 */
export async function setProjectFeatured(input: {
  id: string;
  featured: boolean;
  actor: AdminSession;
}): Promise<ActionResult<ProjectRecord>> {
  try {
    const result = await db.transaction(async (transaction) => {
      const record = await findProject(transaction, input.id);

      if (!record || record.deletedAt) {
        return failure("NOT_FOUND", "Project not found");
      }
      if (record.featured === input.featured) return success(record);

      const active = await listActiveProjects(transaction);
      const featuredOrder = input.featured
        ? active.reduce(
            (max, row) =>
              row.featured && row.featuredOrder !== null
                ? Math.max(max, row.featuredOrder)
                : max,
            -1,
          ) + 1
        : null;
      const [updated] = await transaction
        .update(projects)
        .set({
          featured: input.featured,
          featuredOrder,
          updatedAt: record.updatedAt,
        })
        .where(eq(projects.id, input.id))
        .returning();

      await recordContentEvent(
        transaction,
        input.actor,
        { type: "project", id: input.id },
        "update",
        { featured: input.featured },
      );

      return success(updated);
    });

    if (result.ok) {
      invalidateContentCache(result, {
        type: "project",
        slug: result.data.slug,
        event: "reorder",
      });
    }

    return result;
  } catch {
    return infrastructureFailure();
  }
}

/**
 * Sets the order of the homepage's featured projects. `featuredOrder` is a
 * live column, so this applies immediately. `orderedIds` must be exactly the
 * set of active featured projects, otherwise nothing changes.
 */
export async function reorderFeaturedProjects(input: {
  orderedIds: string[];
  actor: AdminSession;
}): Promise<ActionResult<ProjectRecord[]>> {
  if (new Set(input.orderedIds).size !== input.orderedIds.length) {
    return validationFailure("Project order is invalid");
  }

  try {
    const result = await db.transaction(async (transaction) => {
      const featured = (await listActiveProjects(transaction)).filter(
        (row) => row.featured,
      );

      if (
        featured.length !== input.orderedIds.length ||
        featured.some((row) => !input.orderedIds.includes(row.id))
      ) {
        return failure(
          "CONFLICT",
          "The featured projects changed. Reload and try again.",
        );
      }

      const updated: ProjectRecord[] = [];

      for (let index = 0; index < input.orderedIds.length; index += 1) {
        const id = input.orderedIds[index];
        const row = featured.find((candidate) => candidate.id === id)!;
        const [record] = await transaction
          .update(projects)
          .set({ featuredOrder: index, updatedAt: row.updatedAt })
          .where(eq(projects.id, id))
          .returning();

        updated.push(record);
        await recordContentEvent(
          transaction,
          input.actor,
          { type: "project", id },
          "update",
          { featuredOrder: index },
        );
      }

      return success(updated);
    });

    invalidateContentCache(result, {
      type: "project",
      slug: "",
      event: "reorder",
    });

    return result;
  } catch {
    return infrastructureFailure();
  }
}
