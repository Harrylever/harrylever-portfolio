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
