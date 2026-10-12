import { z } from "zod";

import {
  mediaAssetIdSchema,
  mediaPlaceholderSchema,
  nonEmptyTextSchema,
  safeExternalUrlSchema,
} from "@/domain/content/shared";

const sectionHeadingFields = {
  heading: nonEmptyTextSchema.max(120),
  note: nonEmptyTextSchema.max(240).optional(),
};

export const introSectionSchema = z.strictObject({
  type: z.literal("intro"),
  statement: z
    .array(
      z.strictObject({
        text: nonEmptyTextSchema.max(120),
        emphasis: z.boolean().optional(),
      }),
    )
    .min(1),
  lede: nonEmptyTextSchema.max(600),
  portraitAssetId: mediaAssetIdSchema.nullable().optional(),
  portraitPlaceholder: mediaPlaceholderSchema.nullable().optional(),
});

export const nowSectionSchema = z.strictObject({
  type: z.literal("now"),
  ...sectionHeadingFields,
  items: z
    .array(
      z.strictObject({
        label: nonEmptyTextSchema.max(80),
        body: nonEmptyTextSchema.max(600),
      }),
    )
    .min(1),
});

export const builtSectionSchema = z.strictObject({
  type: z.literal("built"),
  ...sectionHeadingFields,
  ctaLabel: nonEmptyTextSchema.max(80),
});

export const commitsSectionSchema = z.strictObject({
  type: z.literal("commits"),
  ...sectionHeadingFields,
  githubUsername: nonEmptyTextSchema.max(39),
});

export const framesSectionSchema = z.strictObject({
  type: z.literal("frames"),
  ...sectionHeadingFields,
  items: z.array(
    z.union([
      z.strictObject({
        mediaAssetId: mediaAssetIdSchema,
        aspectRatio: nonEmptyTextSchema.max(20),
        caption: nonEmptyTextSchema.max(240),
      }),
      z.strictObject({
        placeholderSlot: nonEmptyTextSchema.max(120),
        aspectRatio: nonEmptyTextSchema.max(20),
        caption: nonEmptyTextSchema.max(240),
      }),
    ]),
  ),
});

export const reachSectionSchema = z.strictObject({
  type: z.literal("reach"),
  ...sectionHeadingFields,
  groups: z
    .array(
      z.strictObject({
        label: nonEmptyTextSchema.max(80),
        items: z.array(nonEmptyTextSchema.max(80)).min(1),
      }),
    )
    .min(1),
  experienceIntro: nonEmptyTextSchema.max(300).optional(),
  experiences: z.array(
    z.strictObject({
      company: nonEmptyTextSchema.max(120),
      role: nonEmptyTextSchema.max(120),
      period: nonEmptyTextSchema.max(80),
      stack: z.array(nonEmptyTextSchema.max(80)),
    }),
  ),
});

export const loopSectionSchema = z.strictObject({
  type: z.literal("loop"),
  ...sectionHeadingFields,
  intro: nonEmptyTextSchema.max(600),
  items: z
    .array(
      z.strictObject({
        tool: nonEmptyTextSchema.max(100),
        use: nonEmptyTextSchema.max(600),
        frequency: z.enum(["Every day", "Sometimes", "Rarely"]),
      }),
    )
    .min(1),
  footer: nonEmptyTextSchema.max(400).optional(),
});

export const saySectionSchema = z.strictObject({
  type: z.literal("say"),
  heading: nonEmptyTextSchema.max(300),
  whatsappUrl: safeExternalUrlSchema.optional(),
  email: z.email(),
  resumeUrl: safeExternalUrlSchema.optional(),
});

export const homeSectionSchema = z.discriminatedUnion("type", [
  introSectionSchema,
  nowSectionSchema,
  builtSectionSchema,
  commitsSectionSchema,
  framesSectionSchema,
  reachSectionSchema,
  loopSectionSchema,
  saySectionSchema,
]);

export type HomeSectionContent = z.infer<typeof homeSectionSchema>;
export type HomeSectionType = HomeSectionContent["type"];

export const homeSectionTypes = [
  "intro",
  "now",
  "built",
  "commits",
  "frames",
  "reach",
  "loop",
  "say",
] as const satisfies readonly HomeSectionType[];
