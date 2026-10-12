"use server";

import type { ActionResult } from "@/domain/content/action-result";
import type { UploadedAssetResponse } from "@/server/media/cloudinary";

import { requireAdmin } from "@/server/auth/require-admin";
import { authorizeOrFail, guarded } from "@/server/content/admin-actions";
import {
  deleteMediaAsset,
  listMedia,
  registerUploadedAsset,
  updateAssetText,
} from "@/server/content/media/service";
import { success } from "@/server/content/result";

export async function registerMediaUploadAction(
  input: UploadedAssetResponse & {
    altText?: string;
    caption?: string | null;
  },
) {
  return registerUploadedAsset(input, await requireAdmin());
}

export async function updateMediaTextAction(input: {
  id: string;
  altText: string;
  caption?: string | null;
}) {
  return updateAssetText(input, await requireAdmin());
}

export async function deleteMediaAssetAction(id: string) {
  return deleteMediaAsset(id, await requireAdmin());
}

/** What the media picker needs; no Cloudinary internals reach the client. */
export type MediaPickerAsset = {
  id: string;
  secureUrl: string;
  altText: string;
  caption: string | null;
  width: number;
  height: number;
};

export async function listMediaForPickerAction(): Promise<
  ActionResult<MediaPickerAsset[]>
> {
  const auth = await authorizeOrFail(() => requireAdmin());

  if (auth.failure) return auth.failure;

  return guarded(async () =>
    success(
      (await listMedia())
        .filter((asset) => asset.resourceType === "image")
        .map((asset) => ({
          id: asset.id,
          secureUrl: asset.secureUrl,
          altText: asset.altText,
          caption: asset.caption,
          width: asset.width,
          height: asset.height,
        })),
    ),
  );
}
