import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";

import { describe, expect, test } from "bun:test";

import { homeSectionSchema } from "@/domain/content/home";
import { postContentSchema } from "@/domain/content/post";
import { projectContentSchema } from "@/domain/content/project";
import { siteProfileContentSchema } from "@/domain/content/site-profile";
import {
  REPOSITIONING_AS_OF,
  repositioningHomeSections,
  repositioningPost,
  repositioningProjects,
  repositioningSiteProfile,
} from "@/server/content/seed/repositioning-content";

const baseProfile = {
  name: "Dean Ukanah",
  location: "Abuja, Nigeria",
  tagline: "old",
  description: "old",
  email: "hi@example.com",
  githubUsername: "harrylever",
  socialLinks: [{ label: "GitHub", href: "https://github.com/harrylever" }],
};

const baseSections: HomeSectionContent[] = [
  {
    type: "intro",
    statement: [{ text: "old" }],
    lede: "old",
    portraitPlaceholder: { slotId: "intro-portrait", aspectRatio: "4 / 5" },
  },
  { type: "now", heading: "Right now", items: [{ label: "a", body: "b" }] },
  { type: "built", heading: "Built", ctaLabel: "Read" },
  { type: "commits", heading: "Commits", githubUsername: "harrylever" },
  {
    type: "frames",
    heading: "Off the screen",
    items: [
      {
        placeholderSlot: "frame-desk",
        aspectRatio: "4 / 5",
        caption: "Debugging something that deserved it.",
      },
    ],
  },
  {
    type: "reach",
    heading: "Reach",
    groups: [
      { label: "When it fits", items: ["Python"] },
      { label: "Currently learning", items: ["Rust"] },
    ],
    experiences: [],
  },
  {
    type: "loop",
    heading: "AI",
    intro: "old",
    items: [{ tool: "Claude", use: "x", frequency: "Every day" }],
    footer: "old footer",
  },
  { type: "say", heading: "Hi", email: "hi@example.com" },
];
const baseMap = new Map<HomeSectionType, HomeSectionContent>(
  baseSections.map((s) => [s.type, s]),
);

function allOutput() {
  return {
    profile: repositioningSiteProfile(baseProfile),
    sections: repositioningHomeSections(baseMap),
    projects: repositioningProjects.map((p) => p.content),
    post: repositioningPost().content,
  };
}

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => strings(v, out));
  }

  return out;
}

const bySlug = (slug: string) =>
  repositioningProjects.find((p) => p.slug === slug)!;

describe("repositioning content", () => {
  test("every generated section, project, profile and post parses against its schema", () => {
    const { profile, sections, projects, post } = allOutput();

    expect(siteProfileContentSchema.safeParse(profile).success).toBe(true);
    for (const s of sections)
      expect(homeSectionSchema.safeParse(s).success).toBe(true);
    for (const p of projects)
      expect(projectContentSchema.safeParse(p).success).toBe(true);
    expect(postContentSchema.safeParse(post).success).toBe(true);
  });

  test("Shelta has exactly the five spec metrics, dated, as a product", () => {
    const { content } = bySlug("shelta");

    expect(content.kind).toBe("product");
    expect(
      content.metrics?.map(({ label, value, asOf }) => [label, value, asOf]),
    ).toEqual([
      ["Registered users", "227", REPOSITIONING_AS_OF],
      ["Community members", "1,051", REPOSITIONING_AS_OF],
      ["Listings", "100+", REPOSITIONING_AS_OF],
      ["Agents onboarded", "5", REPOSITIONING_AS_OF],
      ["Campus (FUTMinna / Minna)", "1", REPOSITIONING_AS_OF],
    ]);
    expect(REPOSITIONING_AS_OF).toBe("2026-10-15");
    expect(content.role).toBe("Co-founder, Head of Product and Engineering");
  });

  test("Karrigo is live client work at karrigo.app and Libra has no link", () => {
    expect(bySlug("karrigo").content).toMatchObject({
      kind: "client",
      displayStatus: "Live",
      externalUrl: "https://karrigo.app",
    });
    expect(bySlug("libra-cleaning").content.kind).toBe("client");
    expect(bySlug("libra-cleaning").content.externalUrl).toBeUndefined();
  });

  test("AIZEN is an experiment", () => {
    expect(bySlug("aizen").content.kind).toBe("experiment");
  });

  test("the experience list matches the spec table", () => {
    const reach = repositioningHomeSections(baseMap).find(
      (s) => s.type === "reach",
    );

    if (reach?.type !== "reach") throw new Error("missing reach");
    expect(
      reach.experiences.map(({ company, role, period }) => [
        company,
        role,
        period,
      ]),
    ).toEqual([
      ["Clique", "Mid-level Full-Stack Engineer", "Jul 2024 – Jan 2026"],
      ["Provarex Innovations", "Engineering Lead", "May 2024 – Aug 2024"],
      ["Jejelove Solutions", "Full-Stack Engineer", "Mar 2023 – Jul 2023"],
      ["Stanrute Technologies", "Backend Engineer", "Nov 2022 – Feb 2023"],
    ]);
  });

  test("no generated string contains a forbidden claim", () => {
    const forbidden = [
      /800/,
      /50 active/i,
      /indie hacker/i,
      /\bsolo\b/i,
      /capstone/i,
      /tree-sitter/i,
      /langgraph/i,
      /sakzpredict/i,
      /cloudinary/i,
      /brave or stupid/i,
      /deserved it/i,
    ];

    for (const value of strings(allOutput())) {
      for (const pattern of forbidden) {
        expect({ value, hit: pattern.test(value) }).toEqual({
          value,
          hit: false,
        });
      }
    }
  });

  test("the housing post is a draft outline with no invented anecdotes", () => {
    const { slug, content } = repositioningPost();
    const text = strings(content.document).join(" ");

    expect(slug).toBe("student-housing-in-nigeria");
    expect(text).toContain("8 of 24");
    expect(text).toContain("Write this section");
  });
});
