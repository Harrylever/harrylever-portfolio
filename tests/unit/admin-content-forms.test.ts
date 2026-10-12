import { describe, expect, test } from "bun:test";

import { postContentSchema } from "@/domain/content/post";
import { projectContentSchema } from "@/domain/content/project";
import {
  emptyPostForm,
  emptyProjectForm,
  fieldErrorsFromIssues,
  formSnapshot,
  parseListFilters,
  postDraftFromForm,
  postFormFromContent,
  projectDraftFromForm,
  projectFormFromContent,
  serviceFieldErrors,
  suggestDuplicateSlug,
} from "@/lib/admin/content-forms";

const doc = {
  type: "doc" as const,
  content: [
    {
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: "Body" }],
    },
  ],
};

describe("project form conversion", () => {
  test("round-trips content and keeps non-editable placeholders", () => {
    const content = {
      name: "Atlas",
      hook: "Hook",
      homepageStory: "Story",
      year: "2026",
      role: "Lead",
      displayStatus: "Live",
      externalUrl: "https://atlas.example",
      stack: ["TypeScript", "Postgres"],
      coverAssetId: null,
      coverPlaceholder: { slotId: "atlas-cover", aspectRatio: "16/9" },
      galleryAssetIds: [],
      galleryPlaceholders: [{ slotId: "g1", aspectRatio: "4/3" }],
      seo: { title: "Atlas", description: "Atlas SEO" },
      caseStudy: doc,
    };
    const form = projectFormFromContent("atlas", content);

    expect(form.slug).toBe("atlas");
    expect(form.stack).toBe("TypeScript\nPostgres");
    expect(form.seoTitle).toBe("Atlas");

    const draft = projectDraftFromForm({ ...form, name: "Atlas 2" }, content);

    expect(projectContentSchema.parse(draft)).toEqual({
      ...content,
      name: "Atlas 2",
    });
  });

  test("normalises blank optionals and splits the stack", () => {
    const draft = projectDraftFromForm(
      {
        ...emptyProjectForm(),
        name: " Name ",
        stack: "React,  Bun\n\nNext.js ",
        externalUrl: "   ",
      },
      null,
    ) as Record<string, unknown>;

    expect(draft.stack).toEqual(["React", "Bun", "Next.js"]);
    expect(draft.externalUrl).toBeNull();
    expect(draft.galleryAssetIds).toEqual([]);
  });
});

describe("post form conversion", () => {
  test("round-trips content", () => {
    const content = {
      title: "Post",
      summary: "Summary",
      tag: "Notes",
      coverAssetId: null,
      seo: { title: "Post", description: "Post SEO" },
      document: doc,
    };
    const form = postFormFromContent("post", content);

    expect(postContentSchema.parse(postDraftFromForm(form))).toEqual(content);
    expect(emptyPostForm().document).toEqual({ type: "doc", content: [] });
  });
});

describe("field errors", () => {
  test("maps zod paths to form keys and collapses list fields", () => {
    const result = projectContentSchema.safeParse({
      ...(projectDraftFromForm(emptyProjectForm(), null) as object),
      stack: ["ok", ""],
      externalUrl: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrorsFromIssues(result.error.issues);

    expect(Object.keys(errors)).toContain("name");
    expect(Object.keys(errors)).toContain("stack");
    expect(Object.keys(errors)).toContain("externalUrl");
    expect(Object.keys(errors)).toContain("seoTitle");
    expect(Object.keys(errors).some((key) => key.startsWith("stack."))).toBe(
      false,
    );
  });

  test("routes rich text and empty paths", () => {
    expect(
      fieldErrorsFromIssues([
        { path: ["caseStudy", "content", 0, "type"], message: "bad" },
        { path: ["document", "content"], message: "bad doc" },
        { path: [], message: "whole form" },
      ]),
    ).toEqual({
      caseStudy: ["bad"],
      document: ["bad doc"],
      form: ["whole form"],
    });
  });

  test("attaches slug service messages to the slug field", () => {
    expect(
      serviceFieldErrors("An active project already uses this slug"),
    ).toEqual({ slug: ["Another active item already uses this URL slug."] });
    expect(
      serviceFieldErrors("A published post slug cannot be changed"),
    ).toEqual({ slug: ["A published URL can't change."] });
    expect(
      serviceFieldErrors("Every attached image must exist"),
    ).toBeUndefined();
  });
});

describe("snapshots, slugs and filters", () => {
  test("snapshot is key-order independent", () => {
    expect(formSnapshot({ a: 1, b: { c: 2, d: 3 } })).toBe(
      formSnapshot({ b: { d: 3, c: 2 }, a: 1 }),
    );
    expect(formSnapshot({ a: 1 })).not.toBe(formSnapshot({ a: 2 }));
  });

  test("suggests the first free duplicate slug", () => {
    expect(suggestDuplicateSlug("atlas", [])).toBe("atlas-copy");
    expect(suggestDuplicateSlug("atlas", ["atlas-copy"])).toBe("atlas-copy-2");
    expect(
      suggestDuplicateSlug("atlas-copy", [
        "atlas-copy-copy",
        "atlas-copy-copy-2",
      ]),
    ).toBe("atlas-copy-copy-3");
  });

  test("parses list filters defensively", () => {
    expect(parseListFilters({})).toEqual({ q: "", status: "all" });
    expect(parseListFilters({ q: "  atlas ", status: "draft" })).toEqual({
      q: "atlas",
      status: "draft",
    });
    expect(parseListFilters({ q: ["a", "b"], status: "evil" })).toEqual({
      q: "a",
      status: "all",
    });
    expect(parseListFilters({ q: "x".repeat(500) }).q.length).toBe(120);
  });
});
