import { z } from "zod";

import {
  nonEmptyTextSchema,
  safeExternalUrlSchema,
} from "@/domain/content/shared";

export const socialLinkSchema = z.strictObject({
  label: nonEmptyTextSchema.max(40),
  href: safeExternalUrlSchema,
});

export const siteProfileContentSchema = z.strictObject({
  name: nonEmptyTextSchema.max(100),
  location: nonEmptyTextSchema.max(120),
  tagline: nonEmptyTextSchema.max(180),
  description: nonEmptyTextSchema.max(500),
  email: z.email(),
  githubUsername: nonEmptyTextSchema.max(39),
  socialLinks: z.array(socialLinkSchema).max(12),
});

export type SiteProfileContent = z.infer<typeof siteProfileContentSchema>;
