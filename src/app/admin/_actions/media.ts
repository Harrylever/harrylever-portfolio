"use server";

import type { UploadedAssetResponse } from "@/server/media/cloudinary";

import { requireAdmin } from "@/server/auth/require-admin";
import {
  deleteMediaAsset,
  registerUploadedAsset,
  updateAssetText,
} from "@/server/content/media/service";

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
