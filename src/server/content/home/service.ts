import type { ActionResult } from "@/domain/content/action-result";
import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";
import type { AdminSession } from "@/server/auth/require-admin";

import { homeSectionSchema, homeSectionTypes } from "@/domain/content/home";
import { db } from "@/server/db/client";
import { invalidateCacheTags } from "@/server/content/cache";
import { recordContentEvent } from "@/server/content/events";
import {
  findHomeSection,
  insertHomeSection,
  listHomeSections,
  type HomeSectionRecord,
  updateHomeSectionVersioned,
} from "@/server/content/home/repository";
import {
  collectMediaReferences,
  refreshMediaUsage,
} from "@/server/content/media/usage";
import {
  failure,
  infrastructureFailure,
  isPostgresError,
  success,
} from "@/server/content/result";

function expectedDate(value: string | null): Date | undefined {
  if (value === null) return;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function saveHomeSectionDraft(input: {
  type: HomeSectionType;
  draft: HomeSectionContent;
  visible: boolean;
  position: number;
  expectedUpdatedAt: string | null;
  actor: AdminSession;
}): Promise<ActionResult<HomeSectionRecord>> {
  const draft = homeSectionSchema.safeParse(input.draft);
  const expected = expectedDate(input.expectedUpdatedAt);

  if (
    !draft.success ||
    draft.data.type !== input.type ||
    !Number.isInteger(input.position) ||
    input.position < 0 ||
    (input.expectedUpdatedAt !== null && !expected)
  ) {
    return failure("VALIDATION_ERROR", "Homepage section content is invalid");
  }

  try {
    return await db.transaction(async (transaction) => {
      const current = await findHomeSection(transaction, input.type);

      if (!current) {
        if (input.expectedUpdatedAt !== null) {
          return failure("CONFLICT", "The homepage section no longer exists");
        }
        const created = await insertHomeSection(transaction, {
          type: input.type,
          draftContent: draft.data,
          draftVisible: input.visible,
          draftPosition: input.position,
        });

        await refreshMediaUsage(
          transaction,
          { type: "home_section", id: created.id, snapshot: "draft" },
          collectMediaReferences(draft.data),
        );
        await recordContentEvent(
          transaction,
          input.actor,
          { type: "home_section", id: created.id },
          "create",
          { sectionType: input.type },
        );

        return success(created);
      }
      if (!expected || current.updatedAt.getTime() !== expected.getTime()) {
        return failure(
          "CONFLICT",
          "The homepage section changed before saving",
        );
      }
      const updated = await updateHomeSectionVersioned(
        transaction,
        current.id,
        expected,
        {
          draftContent: draft.data,
          draftVisible: input.visible,
          draftPosition: input.position,
          updatedAt: new Date(),
        },
      );

      if (!updated)
        return failure("CONFLICT", "The homepage section changed while saving");
      await refreshMediaUsage(
        transaction,
        { type: "home_section", id: current.id, snapshot: "draft" },
        collectMediaReferences(draft.data),
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "home_section", id: current.id },
        "update",
        { sectionType: input.type },
      );

      return success(updated);
    });
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return failure("CONFLICT", "The homepage section already exists");
    }

    return infrastructureFailure();
  }
}

export async function reorderHomeDraft(input: {
  sections: Array<{ type: HomeSectionType; expectedUpdatedAt: string }>;
  actor: AdminSession;
}): Promise<ActionResult<HomeSectionRecord[]>> {
  if (
    input.sections.length !== homeSectionTypes.length ||
    new Set(input.sections.map((section) => section.type)).size !==
      homeSectionTypes.length ||
    homeSectionTypes.some(
      (type) => !input.sections.some((section) => section.type === type),
    )
  ) {
    return failure(
      "VALIDATION_ERROR",
      "Homepage order must include every section once",
    );
  }

  try {
    return await db.transaction(async (transaction) => {
      const current = await listHomeSections(transaction);

      if (current.length !== homeSectionTypes.length) {
        return failure(
          "CONFLICT",
          "Homepage sections changed before reordering",
        );
      }
      const updated: HomeSectionRecord[] = [];

      for (let position = 0; position < input.sections.length; position += 1) {
        const item = input.sections[position];
        const expected = expectedDate(item.expectedUpdatedAt);
        const record = current.find((section) => section.type === item.type);

        if (
          !expected ||
          !record ||
          record.updatedAt.getTime() !== expected.getTime()
        ) {
          return failure(
            "CONFLICT",
            "Homepage sections changed before reordering",
          );
        }
        const changed = await updateHomeSectionVersioned(
          transaction,
          record.id,
          expected,
          { draftPosition: position, updatedAt: new Date() },
        );

        if (!changed) {
          return failure(
            "CONFLICT",
            "Homepage sections changed while reordering",
          );
        }
        updated.push(changed);
        await recordContentEvent(
          transaction,
          input.actor,
          { type: "home_section", id: record.id },
          "update",
          { sectionType: record.type, draftPosition: position },
        );
      }

      return success(updated);
    });
  } catch {
    return infrastructureFailure();
  }
}

export async function publishHomepage(
  actor: AdminSession,
): Promise<ActionResult<HomeSectionRecord[]>> {
  try {
    const result = await db.transaction(async (transaction) => {
      const current = await listHomeSections(transaction);

      if (
        current.length !== homeSectionTypes.length ||
        homeSectionTypes.some(
          (type) => !current.some((section) => section.type === type),
        )
      ) {
        return failure(
          "VALIDATION_ERROR",
          "Homepage requires all eight sections",
        );
      }

      const validated = current.map((section) => ({
        section,
        draft: homeSectionSchema.safeParse(section.draftContent),
      }));

      if (
        validated.some(
          ({ section, draft }) =>
            !draft.success || draft.data.type !== section.type,
        )
      ) {
        return failure(
          "VALIDATION_ERROR",
          "A homepage section draft is invalid",
        );
      }

      const now = new Date();
      const published: HomeSectionRecord[] = [];

      for (const item of validated) {
        if (!item.draft.success) {
          return failure(
            "VALIDATION_ERROR",
            "A homepage section draft is invalid",
          );
        }
        const updated = await updateHomeSectionVersioned(
          transaction,
          item.section.id,
          item.section.updatedAt,
          {
            publishedContent: item.draft.data,
            publishedVisible: item.section.draftVisible,
            publishedPosition: item.section.draftPosition,
            firstPublishedAt: item.section.firstPublishedAt ?? now,
            publishedAt: now,
            updatedAt: now,
          },
        );

        if (!updated)
          return failure("CONFLICT", "Homepage changed while publishing");
        await refreshMediaUsage(
          transaction,
          { type: "home_section", id: item.section.id, snapshot: "published" },
          collectMediaReferences(item.draft.data),
        );
        await recordContentEvent(
          transaction,
          actor,
          { type: "home_section", id: item.section.id },
          "publish",
          { sectionType: item.section.type },
        );
        published.push(updated);
      }

      return success(published);
    });

    if (result.ok) invalidateCacheTags(["home"]);

    return result;
  } catch {
    return infrastructureFailure();
  }
}
