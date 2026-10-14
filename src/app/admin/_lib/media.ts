import type { MediaPickerAsset } from "@/app/admin/_actions/media";

import { listMedia } from "@/server/content/media/service";

/** Registered images for editor pages (server-side; callers are admin-gated). */
export async function listPickerMedia(): Promise<MediaPickerAsset[]> {
  try {
    return (await listMedia())
      .filter((asset) => asset.resourceType === "image")
      .map((asset) => ({
        id: asset.id,
        secureUrl: asset.secureUrl,
        altText: asset.altText,
        caption: asset.caption,
        width: asset.width,
        height: asset.height,
      }));
  } catch {
    // The picker refreshes on open and reports its own error.
    return [];
  }
}
