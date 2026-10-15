import { z } from "zod";

import { richTextSchema } from "@/domain/content/rich-text";
import {
  mediaAssetIdSchema,
  nonEmptyTextSchema,
  seoContentSchema,
} from "@/domain/content/shared";

export const postContentSchema = z.strictObject({
  title: nonEmptyTextSchema.max(180),
  summary: nonEmptyTextSchema.max(400),
  tag: nonEmptyTextSchema.max(80),
  coverAssetId: mediaAssetIdSchema.nullable().optional(),
  seo: seoContentSchema,
  document: richTextSchema,
});

export type PostContent = z.infer<typeof postContentSchema>;
