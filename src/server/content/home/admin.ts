import type { ActionResult } from "@/domain/content/action-result";
import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";
import type { HomeSectionRecord } from "@/server/content/home/repository";

import { asc, eq, inArray } from "drizzle-orm";

import { homeSectionSchema, homeSectionTypes } from "@/domain/content/home";
import { formSnapshot } from "@/lib/admin/content-forms";
import {
  homeFieldErrors,
  homeSectionNames,
  isHomeSectionType,
  sectionSummary,
} from "@/lib/admin/home-forms";
import {
  type AdminDependencies,
  authorizeOrFail,
  guarded,
  invalidRequest,
  isVersion,
} from "@/server/content/admin-actions";
import {
  publishHomepage,
  reorderHomeDraft,
  saveHomeSectionDraft,
} from "@/server/content/home/service";
import { collectMediaReferences } from "@/server/content/media/usage";
import { failure, success } from "@/server/content/result";
import { db } from "@/server/db/client";
import { homeSections, mediaAssets } from "@/server/db/schema/content";

/** One line of the homepage running order. */
export type HomeSectionRow = {
  type: HomeSectionType;
  name: string;
  summary: string;
  exists: boolean;
  visible: boolean;
  position: number;
  updatedAt: string | null;
  published: boolean;
  publishedVisible: boolean | null;
  hasUnpublishedChanges: boolean;
};

export type HomeOverview = {
  sections: HomeSectionRow[];
  /** All eight sections exist (required to reorder and publish). */
  complete: boolean;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
};

export type HomeSectionEditorState = {
  type: HomeSectionType;
  draft: HomeSectionContent | null;
  visible: boolean;
  position: number;
  updatedAt: string | null;
  published: boolean;
  hasUnpublishedChanges: boolean;
};

function hasChanges(record: HomeSectionRecord) {
  return (
    !record.publishedContent ||
    !record.publishedAt ||
    formSnapshot(record.draftContent) !==
      formSnapshot(record.publishedContent) ||
    record.draftVisible !== record.publishedVisible ||
    record.draftPosition !== record.publishedPosition
  );
}

function toRow(record: HomeSectionRecord): HomeSectionRow {
  return {
    type: record.type,
    name: homeSectionNames[record.type],
    summary: sectionSummary(record.draftContent),
    exists: true,
    visible: record.draftVisible,
    position: record.draftPosition,
    updatedAt: record.updatedAt.toISOString(),
    published: Boolean(record.publishedAt),
    publishedVisible: record.publishedAt ? record.publishedVisible : null,
    hasUnpublishedChanges: hasChanges(record),
  };
}

function toEditorState(record: HomeSectionRecord): HomeSectionEditorState {
  return {
    type: record.type,
    draft: record.draftContent,
    visible: record.draftVisible,
    position: record.draftPosition,
    updatedAt: record.updatedAt.toISOString(),
    published: Boolean(record.publishedAt),
    hasUnpublishedChanges: hasChanges(record),
  };
}

function loadSections() {
  return db
    .select()
    .from(homeSections)
    .orderBy(asc(homeSections.draftPosition));
}

function nextPosition(records: HomeSectionRecord[]) {
  return records.reduce(
    (max, record) => Math.max(max, record.draftPosition + 1),
    0,
  );
}

function overviewOf(records: HomeSectionRecord[]): HomeOverview {
  const existing = records.map(toRow);
  const missing = homeSectionTypes
    .filter((type) => !records.some((record) => record.type === type))
    .map(
      (type, index): HomeSectionRow => ({
        type,
        name: homeSectionNames[type],
        summary: sectionSummary(null),
        exists: false,
        visible: true,
        position: existing.length + index,
        updatedAt: null,
        published: false,
        publishedVisible: null,
        hasUnpublishedChanges: false,
      }),
    );
  const published = records
    .map((record) => record.publishedAt?.getTime() ?? 0)
    .filter(Boolean);

  return {
    sections: [...existing, ...missing],
    complete: missing.length === 0,
    hasUnpublishedChanges: existing.some((row) => row.hasUnpublishedChanges),
    publishedAt: published.length
      ? new Date(Math.max(...published)).toISOString()
      : null,
  };
}

export async function readHomeForAdmin(): Promise<HomeOverview> {
  return overviewOf(await loadSections());
}

export async function readHomeSectionForEditing(
  type: unknown,
): Promise<HomeSectionEditorState | null> {
  if (!isHomeSectionType(type)) return null;
  const records = await loadSections();
  const record = records.find((item) => item.type === type);

  if (record) return toEditorState(record);

  return {
    type,
    draft: null,
    visible: true,
    position: nextPosition(records),
    updatedAt: null,
    published: false,
    hasUnpublishedChanges: false,
  };
}

function isExpected(value: unknown): value is string | null {
  return value === null || isVersion(value);
}

export async function runSaveHomeSection(
  input: {
    type: unknown;
    draft: unknown;
    visible: unknown;
    expectedUpdatedAt: unknown;
  },
  { authorize }: AdminDependencies,
): Promise<ActionResult<HomeSectionEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const { type, draft, visible, expectedUpdatedAt } = input ?? {};

  if (
    !isHomeSectionType(type) ||
    typeof visible !== "boolean" ||
    !isExpected(expectedUpdatedAt)
  ) {
    return invalidRequest();
  }
  const fieldErrors = homeFieldErrors(draft);

  if (fieldErrors) {
    return failure(
      "VALIDATION_ERROR",
      "Fix the highlighted fields, then save again.",
      fieldErrors,
    );
  }
  const content = homeSectionSchema.parse(draft);

  if (content.type !== type) {
    return failure(
      "VALIDATION_ERROR",
      "This content belongs to a different section.",
    );
  }
  const actor = auth.session;

  return guarded(async () => {
    const records = await loadSections();
    const current = records.find((record) => record.type === type);
    const result = await saveHomeSectionDraft({
      type,
      draft: content,
      visible,
      position: current?.draftPosition ?? nextPosition(records),
      expectedUpdatedAt,
      actor,
    });

    return result.ok ? success(toEditorState(result.data)) : result;
  });
}

export async function runSetHomeSectionVisibility(
  input: { type: unknown; visible: unknown; expectedUpdatedAt: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<HomeOverview>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const { type, visible, expectedUpdatedAt } = input ?? {};

  if (
    !isHomeSectionType(type) ||
    typeof visible !== "boolean" ||
    !isVersion(expectedUpdatedAt)
  ) {
    return invalidRequest();
  }
  const actor = auth.session;

  return guarded(async () => {
    const [current] = await db
      .select()
      .from(homeSections)
      .where(eq(homeSections.type, type))
      .limit(1);

    if (!current) return failure("NOT_FOUND", "Create this section first.");
    const result = await saveHomeSectionDraft({
      type,
      draft: current.draftContent,
      visible,
      position: current.draftPosition,
      expectedUpdatedAt,
      actor,
    });

    return result.ok ? success(overviewOf(await loadSections())) : result;
  });
}

export async function runReorderHome(
  input: { order: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<HomeOverview>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const order = input?.order;

  if (
    !Array.isArray(order) ||
    order.length !== homeSectionTypes.length ||
    !order.every(
      (item) =>
        item &&
        typeof item === "object" &&
        isHomeSectionType(item.type) &&
        isVersion(item.expectedUpdatedAt),
    )
  ) {
    return invalidRequest();
  }
  const actor = auth.session;
  const sections = order.map((item) => ({
    type: item.type as HomeSectionType,
    expectedUpdatedAt: item.expectedUpdatedAt as string,
  }));

  return guarded(async () => {
    const result = await reorderHomeDraft({ sections, actor });

    return result.ok ? success(overviewOf(await loadSections())) : result;
  });
}

/** Why a saved section draft can't be published, if anything. */
async function publishProblems(records: HomeSectionRecord[]) {
  const problems: Record<string, string[]> = {};
  const references = records.map((record) => ({
    record,
    ids: Array.from(
      new Set(
        collectMediaReferences(record.draftContent).map((ref) => ref.assetId),
      ),
    ),
  }));
  const allIds = Array.from(new Set(references.flatMap((item) => item.ids)));
  const usable = new Set(
    allIds.length
      ? (
          await db
            .select({ id: mediaAssets.id, altText: mediaAssets.altText })
            .from(mediaAssets)
            .where(inArray(mediaAssets.id, allIds))
        )
          .filter((asset) => asset.altText.trim())
          .map((asset) => asset.id)
      : [],
  );

  for (const { record, ids } of references) {
    if (homeFieldErrors(record.draftContent)) {
      (problems[record.type] ??= []).push(
        "the saved draft is incomplete; open it and save again",
      );
    }
    if (ids.some((id) => !usable.has(id))) {
      (problems[record.type] ??= []).push(
        "an attached image is missing or has no alt text",
      );
    }
  }

  return problems;
}

export async function runPublishHomepage(
  input: { expected: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<HomeOverview>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const expected = input?.expected;

  if (
    !Array.isArray(expected) ||
    expected.length !== homeSectionTypes.length ||
    new Set(expected.map((item) => item?.type)).size !==
      homeSectionTypes.length ||
    !expected.every(
      (item) =>
        item &&
        typeof item === "object" &&
        isHomeSectionType(item.type) &&
        isExpected(item.updatedAt),
    )
  ) {
    return invalidRequest();
  }
  const actor = auth.session;

  return guarded(async () => {
    const records = await loadSections();
    const missing = homeSectionTypes.filter(
      (type) => !records.some((record) => record.type === type),
    );

    if (missing.length) {
      return failure(
        "VALIDATION_ERROR",
        `Nothing was published. Create every section first; missing: ${missing
          .map((type) => homeSectionNames[type])
          .join(", ")}.`,
      );
    }
    const stale = records.some(
      (record) =>
        expected.find((item) => item.type === record.type)?.updatedAt !==
        record.updatedAt.toISOString(),
    );

    if (stale) {
      return failure(
        "CONFLICT",
        "The homepage changed in another tab or session. Nothing was published; reload to review it first.",
      );
    }
    const problems = await publishProblems(records);

    if (Object.keys(problems).length) {
      const detail = Object.entries(problems)
        .map(
          ([type, messages]) =>
            `${homeSectionNames[type as HomeSectionType]}: ${messages.join("; ")}.`,
        )
        .join(" ");

      return failure(
        "VALIDATION_ERROR",
        `Nothing was published. ${detail}`,
        problems,
      );
    }
    const result = await publishHomepage(actor);

    if (!result.ok) {
      return failure(
        result.error.code,
        result.error.code === "CONFLICT"
          ? "The homepage changed while publishing. Nothing was published; reload and try again."
          : `Nothing was published. ${result.error.message.replace(/\.$/, "")}.`,
      );
    }

    return success(overviewOf(await loadSections()));
  });
}
