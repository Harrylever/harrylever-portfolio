import type { ActionResult } from "@/domain/content/action-result";
import type { SiteProfileContent } from "@/domain/content/site-profile";
import type { AdminSession } from "@/server/auth/require-admin";

import { siteProfileContentSchema } from "@/domain/content/site-profile";
import { db } from "@/server/db/client";
import { invalidateCacheTags } from "@/server/content/cache";
import { recordContentEvent } from "@/server/content/events";
import {
  collectMediaReferences,
  findUnpublishableMedia,
  refreshMediaUsage,
} from "@/server/content/media/usage";
import {
  findSiteProfile,
  insertSiteProfile,
  type SiteProfileRecord,
  updateSiteProfileVersioned,
} from "@/server/content/site-profile/repository";
import {
  failure,
  infrastructureFailure,
  isPostgresError,
  success,
} from "@/server/content/result";

function parseExpected(value: string | null): Date | undefined {
  if (value === null) return;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function saveSiteProfileDraft(input: {
  draft: SiteProfileContent;
  expectedUpdatedAt: string | null;
  actor: AdminSession;
}): Promise<ActionResult<SiteProfileRecord>> {
  const draft = siteProfileContentSchema.safeParse(input.draft);
  const expected = parseExpected(input.expectedUpdatedAt);

  if (!draft.success || (input.expectedUpdatedAt !== null && !expected)) {
    return failure("VALIDATION_ERROR", "Site profile content is invalid");
  }

  try {
    return await db.transaction(async (transaction) => {
      const current = await findSiteProfile(transaction);

      if (!current) {
        if (input.expectedUpdatedAt !== null) {
          return failure("CONFLICT", "The site profile no longer exists");
        }
        const created = await insertSiteProfile(transaction, draft.data);

        await refreshMediaUsage(
          transaction,
          { type: "site_profile", id: created.id, snapshot: "draft" },
          collectMediaReferences(draft.data),
        );
        await recordContentEvent(
          transaction,
          input.actor,
          { type: "site_profile", id: created.id },
          "create",
        );

        return success(created);
      }
      if (!expected || current.updatedAt.getTime() !== expected.getTime()) {
        return failure("CONFLICT", "The site profile changed before saving");
      }
      const updated = await updateSiteProfileVersioned(
        transaction,
        current.id,
        expected,
        { draftContent: draft.data, updatedAt: new Date() },
      );

      if (!updated)
        return failure("CONFLICT", "The site profile changed while saving");
      await refreshMediaUsage(
        transaction,
        { type: "site_profile", id: current.id, snapshot: "draft" },
        collectMediaReferences(draft.data),
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "site_profile", id: current.id },
        "update",
      );

      return success(updated);
    });
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      return failure("CONFLICT", "The site profile already exists");
    }

    return infrastructureFailure();
  }
}

export async function publishSiteProfile(input: {
  expectedUpdatedAt: string;
  actor: AdminSession;
}): Promise<ActionResult<SiteProfileRecord>> {
  const expected = parseExpected(input.expectedUpdatedAt);

  if (!expected)
    return failure("VALIDATION_ERROR", "Invalid site profile version");

  try {
    const result = await db.transaction(async (transaction) => {
      const current = await findSiteProfile(transaction);

      if (!current) return failure("NOT_FOUND", "Site profile not found");
      if (current.updatedAt.getTime() !== expected.getTime()) {
        return failure(
          "CONFLICT",
          "The site profile changed before publishing",
        );
      }
      const draft = siteProfileContentSchema.safeParse(current.draftContent);

      if (!draft.success) {
        return failure("VALIDATION_ERROR", "Site profile draft is invalid");
      }
      const mediaReferences = collectMediaReferences(draft.data);

      if ((await findUnpublishableMedia(transaction, mediaReferences)).length) {
        return failure(
          "VALIDATION_ERROR",
          "Every attached image must exist and have useful alt text",
        );
      }
      const now = new Date();
      const updated = await updateSiteProfileVersioned(
        transaction,
        current.id,
        expected,
        {
          publishedContent: draft.data,
          firstPublishedAt: current.firstPublishedAt ?? now,
          publishedAt: now,
          updatedAt: now,
        },
      );

      if (!updated)
        return failure("CONFLICT", "The site profile changed while publishing");
      await refreshMediaUsage(
        transaction,
        { type: "site_profile", id: current.id, snapshot: "published" },
        mediaReferences,
      );
      await recordContentEvent(
        transaction,
        input.actor,
        { type: "site_profile", id: current.id },
        "publish",
      );

      return success(updated);
    });

    if (result.ok) {
      invalidateCacheTags(["site-profile", "home", "metadata", "sitemap"]);
    }

    return result;
  } catch {
    return infrastructureFailure();
  }
}
