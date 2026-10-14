import { describe, expect, test } from "bun:test";

import { postContentSchema } from "@/domain/content/post";
import { projectContentSchema } from "@/domain/content/project";
import {
  duplicateName,
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

  test("keeps duplicate slugs valid, bounded and distinct", () => {
    const long = `${"a".repeat(114)}-b-cde`; // 120 chars
    const copy = suggestDuplicateSlug(long, []);

    expect(copy.length).toBeLessThanOrEqual(120);
    expect(copy).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(copy.endsWith("-copy")).toBe(true);
    expect(copy).not.toBe(long);

    // A cut that lands on a hyphen never leaves "--".
    const hyphenated = `${"a".repeat(114)}-bbbbb`;

    expect(suggestDuplicateSlug(hyphenated, [])).toBe(
      `${"a".repeat(114)}-copy`,
    );

    // A max-length source already ending in -copy can't map onto itself.
    const selfCopy = `${"a".repeat(115)}-copy`;
    const next = suggestDuplicateSlug(selfCopy, []);

    expect(next).not.toBe(selfCopy);
    expect(next.length).toBeLessThanOrEqual(120);
    expect(next).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  test("names duplicates with a bounded (copy) suffix", () => {
    expect(duplicateName("Atlas", 140)).toBe("Atlas (copy)");
    const long = duplicateName("x".repeat(140), 140);

    expect(long.length).toBe(140);
    expect(long.endsWith(" (copy)")).toBe(true);
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

describe("repositioning project form fields", () => {
  const legacy = {
    name: "Atlas",
    hook: "Hook",
    homepageStory: "Story",
    year: "2026",
    role: "Lead",
    displayStatus: "Live",
    externalUrl: "https://atlas.example",
    stack: ["TypeScript"],
    coverAssetId: null,
    galleryAssetIds: [],
    seo: { title: "Atlas", description: "Atlas SEO" },
    caseStudy: doc,
  };

  test("projectFormFromContent defaults kind, statusTone and metrics for a legacy row", () => {
    const form = projectFormFromContent("atlas", legacy);

    expect(form.kind).toBe("product");
    expect(form.statusTone).toBe("");
    expect(form.metrics).toEqual([]);
  });

  test("a legacy row round-trips with no new keys added", () => {
    const form = projectFormFromContent("atlas", legacy);

    expect(projectDraftFromForm(form, legacy)).toEqual(legacy);
  });

  test("kind, statusTone and metrics are written when set", () => {
    const metric = { label: "Users", value: "227", asOf: "2026-10-15" };
    const draft = projectDraftFromForm(
      {
        ...projectFormFromContent("atlas", legacy),
        kind: "client",
        statusTone: "paused",
        metrics: [metric],
      },
      legacy,
    ) as Record<string, unknown>;

    expect(draft.kind).toBe("client");
    expect(draft.statusTone).toBe("paused");
    expect(draft.metrics).toEqual([metric]);
  });

  test("blank metric rows are dropped and half-filled rows are kept for validation", () => {
    const blank = { label: " ", value: "", asOf: "" };
    const half = { label: "Users", value: "", asOf: "" };
    const draft = projectDraftFromForm(
      {
        ...projectFormFromContent("atlas", legacy),
        metrics: [blank, half],
      },
      legacy,
    ) as Record<string, unknown>;

    expect(draft.metrics).toEqual([half]);
    expect(projectContentSchema.safeParse(draft).success).toBe(false);
  });

  test("metric issues map to the metrics field key", () => {
    expect(
      fieldErrorsFromIssues([{ path: ["metrics", 0, "asOf"], message: "bad" }]),
    ).toEqual({ metrics: ["bad"] });
  });
});
