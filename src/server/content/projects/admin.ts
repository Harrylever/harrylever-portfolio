import type { ActionResult } from "@/domain/content/action-result";
import type { ProjectRecord } from "@/server/content/projects/repository";

import { asc, desc, eq, isNotNull, isNull } from "drizzle-orm";

import {
  type ProjectContent,
  projectContentSchema,
} from "@/domain/content/project";
import { projectSlugSchema } from "@/domain/content/shared";
import {
  duplicateName,
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
  createProject,
  deleteProjectPermanently,
  duplicateProject,
  publishProject,
  reorderProjects,
  restoreProject,
  saveProjectDraft,
  trashProject,
  unpublishProject,
} from "@/server/content/projects/service";
import { failure, success } from "@/server/content/result";
import { db } from "@/server/db/client";
import { projects } from "@/server/db/schema/content";

/** Serializable snapshot handed to the project editor. */
export type ProjectEditorState = {
  id: string;
  slug: string;
  draft: ProjectContent;
  status: LifecycleStatus;
  /** Once first published, the public URL is permanent. */
  slugLocked: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
  publishedAt: string | null;
  deletedAt: string | null;
};

export type ProjectTransition = "publish" | "unpublish" | "trash" | "restore";

function hasChanges(record: ProjectRecord) {
  return (
    formSnapshot(record.draftContent) !== formSnapshot(record.publishedContent)
  );
}

export function toProjectEditorState(
  record: ProjectRecord,
): ProjectEditorState {
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

function toRow(record: ProjectRecord): AdminContentRow {
  return {
    id: record.id,
    slug: record.slug,
    title: record.draftContent.name,
    status: record.status,
    hasUnpublishedChanges: hasChanges(record),
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    deletedAt: record.deletedAt?.toISOString() ?? null,
    featured: record.featured,
  };
}

export async function listProjectsForAdmin(
  query: AdminListQuery,
): Promise<AdminContentRow[]> {
  const records = await db
    .select()
    .from(projects)
    .where(
      query.view === "trash"
        ? isNotNull(projects.deletedAt)
        : isNull(projects.deletedAt),
    )
    .orderBy(
      ...(query.view === "trash"
        ? [desc(projects.deletedAt)]
        : [asc(projects.displayOrder), asc(projects.createdAt)]),
    );

  return filterRows(records.map(toRow), query);
}

export async function readProjectForEditing(
  id: string,
): Promise<ProjectEditorState | null> {
  if (!isId(id)) return null;
  const [record] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  return record ? toProjectEditorState(record) : null;
}

function parseInput(slugInput: unknown, draftInput: unknown) {
  const slug = projectSlugSchema.safeParse(slugInput);
  const draft = projectContentSchema.safeParse(draftInput);

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
  result: ActionResult<ProjectRecord>,
): ActionResult<ProjectEditorState> {
  const mapped = withFieldErrors(result);

  return mapped.ok ? success(toProjectEditorState(mapped.data)) : mapped;
}

export async function runCreateProject(
  input: { slug: unknown; draft: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<ProjectEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const parsed = parseInput(input?.slug, input?.draft);

  if (parsed.failure) return parsed.failure;
  const actor = auth.session;

  return editorResult(
    await guarded(() =>
      createProject({ slug: parsed.slug, draft: parsed.draft, actor }),
    ),
  );
}

export async function runSaveProject(
  input: {
    id: unknown;
    slug: unknown;
    draft: unknown;
    expectedUpdatedAt: unknown;
  },
  { authorize }: AdminDependencies,
): Promise<ActionResult<ProjectEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const { id, expectedUpdatedAt } = input ?? {};

  if (!isId(id) || !isVersion(expectedUpdatedAt)) return invalidRequest();
  const parsed = parseInput(input.slug, input.draft);

  if (parsed.failure) return parsed.failure;
  const actor = auth.session;

  return editorResult(
    await guarded(() =>
      saveProjectDraft({
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
  publish: publishProject,
  unpublish: unpublishProject,
  trash: trashProject,
  restore: restoreProject,
} as const;

export async function runProjectTransition(
  event: ProjectTransition,
  input: { id: unknown; expectedUpdatedAt: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<ProjectEditorState>> {
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

export async function runDeleteProject(
  input: { id: unknown; expectedUpdatedAt: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<{ id: string }>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const { id, expectedUpdatedAt } = input ?? {};

  if (!isId(id) || !isVersion(expectedUpdatedAt)) return invalidRequest();
  const actor = auth.session;

  return guarded(() =>
    deleteProjectPermanently({ id, expectedUpdatedAt, actor }),
  );
}

export async function runDuplicateProject(
  input: { id: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<ProjectEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const id = input?.id;

  if (!isId(id)) return invalidRequest();
  const actor = auth.session;

  return editorResult(
    await guarded(async () => {
      const [source] = await db
        .select({ slug: projects.slug })
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      if (!source) return failure("NOT_FOUND", "Project not found");
      const taken = await db
        .select({ slug: projects.slug })
        .from(projects)
        .where(isNull(projects.deletedAt));

      return duplicateProject({
        id,
        transformDraft: (draft) => ({
          ...draft,
          name: duplicateName(draft.name, 140),
        }),
        slug: suggestDuplicateSlug(
          source.slug,
          taken.map((row) => row.slug),
        ),
        actor,
      });
    }),
  );
}

export async function runReorderProjects(
  input: { orderedIds: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<{ ids: string[] }>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const orderedIds = input?.orderedIds;

  if (!Array.isArray(orderedIds) || !orderedIds.every(isId)) {
    return invalidRequest();
  }
  const actor = auth.session;
  const result = await guarded(() => reorderProjects({ orderedIds, actor }));

  return result.ok
    ? success({ ids: result.data.map((row) => row.id) })
    : result;
}
