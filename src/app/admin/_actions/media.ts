"use server";

import type { ActionResult } from "@/domain/content/action-result";

import { requireAdmin } from "@/server/auth/require-admin";
import { authorizeOrFail, guarded } from "@/server/content/admin-actions";
import {
  runDeleteMedia,
  runRegisterMediaUpload,
  runUpdateMediaText,
} from "@/server/content/media/admin";
import { listMedia } from "@/server/content/media/service";
import { success } from "@/server/content/result";
import { e2eMediaDependencies } from "@/server/media/e2e-fake";

/*
 * Every action authorizes itself before parsing input. Uploads go from the
 * browser straight to Cloudinary with server-signed parameters; only the
 * response, verified again server-side, is registered here.
 */
const deps = () => ({
  authorize: () => requireAdmin(),
  media: e2eMediaDependencies(),
});

export async function registerMediaUploadAction(
  input: Record<string, unknown>,
) {
  return runRegisterMediaUpload(input ?? {}, deps());
}

export async function updateMediaTextAction(input: {
  id: unknown;
  altText: unknown;
  caption?: unknown;
}) {
  return runUpdateMediaText(
    { id: input?.id, altText: input?.altText, caption: input?.caption },
    deps(),
  );
}

export async function deleteMediaAssetAction(input: { id: unknown }) {
  return runDeleteMedia({ id: input?.id }, deps());
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
