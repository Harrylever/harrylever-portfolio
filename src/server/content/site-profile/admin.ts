import type { ActionResult } from "@/domain/content/action-result";
import type { AdminSession } from "@/server/auth/require-admin";
import type { SiteProfileRecord } from "@/server/content/site-profile/repository";

import {
  type SiteProfileContent,
  siteProfileContentSchema,
} from "@/domain/content/site-profile";
import { AdminAuthorizationError } from "@/server/auth/require-admin";
import { db } from "@/server/db/client";
import { siteProfile } from "@/server/db/schema/content";
import { failure, success } from "@/server/content/result";
import {
  publishSiteProfile,
  saveSiteProfileDraft,
} from "@/server/content/site-profile/service";

/** Serializable snapshot handed to the settings form. */
export type SiteProfileEditorState = {
  draft: SiteProfileContent;
  updatedAt: string;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
};

type Authorize = () => Promise<AdminSession>;

/** Order-independent comparison of two JSON values. */
function sameJson(left: unknown, right: unknown): boolean {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, canonical(item)]),
      );
    }

    return value;
  };

  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function toEditorState(record: SiteProfileRecord): SiteProfileEditorState {
  return {
    draft: record.draftContent,
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    hasUnpublishedChanges: !sameJson(
      record.draftContent,
      record.publishedContent,
    ),
  };
}

async function authorizeOrFail(authorize: Authorize) {
  try {
    return { session: await authorize() };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return {
        failure: failure("UNAUTHORIZED", "Sign in again to save changes."),
      };
    }
    throw error;
  }
}

function fieldErrorsFor(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";

    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}

export async function readSiteProfileForEditing(
  _actor: AdminSession,
): Promise<SiteProfileEditorState | null> {
  const [record] = await db.select().from(siteProfile).limit(1);

  return record ? toEditorState(record) : null;
}

export async function runSaveSiteProfile(
  input: { draft: unknown; expectedUpdatedAt: string | null },
  { authorize }: { authorize: Authorize },
): Promise<ActionResult<SiteProfileEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;

  const parsed = siteProfileContentSchema.safeParse(input.draft);

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "Fix the highlighted fields, then save again.",
      fieldErrorsFor(parsed.error.issues),
    );
  }
  if (
    input.expectedUpdatedAt !== null &&
    typeof input.expectedUpdatedAt !== "string"
  ) {
    return failure("VALIDATION_ERROR", "Invalid site profile version");
  }

  const result = await saveSiteProfileDraft({
    draft: parsed.data,
    expectedUpdatedAt: input.expectedUpdatedAt,
    actor: auth.session,
  });

  return result.ok ? success(toEditorState(result.data)) : result;
}

export async function runPublishSiteProfile(
  input: { expectedUpdatedAt: string },
  { authorize }: { authorize: Authorize },
): Promise<ActionResult<SiteProfileEditorState>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  if (typeof input.expectedUpdatedAt !== "string") {
    return failure("VALIDATION_ERROR", "Invalid site profile version");
  }

  const result = await publishSiteProfile({
    expectedUpdatedAt: input.expectedUpdatedAt,
    actor: auth.session,
  });

  return result.ok ? success(toEditorState(result.data)) : result;
}
