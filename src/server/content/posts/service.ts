import type { ActionResult } from "@/domain/content/action-result";
import type { PostContent } from "@/domain/content/post";
import type { AdminSession } from "@/server/auth/require-admin";

import { and, eq } from "drizzle-orm";

import { postContentSchema } from "@/domain/content/post";
import { postSlugSchema } from "@/domain/content/shared";
import { db } from "@/server/db/client";
import { mediaUsage } from "@/server/db/schema/content";
import { invalidateContentCache } from "@/server/content/cache";
import { recordContentEvent } from "@/server/content/events";
import {
  collectMediaReferences,
  findUnpublishableMedia,
  refreshMediaUsage,
} from "@/server/content/media/usage";
import {
  deletePostRecord,
  findActivePostBySlug,
  findPost,
  insertPost,
  type PostRecord,
  updatePostVersioned,
} from "@/server/content/posts/repository";
import {
  failure,
  infrastructureFailure,
  isPostgresError,
  success,
} from "@/server/content/result";

type VersionedPostInput = {
  id: string;
  expectedUpdatedAt: string;
  actor: AdminSession;
};

function expectedDate(value: string): Date | undefined {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validationFailure(message: string) {
  return failure("VALIDATION_ERROR", message);
}

function versionFailure(record: PostRecord | undefined, expected: Date) {
  if (!record) return failure("NOT_FOUND", "Post not found");
  if (record.updatedAt.getTime() !== expected.getTime()) {
    return failure(
      "CONFLICT",
      "This post changed since it was opened. Reload before saving.",
    );
  }
}

export async function createPost(input: {
  slug: string;
  draft: PostContent;
  actor: AdminSession;
}): Promise<ActionResult<PostRecord>> {
  const slug = postSlugSchema.safeParse(input.slug);
  const draft = postContentSchema.safeParse(input.draft);

  if (!slug.success || !draft.success) {
    return validationFailure("Post content is invalid");
  }

  try {
    return await db.transaction(async (transaction) => {
      if (await findActivePostBySlug(transaction, slug.data)) {
        return validationFailure("An active post already uses this slug");
      }
      const record = await insertPost(transaction, {
        slug: slug.data,
        draftContent: draft.data,
      });

      await refreshMediaUsage(
        transaction,
        { type: "post", id: record.id, snapshot: "draft" },
        collectMediaReferences(draft.data),
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "post", id: record.id },
        "create",
        { slug: record.slug },
      );

      return success(record);
    });
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return validationFailure("An active post already uses this slug");
    }

    return infrastructureFailure();
  }
}

export async function savePostDraft(
  input: VersionedPostInput & {
    slug: string;
    draft: PostContent;
  },
): Promise<ActionResult<PostRecord>> {
  const slug = postSlugSchema.safeParse(input.slug);
  const draft = postContentSchema.safeParse(input.draft);
  const expected = expectedDate(input.expectedUpdatedAt);

  if (!slug.success || !draft.success || !expected) {
    return validationFailure("Post content is invalid");
  }

  try {
    return await db.transaction(async (transaction) => {
      const current = await findPost(transaction, input.id);
      const conflict = versionFailure(current, expected);

      if (conflict) return conflict;
      if (!current || current.deletedAt)
        return failure("NOT_FOUND", "Post not found");
      if (current.firstPublishedAt && current.slug !== slug.data) {
        return validationFailure("A published post slug cannot be changed");
      }
      if (await findActivePostBySlug(transaction, slug.data, current.id)) {
        return validationFailure("An active post already uses this slug");
      }
      const updated = await updatePostVersioned(
        transaction,
        current.id,
        expected,
        {
          slug: slug.data,
          draftContent: draft.data,
          updatedAt: new Date(),
        },
      );

      if (!updated) return failure("CONFLICT", "Post changed while saving");
      await refreshMediaUsage(
        transaction,
        { type: "post", id: current.id, snapshot: "draft" },
        collectMediaReferences(draft.data),
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "post", id: current.id },
        "update",
        { slug: updated.slug },
      );

      return success(updated);
    });
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return validationFailure("An active post already uses this slug");
    }

    return infrastructureFailure();
  }
}

export async function publishPost(
  input: VersionedPostInput,
): Promise<ActionResult<PostRecord>> {
  const expected = expectedDate(input.expectedUpdatedAt);

  if (!expected) return validationFailure("Invalid post version");
  let slug = "";

  try {
    const result = await db.transaction(async (transaction) => {
      const current = await findPost(transaction, input.id);
      const conflict = versionFailure(current, expected);

      if (conflict) return conflict;
      if (!current || current.deletedAt)
        return failure("NOT_FOUND", "Post not found");
      const draft = postContentSchema.safeParse(current.draftContent);

      if (!draft.success) return validationFailure("Post draft is invalid");
      const mediaReferences = collectMediaReferences(draft.data);

      if ((await findUnpublishableMedia(transaction, mediaReferences)).length) {
        return validationFailure(
          "Every attached image must exist and have useful alt text",
        );
      }
      const now = new Date();
      const updated = await updatePostVersioned(
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

      if (!updated) return failure("CONFLICT", "Post changed while publishing");
      await refreshMediaUsage(
        transaction,
        { type: "post", id: current.id, snapshot: "published" },
        mediaReferences,
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "post", id: current.id },
        "publish",
        { slug: current.slug },
      );
      slug = current.slug;

      return success(updated);
    });

    invalidateContentCache(result, { type: "post", slug, event: "publish" });

    return result;
  } catch {
    return infrastructureFailure();
  }
}

async function versionedPostTransition(
  input: VersionedPostInput,
  event: "unpublish" | "trash" | "restore",
): Promise<ActionResult<PostRecord>> {
  const expected = expectedDate(input.expectedUpdatedAt);

  if (!expected) return validationFailure("Invalid post version");
  let slug = "";

  try {
    const result = await db.transaction(async (transaction) => {
      const current = await findPost(transaction, input.id);
      const conflict = versionFailure(current, expected);

      if (conflict) return conflict;
      if (!current) return failure("NOT_FOUND", "Post not found");
      if (event !== "restore" && current.deletedAt) {
        return failure("NOT_FOUND", "Post not found");
      }
      if (event === "restore" && !current.deletedAt) return success(current);
      if (
        event === "restore" &&
        (await findActivePostBySlug(transaction, current.slug, current.id))
      ) {
        return failure("CONFLICT", "An active post now uses this slug");
      }

      const now = new Date();
      const values =
        event === "unpublish"
          ? { status: "unpublished" as const, updatedAt: now }
          : event === "trash"
            ? { deletedAt: now, updatedAt: now }
            : { deletedAt: null, updatedAt: now };
      const updated = await updatePostVersioned(
        transaction,
        current.id,
        expected,
        values,
      );

      if (!updated) return failure("CONFLICT", "Post changed during update");
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "post", id: current.id },
        event,
        { slug: current.slug },
      );
      slug = current.slug;

      return success(updated);
    });

    invalidateContentCache(result, { type: "post", slug, event });

    return result;
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return failure("CONFLICT", "An active post now uses this slug");
    }

    return infrastructureFailure();
  }
}

export const unpublishPost = (input: VersionedPostInput) =>
  versionedPostTransition(input, "unpublish");
export const trashPost = (input: VersionedPostInput) =>
  versionedPostTransition(input, "trash");
export const restorePost = (input: VersionedPostInput) =>
  versionedPostTransition(input, "restore");

export async function deletePostPermanently(
  input: VersionedPostInput,
): Promise<ActionResult<{ id: string }>> {
  const expected = expectedDate(input.expectedUpdatedAt);

  if (!expected) return validationFailure("Invalid post version");
  let slug = "";

  try {
    const result = await db.transaction(async (transaction) => {
      const current = await findPost(transaction, input.id);
      const conflict = versionFailure(current, expected);

      if (conflict) return conflict;
      if (!current) return failure("NOT_FOUND", "Post not found");
      if (!current.deletedAt) {
        return validationFailure(
          "Trash the post before permanently deleting it",
        );
      }
      await transaction
        .delete(mediaUsage)
        .where(
          and(
            eq(mediaUsage.contentType, "post"),
            eq(mediaUsage.contentId, current.id),
          ),
        );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "post", id: current.id },
        "permanent_delete",
        { slug: current.slug },
      );
      const deleted = await deletePostRecord(transaction, current.id, expected);

      if (!deleted) return failure("CONFLICT", "Post changed during deletion");
      slug = current.slug;

      return success({ id: current.id });
    });

    invalidateContentCache(result, { type: "post", slug, event: "delete" });

    return result;
  } catch {
    return infrastructureFailure();
  }
}

export async function duplicatePost(input: {
  id: string;
  slug: string;
  actor: AdminSession;
  /** Optional edit to the copied draft (e.g. a "(copy)" name). */
  transformDraft?: (draft: PostContent) => PostContent;
}): Promise<ActionResult<PostRecord>> {
  const slug = postSlugSchema.safeParse(input.slug);

  if (!slug.success) return validationFailure("Post slug is invalid");

  try {
    return await db.transaction(async (transaction) => {
      const source = await findPost(transaction, input.id);

      if (!source || source.deletedAt)
        return failure("NOT_FOUND", "Post not found");
      if (await findActivePostBySlug(transaction, slug.data)) {
        return validationFailure("An active post already uses this slug");
      }
      const transformed = input.transformDraft
        ? postContentSchema.safeParse(input.transformDraft(source.draftContent))
        : undefined;

      if (transformed && !transformed.success) {
        return validationFailure("Post content is invalid");
      }
      const draftContent = transformed?.data ?? source.draftContent;
      const record = await insertPost(transaction, {
        slug: slug.data,
        draftContent,
      });

      await refreshMediaUsage(
        transaction,
        { type: "post", id: record.id, snapshot: "draft" },
        collectMediaReferences(record.draftContent),
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "post", id: record.id },
        "create",
        { duplicatedFrom: source.id, slug: record.slug },
      );

      return success(record);
    });
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return validationFailure("An active post already uses this slug");
    }

    return infrastructureFailure();
  }
}
