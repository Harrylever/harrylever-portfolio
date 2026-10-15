import type { AdminSession } from "@/server/auth/require-admin";
import type {
  CloudinaryMediaDependencies,
  UploadedAssetResponse,
} from "@/server/media/cloudinary";
import type {
  MediaAssetInsert,
  MediaAssetRecord,
} from "@/server/content/media/repository";

import { z } from "zod";

import { db } from "@/server/db/client";
import {
  countMediaUsage,
  deleteMediaAssetRecord,
  findMediaAsset,
  findMediaAssetByPublicId,
  insertMediaAsset,
  listMediaAssets,
  listMediaUsage,
  updateMediaAssetText,
} from "@/server/content/media/repository";
import {
  destroyCloudinaryResource,
  verifyUploadedAssetResponse,
} from "@/server/media/cloudinary";

type MediaSuccess<T> = { ok: true; data: T };
type MediaFailure = {
  ok: false;
  code:
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "CONFLICT"
    | "MEDIA_IN_USE"
    | "ORPHANED_UPLOAD"
    | "INFRASTRUCTURE_ERROR";
  message: string;
  retryable?: boolean;
  publicId?: string;
};
export type MediaResult<T> = MediaSuccess<T> | MediaFailure;

type RegistrationDependencies = CloudinaryMediaDependencies & {
  insertAsset?: (
    values: MediaAssetInsert,
  ) => Promise<MediaAssetRecord | undefined>;
  findAssetByPublicId?: (
    publicId: string,
  ) => Promise<MediaAssetRecord | undefined>;
};

const descriptiveTextSchema = z.strictObject({
  id: z.string().min(1),
  altText: z.string().trim().max(300),
  caption: z.string().trim().max(500).nullable().optional(),
});

function success<T>(data: T): MediaSuccess<T> {
  return { ok: true, data };
}

function failure(
  code: MediaFailure["code"],
  message: string,
  extra: Pick<MediaFailure, "retryable" | "publicId"> = {},
): MediaFailure {
  return { ok: false, code, message, ...extra };
}

function assertAdmin(actor: AdminSession) {
  if (actor.user.role !== "admin") throw new Error("Administrator required");
}

function isSameAsset(
  record: MediaAssetRecord,
  values: MediaAssetInsert,
): boolean {
  return (
    record.publicId === values.publicId &&
    record.resourceType === values.resourceType &&
    record.secureUrl === values.secureUrl &&
    record.width === values.width &&
    record.height === values.height &&
    record.bytes === values.bytes &&
    record.format === values.format &&
    record.altText === values.altText &&
    record.caption === (values.caption ?? null)
  );
}

export async function registerUploadedAsset(
  input: UploadedAssetResponse & {
    altText?: string;
    caption?: string | null;
  },
  actor: AdminSession,
  dependencies: RegistrationDependencies = {},
): Promise<MediaResult<MediaAssetRecord>> {
  assertAdmin(actor);
  const verified = await verifyUploadedAssetResponse(input, dependencies);
  const text = descriptiveTextSchema.omit({ id: true }).safeParse({
    altText: input.altText ?? "",
    caption: input.caption ?? null,
  });

  if (!text.success) {
    return failure("VALIDATION_ERROR", "Image text is invalid");
  }

  const values: MediaAssetInsert = {
    ...verified,
    altText: text.data.altText,
    caption: text.data.caption ?? null,
  };
  const findExisting = () =>
    dependencies.findAssetByPublicId
      ? dependencies.findAssetByPublicId(verified.publicId)
      : findMediaAssetByPublicId(db, verified.publicId);

  try {
    const existing = await findExisting();

    if (existing) {
      return isSameAsset(existing, values)
        ? success(existing)
        : failure(
            "CONFLICT",
            "A different media record already uses this Cloudinary public ID.",
          );
    }
    const record = dependencies.insertAsset
      ? await dependencies.insertAsset(values)
      : await insertMediaAsset(db, values);

    if (!record) throw new Error("Media registration returned no record");

    return success(record);
  } catch {
    try {
      const existing = await findExisting();

      if (existing) {
        return isSameAsset(existing, values)
          ? success(existing)
          : failure(
              "CONFLICT",
              "A different media record already uses this Cloudinary public ID.",
            );
      }
    } catch {
      return failure(
        "ORPHANED_UPLOAD",
        "The upload reached Cloudinary but could not be registered. Retry the upload.",
        { retryable: true, publicId: verified.publicId },
      );
    }

    try {
      await destroyCloudinaryResource(verified.publicId, dependencies);
    } catch {
      // Registration failure remains the actionable error even if cleanup fails.
    }

    return failure(
      "ORPHANED_UPLOAD",
      "The upload reached Cloudinary but could not be registered. Retry the upload.",
      { retryable: true, publicId: verified.publicId },
    );
  }
}

export async function updateAssetText(
  input: { id: string; altText: string; caption?: string | null },
  actor: AdminSession,
): Promise<MediaResult<MediaAssetRecord>> {
  assertAdmin(actor);
  const parsed = descriptiveTextSchema.safeParse(input);

  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "Image text is invalid");
  }

  try {
    const updated = await updateMediaAssetText(db, parsed.data.id, {
      altText: parsed.data.altText,
      caption: parsed.data.caption ?? null,
    });

    return updated
      ? success(updated)
      : failure("NOT_FOUND", "Media asset not found");
  } catch {
    return failure(
      "INFRASTRUCTURE_ERROR",
      "The media asset could not be updated. Please try again.",
      { retryable: true },
    );
  }
}

export function listMedia() {
  return listMediaAssets();
}

export function getMediaUsage(id: string) {
  return listMediaUsage(db, id);
}

export async function deleteMediaAsset(
  id: string,
  actor: AdminSession,
  dependencies: CloudinaryMediaDependencies = {},
): Promise<MediaResult<{ id: string }>> {
  assertAdmin(actor);

  try {
    return await db.transaction(async (transaction) => {
      const asset = await findMediaAsset(transaction, id, true);

      if (!asset) return failure("NOT_FOUND", "Media asset not found");
      if ((await countMediaUsage(transaction, id)) > 0) {
        return failure(
          "MEDIA_IN_USE",
          "Remove this image from its content before deleting it.",
        );
      }

      await destroyCloudinaryResource(asset.publicId, dependencies);
      const deleted = await deleteMediaAssetRecord(transaction, asset.id);

      if (!deleted) {
        return failure(
          "INFRASTRUCTURE_ERROR",
          "Cloudinary removed the image but its media record needs cleanup.",
        );
      }

      return success(deleted);
    });
  } catch {
    return failure(
      "INFRASTRUCTURE_ERROR",
      "The media asset could not be deleted. Please try again.",
      { retryable: true },
    );
  }
}
