import { z } from "zod";

import { richTextSchema } from "@/domain/content/rich-text";
import {
  mediaAssetIdSchema,
  mediaPlaceholderSchema,
  nonEmptyTextSchema,
  safeExternalUrlSchema,
  seoContentSchema,
} from "@/domain/content/shared";

export const projectKinds = ["product", "client", "experiment"] as const;
export type ProjectKind = (typeof projectKinds)[number];

export const statusTones = ["live", "paused", "ended"] as const;
export type StatusTone = (typeof statusTones)[number];

export const projectMetricSchema = z.strictObject({
  label: nonEmptyTextSchema.max(40),
  value: nonEmptyTextSchema.max(40),
  asOf: z.iso.date(),
});

export type ProjectMetric = z.infer<typeof projectMetricSchema>;

export const projectContentSchema = z.strictObject({
  name: nonEmptyTextSchema.max(140),
  hook: nonEmptyTextSchema.max(300),
  homepageStory: nonEmptyTextSchema.max(800),
  year: nonEmptyTextSchema.max(40),
  role: nonEmptyTextSchema.max(160),
  displayStatus: nonEmptyTextSchema.max(80),
  kind: z.enum(projectKinds).optional(),
  statusTone: z.enum(statusTones).optional(),
  metrics: z.array(projectMetricSchema).max(6).optional(),
  externalUrl: safeExternalUrlSchema.nullable().optional(),
  stack: z.array(nonEmptyTextSchema.max(80)).min(1),
  coverAssetId: mediaAssetIdSchema.nullable().optional(),
  coverPlaceholder: mediaPlaceholderSchema.nullable().optional(),
  homepagePlaceholder: mediaPlaceholderSchema.nullable().optional(),
  galleryAssetIds: z.array(mediaAssetIdSchema),
  galleryPlaceholders: z.array(mediaPlaceholderSchema).optional(),
  seo: seoContentSchema,
  caseStudy: richTextSchema,
});

export type ProjectContent = z.infer<typeof projectContentSchema>;

export function projectKindOf(content: { kind?: ProjectKind }): ProjectKind {
  return content.kind ?? "product";
}
