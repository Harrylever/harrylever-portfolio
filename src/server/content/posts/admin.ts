import type { ActionResult } from "@/domain/content/action-result";
import type { PostRecord } from "@/server/content/posts/repository";

import { desc, eq, isNotNull, isNull } from "drizzle-orm";

import { type PostContent, postContentSchema } from "@/domain/content/post";
import { postSlugSchema } from "@/domain/content/shared";
import {
  fieldErrorsFromIssues,
  formSnapshot,
  suggestDuplicateSlug,
} from "@/lib/admin/content-forms";
import {
  type AdminContentRow,
  type AdminDependencies,
  type AdminListQuery,
  type LifecycleStatus,
  authorizeOrFail,
  filterRows,
  guarded,
  invalidRequest,
  isId,
  isVersion,
  withFieldErrors,
} from "@/server/content/admin-actions";
import {
  createPost,
  deletePostPermanently,
  duplicatePost,
  publishPost,
  restorePost,
  savePostDraft,
  trashPost,
  unpublishPost,
} from "@/server/content/posts/service";
import { failure, success } from "@/server/content/result";
import { db } from "@/server/db/client";
import { posts } from "@/server/db/schema/content";

/** Serializable snapshot handed to the post editor. */
export type PostEditorState = {
  id: string;
  slug: string;
  draft: PostContent;
  status: LifecycleStatus;
  /** Once first published, the public URL is permanent. */
  slugLocked: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
  publishedAt: string | null;
  deletedAt: string | null;
};

export type PostTransition = "publish" | "unpublish" | "trash" | "restore";

function hasChanges(record: PostRecord) {
  return (
    formSnapshot(record.draftContent) !== formSnapshot(record.publishedContent)
  );
}

export function toPostEditorState(record: PostRecord): PostEditorState {
  return {
    id: record.id,
    slug: record.slug,
    draft: record.draftContent,
    status: record.status,
    slugLocked: record.firstPublishedAt !== null,
    hasUnpublishedChanges: hasChanges(record),
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    deletedAt: record.deletedAt?.toISOString() ?? null,
  };
}

function toRow(record: PostRecord): AdminContentRow {
  return {
    id: record.id,
    slug: record.slug,
    title: record.draftContent.title,
    status: record.status,
    hasUnpublishedChanges: hasChanges(record),
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    deletedAt: record.deletedAt?.toISOString() ?? null,
  };
}

export async function listPostsForAdmin(
  query: AdminListQuery,
): Promise<AdminContentRow[]> {
  const records = await db
    .select()
    .from(posts)
    .where(
      query.view === "trash"
        ? isNotNull(posts.deletedAt)
        : isNull(posts.deletedAt),
    )
    .orderBy(
      ...(query.view === "trash"
        ? [desc(posts.deletedAt)]
        : [desc(posts.updatedAt)]),
    );

  return filterRows(records.map(toRow), query);
}

export async function readPostForEditing(
  id: string,
): Promise<PostEditorState | null> {
  if (!isId(id)) return null;
  const [record] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  return record ? toPostEditorState(record) : null;
}

function parseInput(slugInput: unknown, draftInput: unknown) {
  const slug = postSlugSchema.safeParse(slugInput);
  const draft = postContentSchema.safeParse(draftInput);

  if (slug.success && draft.success) {
    return { slug: slug.data, draft: draft.data };
  }
  const fieldErrors = draft.success
    ? {}
    : fieldErrorsFromIssues(draft.error.issues);

  if (!slug.success) {
    fieldErrors.slug = slug.error.issues.map((issue) =>
      issue.message.startsWith("Invalid")
        ? "Use lowercase letters, numbers and hyphens."
        : issue.message,
    );
  }

  return {
    failure: failure(
      "VALIDATION_ERROR",
      "Fix the highlighted fields, then save again.",
      fieldErrors,
    ),
  };
}

function editorResult(
  result: ActionResult<PostRecord>,
): ActionResult<PostEditorState> {
  const mapped = withFieldErrors(result);

  return mapped.ok ? success(toPostEditorState(mapped.data)) : mapped;
}

export async function runCreatePost(
  input: { slug: unknown; draft: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<PostEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const parsed = parseInput(input?.slug, input?.draft);

  if (parsed.failure) return parsed.failure;
  const actor = auth.session;

  return editorResult(
    await guarded(() =>
      createPost({ slug: parsed.slug, draft: parsed.draft, actor }),
    ),
  );
}

export async function runSavePost(
  input: {
    id: unknown;
    slug: unknown;
    draft: unknown;
    expectedUpdatedAt: unknown;
  },
  { authorize }: AdminDependencies,
): Promise<ActionResult<PostEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const { id, expectedUpdatedAt } = input ?? {};

  if (!isId(id) || !isVersion(expectedUpdatedAt)) return invalidRequest();
  const parsed = parseInput(input.slug, input.draft);

  if (parsed.failure) return parsed.failure;
  const actor = auth.session;

  return editorResult(
    await guarded(() =>
      savePostDraft({
        id,
        expectedUpdatedAt,
        slug: parsed.slug,
        draft: parsed.draft,
        actor,
      }),
    ),
  );
}

const transitions = {
  publish: publishPost,
  unpublish: unpublishPost,
  trash: trashPost,
  restore: restorePost,
} as const;

export async function runPostTransition(
  event: PostTransition,
  input: { id: unknown; expectedUpdatedAt: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<PostEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const { id, expectedUpdatedAt } = input ?? {};

  if (
    !isId(id) ||
    !isVersion(expectedUpdatedAt) ||
    !Object.prototype.hasOwnProperty.call(transitions, event)
  ) {
    return invalidRequest();
  }
  const actor = auth.session;

  return editorResult(
    await guarded(() => transitions[event]({ id, expectedUpdatedAt, actor })),
  );
}

export async function runDeletePost(
  input: { id: unknown; expectedUpdatedAt: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<{ id: string }>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const { id, expectedUpdatedAt } = input ?? {};

  if (!isId(id) || !isVersion(expectedUpdatedAt)) return invalidRequest();
  const actor = auth.session;

  return guarded(() => deletePostPermanently({ id, expectedUpdatedAt, actor }));
}

export async function runDuplicatePost(
  input: { id: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<PostEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const id = input?.id;

  if (!isId(id)) return invalidRequest();
  const actor = auth.session;

  return editorResult(
    await guarded(async () => {
      const [source] = await db
        .select({ slug: posts.slug })
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);

      if (!source) return failure("NOT_FOUND", "Post not found");
      const taken = await db
        .select({ slug: posts.slug })
        .from(posts)
        .where(isNull(posts.deletedAt));

      return duplicatePost({
        id,
        slug: suggestDuplicateSlug(
          source.slug,
          taken.map((row) => row.slug),
        ),
        actor,
      });
    }),
  );
}
