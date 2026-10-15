import { describe, expect, test } from "bun:test";

import { homeSectionSchema } from "@/domain/content/home";
import { mediaAssetInputSchema } from "@/domain/content/media";
import { postContentSchema } from "@/domain/content/post";
import {
  projectContentSchema,
  projectKindOf,
} from "@/domain/content/project";
import { siteProfileContentSchema } from "@/domain/content/site-profile";
import { safeExternalUrlSchema } from "@/domain/content/shared";
import { createId } from "@/server/db/id";

const mediaAssetId = createId();
const emptyDocument = { type: "doc" as const, content: [] };

const validHomeSectionFixtures = [
  {
    type: "intro",
    statement: [
      { text: "I build things" },
      { text: "then try to break them.", emphasis: true },
    ],
    lede: "Indie hacker and software engineer in Abuja.",
    portraitAssetId: mediaAssetId,
  },
  {
    type: "now",
    heading: "Right now",
    note: "Updated whenever it stops being true.",
    items: [{ label: "Building", body: "A private CMS for this portfolio." }],
  },
  {
    type: "built",
    heading: "Things I've built",
    note: "Some are live, some are half-finished.",
    ctaLabel: "Read the full write-ups",
  },
  {
    type: "commits",
    heading: "Commits",
    note: "A rolling year, not a highlight reel.",
    githubUsername: "harrylever",
  },
  {
    type: "frames",
    heading: "Off the screen",
    note: "Abuja and the desk.",
    items: [
      {
        mediaAssetId,
        aspectRatio: "4 / 5",
        caption: "Where most of it gets written.",
      },
    ],
  },
  {
    type: "reach",
    heading: "What I reach for",
    note: "Grouped by how often I use it.",
    groups: [{ label: "Every day", items: ["TypeScript", "PostgreSQL"] }],
    experienceIntro: "I have also done this for other people.",
    experiences: [
      {
        company: "Example",
        role: "Engineer",
        period: "2024 — 2026",
        stack: ["TypeScript"],
      },
    ],
  },
  {
    type: "loop",
    heading: "AI in the loop",
    note: "Ordered by actual use.",
    intro: "I write software with a model open next to me.",
    items: [
      {
        tool: "Claude Code",
        use: "Refactors, tests, and plumbing.",
        frequency: "Every day",
      },
    ],
    footer: "The security work cuts the other way.",
  },
  {
    type: "say",
    heading: "If you're building something odd, I'd like to hear about it.",
    whatsappUrl: "https://wa.me/2348000000000",
    email: "hello@example.com",
    resumeUrl: "https://example.com/resume.pdf",
  },
] as const;

describe("content schemas", () => {
  test("validates every fixed homepage section payload", () => {
    for (const section of validHomeSectionFixtures) {
      expect(homeSectionSchema.safeParse(section).success).toBe(true);
    }
  });

  test("requires the project fields used by listings and case studies", () => {
    const validProject = {
      name: "AIZEN",
      hook: "Finds and verifies vulnerabilities.",
      homepageStory: "A capstone that distrusts unverified findings.",
      year: "2026",
      role: "Solo",
      displayStatus: "Capstone",
      externalUrl: "https://example.com/aizen",
      stack: ["Python", "Docker"],
      coverAssetId: mediaAssetId,
      galleryAssetIds: [createId()],
      seo: {
        title: "AIZEN security scanner",
        description: "A case study about building AIZEN.",
      },
      caseStudy: emptyDocument,
    };

    expect(projectContentSchema.safeParse(validProject).success).toBe(true);
    expect(
      projectContentSchema.safeParse({ ...validProject, name: "" }).success,
    ).toBe(false);
    expect(
      projectContentSchema.safeParse({
        ...validProject,
        externalUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  test("requires complete post content and derives no persisted display fields", () => {
    const validPost = {
      title: "What Tree-sitter taught me",
      summary: "Why structure beats source-text matching.",
      tag: "Security",
      coverAssetId: mediaAssetId,
      seo: {
        title: "What Tree-sitter taught me",
        description: "Notes from building a structural security scanner.",
      },
      document: emptyDocument,
    };

    expect(postContentSchema.safeParse(validPost).success).toBe(true);
    expect(
      postContentSchema.safeParse({ ...validPost, title: "" }).success,
    ).toBe(false);
    expect(
      postContentSchema.safeParse({ ...validPost, readingTime: "4 min" })
        .success,
    ).toBe(false);
  });

  test("validates site identity and Cloudinary asset metadata", () => {
    expect(
      siteProfileContentSchema.safeParse({
        name: "Dean Ukanah",
        location: "Abuja, Nigeria",
        tagline: "I build things I want to exist.",
        description: "Indie hacker and software engineer.",
        email: "hello@example.com",
        githubUsername: "harrylever",
        socialLinks: [
          { label: "GitHub", href: "https://github.com/harrylever" },
        ],
      }).success,
    ).toBe(true);

    expect(
      mediaAssetInputSchema.safeParse({
        publicId: "development/portfolio/aizen-cover",
        resourceType: "image",
        secureUrl: "https://res.cloudinary.com/demo/image/upload/aizen.jpg",
        width: 1600,
        height: 900,
        bytes: 120000,
        format: "jpg",
        altText: "AIZEN report screen",
        caption: "A verified finding.",
      }).success,
    ).toBe(true);
  });

  test("allows only non-executable external link protocols", () => {
    for (const href of [
      "http://example.com",
      "https://example.com",
      "mailto:hello@example.com",
    ]) {
      expect(safeExternalUrlSchema.safeParse(href).success).toBe(true);
    }

    for (const href of ["javascript:alert(1)", "data:text/html,boom"]) {
      expect(safeExternalUrlSchema.safeParse(href).success).toBe(false);
    }
  });
});

describe("repositioning content fields", () => {
  const legacyProject = {
    name: "Shelta",
    hook: "Verified student housing.",
    homepageStory: "Students find verified housing.",
    year: "2025",
    role: "Co-founder",
    displayStatus: "Live",
    externalUrl: "https://sheltahomes.com",
    stack: ["Next.js"],
    galleryAssetIds: [],
    seo: { title: "Shelta", description: "Verified student housing." },
    caseStudy: emptyDocument,
  };
  const metric = { label: "Registered users", value: "227", asOf: "2026-10-15" };

  test("project schema accepts a row with none of the new fields", () => {
    expect(projectContentSchema.safeParse(legacyProject).success).toBe(true);
  });

  test("project schema accepts kind, statusTone and up to six metrics", () => {
    const result = projectContentSchema.safeParse({
      ...legacyProject,
      kind: "client",
      statusTone: "paused",
      metrics: Array.from({ length: 6 }, () => metric),
    });

    expect(result.success).toBe(true);
  });

  test("project schema rejects invalid metrics, kind and tone", () => {
    const rejects = (extra: object) =>
      projectContentSchema.safeParse({ ...legacyProject, ...extra }).success;

    expect(rejects({ metrics: Array.from({ length: 7 }, () => metric) })).toBe(
      false,
    );
    expect(rejects({ metrics: [{ ...metric, label: " " }] })).toBe(false);
    expect(rejects({ metrics: [{ ...metric, asOf: "15/10/2026" }] })).toBe(
      false,
    );
    expect(rejects({ kind: "hobby" })).toBe(false);
    expect(rejects({ statusTone: "dead" })).toBe(false);
  });

  test("project schema accepts livePreview as a boolean only", () => {
    expect(
      projectContentSchema.safeParse({ ...legacyProject, livePreview: true })
        .success,
    ).toBe(true);
    expect(
      projectContentSchema.safeParse({ ...legacyProject, livePreview: "yes" })
        .success,
    ).toBe(false);
  });

  test("projectKindOf returns product when kind is absent", () => {
    expect(projectKindOf({})).toBe("product");
    expect(projectKindOf({ kind: "experiment" })).toBe("experiment");
  });

  test("say schema accepts availability and investorNote up to 200 characters", () => {
    const say = {
      type: "say" as const,
      heading: "Talk to me.",
      email: "hello@example.com",
    };

    expect(
      homeSectionSchema.safeParse({
        ...say,
        availability: "Open to remote contract work.",
        investorNote: "Happy to talk about Shelta.",
      }).success,
    ).toBe(true);
    expect(
      homeSectionSchema.safeParse({ ...say, availability: "a".repeat(201) })
        .success,
    ).toBe(false);
  });
});
