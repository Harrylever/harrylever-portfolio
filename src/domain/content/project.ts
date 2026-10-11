import { z } from "zod";

import { richTextSchema } from "@/domain/content/rich-text";
import {
  mediaAssetIdSchema,
  nonEmptyTextSchema,
  safeExternalUrlSchema,
  seoContentSchema,
} from "@/domain/content/shared";

export const projectContentSchema = z.strictObject({
  name: nonEmptyTextSchema.max(140),
  hook: nonEmptyTextSchema.max(300),
  homepageStory: nonEmptyTextSchema.max(800),
  year: nonEmptyTextSchema.max(40),
  role: nonEmptyTextSchema.max(160),
  displayStatus: nonEmptyTextSchema.max(80),
  externalUrl: safeExternalUrlSchema.nullable().optional(),
  stack: z.array(nonEmptyTextSchema.max(80)).min(1),
  coverAssetId: mediaAssetIdSchema.nullable().optional(),
  galleryAssetIds: z.array(mediaAssetIdSchema),
  seo: seoContentSchema,
  caseStudy: richTextSchema,
});

export type ProjectContent = z.infer<typeof projectContentSchema>;
