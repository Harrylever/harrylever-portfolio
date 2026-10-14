import { describe, expect, test } from "bun:test";

import {
  normalizeSlug,
  projectSlugSchema,
  reservedSlugs,
} from "@/domain/content/shared";

describe("content slugs", () => {
  test("normalizes punctuation, accents, and whitespace", () => {
    expect(normalizeSlug("  My AIZEN Project! ")).toBe("my-aizen-project");
    expect(normalizeSlug("Déjà vu — launch notes")).toBe(
      "deja-vu-launch-notes",
    );
    expect(normalizeSlug("one___two---three")).toBe("one-two-three");
  });

  test("rejects empty and reserved route slugs after normalization", () => {
    expect(() => projectSlugSchema.parse("!!!")).toThrow();

    for (const slug of reservedSlugs) {
      expect(() => projectSlugSchema.parse(slug)).toThrow();
      expect(() =>
        projectSlugSchema.parse(` ${slug.toUpperCase()} `),
      ).toThrow();
    }
  });
});
