import { z } from "zod";

export const reservedSlugs = [
  "admin",
  "api",
  "_next",
  "blog",
  "projects",
  "sign-in",
  "preview",
] as const;

export const nonEmptyTextSchema = z.string().trim().min(1);
export const mediaAssetIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]{23}$/, "Expected a CUID2 media asset ID");

export const safeExternalUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      return ["http:", "https:", "mailto:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Expected an http, https, or mailto URL");

export const secureUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Expected an https URL");

export function normalizeSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const normalizedReservedSlugs = new Set(reservedSlugs.map(normalizeSlug));

export const contentSlugSchema = z
  .string()
  .transform(normalizeSlug)
  .pipe(
    z
      .string()
      .min(1, "Slug is required")
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .refine((slug) => !normalizedReservedSlugs.has(slug), "Slug is reserved"),
  );

export const projectSlugSchema = contentSlugSchema;
export const postSlugSchema = contentSlugSchema;

export const seoContentSchema = z.strictObject({
  title: nonEmptyTextSchema.max(70),
  description: nonEmptyTextSchema.max(180),
});

export type SeoContent = z.infer<typeof seoContentSchema>;
