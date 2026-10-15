import type {
  ActionFailure,
  ActionResult,
} from "@/domain/content/action-result";
import type { MediaUsageRef } from "@/lib/admin/media-usage";
import type { MediaAssetRecord } from "@/server/content/media/repository";

import { asc, inArray } from "drizzle-orm";
import { z } from "zod";

import { homeSectionNames } from "@/lib/admin/home-forms";
import { validateAltText } from "@/lib/admin/media-upload";
import { usedByMessage } from "@/lib/admin/media-usage";
import {
  type AdminDependencies,
  authorizeOrFail,
  guarded,
  invalidRequest,
  isId,
} from "@/server/content/admin-actions";
import { findMediaAsset } from "@/server/content/media/repository";
import {
  type MediaResult,
  deleteMediaAsset,
  listMedia,
  registerUploadedAsset,
  updateAssetText,
} from "@/server/content/media/service";
import { failure, success } from "@/server/content/result";
import { db } from "@/server/db/client";
import {
  homeSections,
  mediaUsage,
  posts,
  projects,
} from "@/server/db/schema/content";

/** A library entry: what the admin UI shows; no Cloudinary internals. */
export type AdminMediaAsset = {
  id: string;
  secureUrl: string;
  altText: string;
  caption: string | null;
  width: number;
  height: number;
  bytes: number;
  format: string;
  createdAt: string;
  usage: MediaUsageRef[];
};

type RegistrationDependencies = NonNullable<
  Parameters<typeof registerUploadedAsset>[2]
>;
export type MediaAdminDependencies = AdminDependencies & {
  /** Cloudinary gateway overrides (tests and the E2E fake). */
  media?: RegistrationDependencies;
};

type UsageRow = typeof mediaUsage.$inferSelect;

async function resolveUsage(rows: UsageRow[]): Promise<MediaUsageRef[]> {
  const idsOf = (type: UsageRow["contentType"]) =>
    Array.from(
      new Set(
        rows
          .filter((row) => row.contentType === type)
          .map((row) => row.contentId),
      ),
    );
  const projectIds = idsOf("project");
  const postIds = idsOf("post");
  const homeIds = idsOf("home_section");
  const [projectRows, postRows, homeRows] = await Promise.all([
    projectIds.length
      ? db
          .select({
            id: projects.id,
            content: projects.draftContent,
            deletedAt: projects.deletedAt,
          })
          .from(projects)
          .where(inArray(projects.id, projectIds))
      : [],
    postIds.length
      ? db
          .select({
            id: posts.id,
            content: posts.draftContent,
            deletedAt: posts.deletedAt,
          })
          .from(posts)
          .where(inArray(posts.id, postIds))
      : [],
    homeIds.length
      ? db
          .select({ id: homeSections.id, type: homeSections.type })
          .from(homeSections)
          .where(inArray(homeSections.id, homeIds))
      : [],
  ]);

  return rows.map((row) => {
    const base = {
      contentType: row.contentType,
      contentId: row.contentId,
      snapshot: row.snapshot,
      field: row.field,
    };

    switch (row.contentType) {
      case "project": {
        const project = projectRows.find((item) => item.id === row.contentId);

        return {
          ...base,
          label: project
            ? `Project “${project.content.name}”`
            : "A deleted project",
          href: project ? `/admin/projects/${project.id}` : null,
          trashed: Boolean(project?.deletedAt),
        };
      }
      case "post": {
        const post = postRows.find((item) => item.id === row.contentId);

        return {
          ...base,
          label: post ? `Post “${post.content.title}”` : "A deleted post",
          href: post ? `/admin/blog/${post.id}` : null,
          trashed: Boolean(post?.deletedAt),
        };
      }
      case "home_section": {
        const section = homeRows.find((item) => item.id === row.contentId);

        return {
          ...base,
          label: section
            ? `Homepage: ${homeSectionNames[section.type]}`
            : "The homepage",
          href: section ? `/admin/home/${section.type}` : "/admin/home",
          trashed: false,
        };
      }
      case "site_profile":
        return {
          ...base,
          label: "Site settings",
          href: "/admin/settings",
          trashed: false,
        };
    }
  });
}

async function usageFor(ids: string[]) {
  if (!ids.length) return new Map<string, MediaUsageRef[]>();
  const rows = await db
    .select()
    .from(mediaUsage)
    .where(inArray(mediaUsage.mediaAssetId, ids))
    .orderBy(
      asc(mediaUsage.contentType),
      asc(mediaUsage.contentId),
      asc(mediaUsage.snapshot),
      asc(mediaUsage.field),
    );
  const refs = await resolveUsage(rows);
  const byAsset = new Map<string, MediaUsageRef[]>();

  rows.forEach((row, index) => {
    const list = byAsset.get(row.mediaAssetId) ?? [];

    list.push(refs[index]);
    byAsset.set(row.mediaAssetId, list);
  });

  return byAsset;
}

function toAdminAsset(
  record: MediaAssetRecord,
  usage: MediaUsageRef[],
): AdminMediaAsset {
  return {
    id: record.id,
    secureUrl: record.secureUrl,
    altText: record.altText,
    caption: record.caption,
    width: record.width,
    height: record.height,
    bytes: record.bytes,
    format: record.format,
    createdAt: record.createdAt.toISOString(),
    usage,
  };
}

/** Newest first, each with where it's used. Callers are admin-gated. */
export async function listMediaForAdmin(): Promise<AdminMediaAsset[]> {
  const records = (await listMedia()).filter(
    (record) => record.resourceType === "image",
  );
  const usage = await usageFor(records.map((record) => record.id));

  return records.map((record) =>
    toAdminAsset(record, usage.get(record.id) ?? []),
  );
}

function mediaFailure<T>(result: Extract<MediaResult<T>, { ok: false }>) {
  const code = (
    {
      VALIDATION_ERROR: "VALIDATION_ERROR",
      NOT_FOUND: "NOT_FOUND",
      CONFLICT: "CONFLICT",
      MEDIA_IN_USE: "IN_USE",
      ORPHANED_UPLOAD: "INFRASTRUCTURE_ERROR",
      INFRASTRUCTURE_ERROR: "INFRASTRUCTURE_ERROR",
    } as const
  )[result.code];
  const value: ActionFailure = {
    ok: false,
    error: { code, message: result.message },
  };

  if (result.retryable) value.error.retryable = true;

  return value;
}

function textErrors(altText: unknown, caption: unknown) {
  const errors: Record<string, string[]> = {};
  const altError = validateAltText(typeof altText === "string" ? altText : "");

  if (altError) errors.altText = [altError];
  if (caption !== null && caption !== undefined) {
    if (typeof caption !== "string") errors.caption = ["Caption must be text."];
    else if (caption.trim().length > 500) {
      errors.caption = ["Keep the caption to 500 characters or fewer."];
    }
  }

  return Object.keys(errors).length
    ? failure(
        "VALIDATION_ERROR",
        "Fix the highlighted fields, then try again.",
        errors,
      )
    : null;
}

function captionValue(caption: unknown) {
  return typeof caption === "string" && caption.trim() ? caption.trim() : null;
}

const uploadSchema = z.object({
  publicId: z.string().min(1).max(500),
  version: z.number().int(),
  signature: z.string().min(1).max(200),
  resourceType: z.literal("image"),
  secureUrl: z.string().min(1),
  width: z.number().int(),
  height: z.number().int(),
  bytes: z.number().int(),
  format: z.string().min(1).max(40),
});

/**
 * Registers a browser upload after the server has verified it with
 * Cloudinary (response signature + Admin API lookup + folder/format/size).
 */
export async function runRegisterMediaUpload(
  input: Record<string, unknown>,
  { authorize, media = {} }: MediaAdminDependencies,
): Promise<ActionResult<AdminMediaAsset>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const invalidText = textErrors(input?.altText, input?.caption);

  if (invalidText) return invalidText;
  const upload = uploadSchema.safeParse(input);

  if (!upload.success) return invalidRequest();
  const actor = auth.session;
  let result: MediaResult<MediaAssetRecord>;

  try {
    result = await registerUploadedAsset(
      {
        ...upload.data,
        altText: String(input.altText),
        caption: captionValue(input.caption),
      },
      actor,
      media,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      /is required for Cloudinary media/.test(error.message)
    ) {
      return failure(
        "INFRASTRUCTURE_ERROR",
        "Media uploads aren't configured on this server.",
      );
    }

    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Cloudinary couldn't confirm this upload, so it wasn't added. Upload the image again.",
        retryable: true,
      },
    };
  }

  return result.ok
    ? success(toAdminAsset(result.data, []))
    : mediaFailure(result);
}

export async function runUpdateMediaText(
  input: { id: unknown; altText: unknown; caption?: unknown },
  { authorize }: AdminDependencies,
): Promise<ActionResult<AdminMediaAsset>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const { id, altText, caption } = input ?? {};

  if (!isId(id)) return invalidRequest();
  const invalidText = textErrors(altText, caption);

  if (invalidText) return invalidText;
  const actor = auth.session;

  return guarded(async () => {
    const result = await updateAssetText(
      { id, altText: String(altText), caption: captionValue(caption) },
      actor,
    );

    if (!result.ok) return mediaFailure(result);
    const usage = await usageFor([id]);

    return success(toAdminAsset(result.data, usage.get(id) ?? []));
  });
}

export async function runDeleteMedia(
  input: { id: unknown },
  { authorize, media = {} }: MediaAdminDependencies,
): Promise<ActionResult<{ id: string }>> {
  const auth = await authorizeOrFail(authorize);

  if (auth.failure) return auth.failure;
  const id = input?.id;

  if (!isId(id)) return invalidRequest();
  const actor = auth.session;

  return guarded(async () => {
    const asset = await findMediaAsset(db, id);

    if (!asset) {
      return failure(
        "NOT_FOUND",
        "This image no longer exists. It may have been deleted in another tab.",
      );
    }
    const inUse = async () => {
      const usage = (await usageFor([id])).get(id) ?? [];

      return usage.length
        ? failure(
            "IN_USE",
            usedByMessage(asset.altText.trim() || "This image", usage),
          )
        : null;
    };
    const blocked = await inUse();

    if (blocked) return blocked;
    const result = await deleteMediaAsset(id, actor, media);

    if (result.ok) return success({ id: result.data.id });
    if (result.code === "MEDIA_IN_USE") {
      return (await inUse()) ?? mediaFailure(result);
    }

    return mediaFailure(result);
  });
}
