import { z } from "zod";

import { nonEmptyTextSchema, secureUrlSchema } from "@/domain/content/shared";

export const mediaAssetInputSchema = z.strictObject({
  publicId: nonEmptyTextSchema.max(500),
  resourceType: z.enum(["image", "video", "raw"]),
  secureUrl: secureUrlSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  format: nonEmptyTextSchema.max(40),
  altText: nonEmptyTextSchema.max(300),
  caption: nonEmptyTextSchema.max(500).nullable().optional(),
});

export type MediaAssetInput = z.infer<typeof mediaAssetInputSchema>;

/** Shared by the signature route, server verification and the browser. */
export const allowedImageFormats = [
  "avif",
  "jpeg",
  "jpg",
  "png",
  "webp",
] as const;
export const maximumImageBytes = 10 * 1024 * 1024;
/**
 * The largest file the admin accepts from a visitor's disk. It is compressed in
 * the browser before upload, and the stored image must fit maximumImageBytes.
 */
export const maximumSourceBytes = 30 * 1024 * 1024;
