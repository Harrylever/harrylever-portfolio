import type { HomeSectionContent } from "@/domain/content/home";

import { describe, expect, test } from "bun:test";

import { homeSectionSchema, homeSectionTypes } from "@/domain/content/home";
import {
  emptyHomeForm,
  homeDraftFromForm,
  homeFieldErrors,
  homeFormFromContent,
  homeSectionNames,
  isHomeSectionType,
  sectionSummary,
} from "@/lib/admin/home-forms";
import { moveBy, moveItem, positionAnnouncement } from "@/lib/admin/reorder";

const assetId = "a".repeat(24);

const contents: HomeSectionContent[] = [
  {
    type: "intro",
    statement: [{ text: "I build" }, { text: "odd things", emphasis: true }],
    lede: "Lede",
    portraitAssetId: assetId,
    portraitPlaceholder: {
      slotId: "intro-portrait",
      aspectRatio: "4 / 5",
      caption: "A portrait",
    },
  },
  {
    type: "now",
    heading: "Right now",
    note: "Updated often",
    items: [{ label: "Work", body: "Building" }],
  },
  { type: "built", heading: "Built", ctaLabel: "Read more" },
  {
    type: "commits",
    heading: "Commits",
    note: "Live",
    githubUsername: "harrylever",
  },
  {
    type: "frames",
    heading: "Frames",
    items: [
      { mediaAssetId: assetId, aspectRatio: "3 / 4", caption: "Desk" },
      { placeholderSlot: "frame-2", aspectRatio: "1 / 1", caption: "City" },
    ],
  },
  {
    type: "reach",
    heading: "Reach",
    groups: [{ label: "Web", items: ["React", "Next.js"] }],
    experienceIntro: "Experience",
    experiences: [
      {
        company: "Acme",
        role: "Engineer",
        period: "2024",
        stack: ["TypeScript"],
      },
    ],
  },
  {
    type: "loop",
    heading: "Loop",
    intro: "Tools",
    items: [{ tool: "Claude", use: "Code", frequency: "Every day" }],
    footer: "Footer",
  },
  {
    type: "say",
    heading: "Say hi",
    email: "hi@example.com",
    whatsappUrl: "https://wa.example/hi",
  },
];

describe("homepage section forms", () => {
  test("names every fixed section and recognises only those types", () => {
    expect(homeSectionTypes.map((type) => homeSectionNames[type])).toEqual([
      "Intro",
      "Now",
      "Built",
      "Commits",
      "Frames",
      "Reach",
      "Loop",
      "Say",
    ]);
    expect(isHomeSectionType("frames")).toBe(true);
    expect(isHomeSectionType("toString")).toBe(false);
    expect(isHomeSectionType(undefined)).toBe(false);
  });

  test("round-trips every section's content through its form", () => {
    for (const content of contents) {
      const draft = homeDraftFromForm(homeFormFromContent(content));

      expect(homeSectionSchema.parse(draft)).toEqual(content);
      expect(homeFieldErrors(draft)).toBeNull();
    }
  });

  test("empty forms exist for every type and start invalid where content is required", () => {
    for (const type of homeSectionTypes) {
      const values = emptyHomeForm(type);

      expect(values.type).toBe(type);
    }
    expect(homeFieldErrors(homeDraftFromForm(emptyHomeForm("now")))).toEqual(
      expect.objectContaining({ heading: ["Required."] }),
    );
  });

  test("drops blank optional text and trims list lines", () => {
    const now = homeFormFromContent(contents[1]);

    if (now.type !== "now") throw new Error("unexpected");
    expect(homeDraftFromForm({ ...now, note: "   " })).not.toHaveProperty(
      "note",
    );

    const reach = homeFormFromContent(contents[5]);

    if (reach.type !== "reach") throw new Error("unexpected");
    const draft = homeDraftFromForm({
      ...reach,
      experienceIntro: "",
      groups: [{ ...reach.groups[0], items: " React \n\n Next.js \n" }],
      experiences: [{ ...reach.experiences[0], stack: "" }],
    }) as Extract<HomeSectionContent, { type: "reach" }>;

    expect(draft.groups[0].items).toEqual(["React", "Next.js"]);
    expect(draft.experiences[0].stack).toEqual([]);
    expect(draft).not.toHaveProperty("experienceIntro");
  });

  test("keeps placeholder figures and uploaded figures distinct", () => {
    const frames = homeFormFromContent(contents[4]);

    if (frames.type !== "frames") throw new Error("unexpected");
    expect(frames.items.map((item) => item.kind)).toEqual([
      "media",
      "placeholder",
    ]);
    // Switching a figure to a placeholder drops the asset reference.
    const switched = homeDraftFromForm({
      ...frames,
      items: [
        { ...frames.items[0], kind: "placeholder", placeholderSlot: "s" },
      ],
    }) as Extract<HomeSectionContent, { type: "frames" }>;

    expect(switched.items[0]).toEqual({
      placeholderSlot: "s",
      aspectRatio: "3 / 4",
      caption: "Desk",
    });

    const intro = homeFormFromContent(contents[0]);

    if (intro.type !== "intro") throw new Error("unexpected");
    expect(
      homeDraftFromForm({
        ...intro,
        portraitAssetId: null,
        placeholderSlotId: "",
        placeholderAspectRatio: "",
        placeholderCaption: "",
      }),
    ).toMatchObject({ portraitAssetId: null, portraitPlaceholder: null });
  });

  test("maps validation issues to form fields with plain messages", () => {
    const now = homeFormFromContent(contents[1]);
    const frames = homeFormFromContent(contents[4]);
    const reach = homeFormFromContent(contents[5]);
    const intro = homeFormFromContent(contents[0]);
    const say = homeFormFromContent(contents[7]);

    if (
      now.type !== "now" ||
      frames.type !== "frames" ||
      reach.type !== "reach" ||
      intro.type !== "intro" ||
      say.type !== "say"
    ) {
      throw new Error("unexpected");
    }

    expect(
      homeFieldErrors(
        homeDraftFromForm({
          ...now,
          heading: "x".repeat(121),
          items: [{ ...now.items[0], label: " " }],
        }),
      ),
    ).toEqual({
      heading: ["Keep it to 120 characters or fewer."],
      "items.0.label": ["Required."],
    });
    expect(homeFieldErrors(homeDraftFromForm({ ...now, items: [] }))).toEqual({
      items: ["Add at least one."],
    });
    expect(
      homeFieldErrors(
        homeDraftFromForm({
          ...frames,
          items: [{ ...frames.items[0], mediaAssetId: null }],
        }),
      ),
    ).toEqual({ "items.0.mediaAssetId": ["Choose an image."] });
    expect(
      homeFieldErrors(
        homeDraftFromForm({
          ...frames,
          items: [{ ...frames.items[1], caption: "" }],
        }),
      ),
    ).toEqual({ "items.0.caption": ["Required."] });
    expect(
      homeFieldErrors(
        homeDraftFromForm({
          ...reach,
          groups: [{ ...reach.groups[0], items: "\n" }],
        }),
      ),
    ).toEqual({ "groups.0.items": ["Add at least one."] });
    expect(
      homeFieldErrors(homeDraftFromForm({ ...intro, placeholderSlotId: "" })),
    ).toEqual({ placeholderSlotId: ["Required."] });
    expect(
      homeFieldErrors(homeDraftFromForm({ ...say, email: "nope" })),
    ).toEqual({ email: ["Enter a valid email address."] });
    expect(
      homeFieldErrors(
        homeDraftFromForm({ ...say, whatsappUrl: "javascript:alert(1)" }),
      ),
    ).toEqual({ whatsappUrl: ["Expected an http, https, or mailto URL"] });
    expect(homeFieldErrors({ type: "nope" })).toEqual({
      form: expect.any(Array),
    });
  });

  test("summarises a section for the running order", () => {
    expect(sectionSummary(contents[0])).toBe("I build odd things");
    expect(sectionSummary(contents[1])).toBe("Right now");
    expect(sectionSummary(null)).toBe("Not created yet");
  });
});

describe("reorder helpers", () => {
  test("moves an item without mutating the input", () => {
    const list = ["a", "b", "c", "d"];

    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  test("ignores moves outside the list", () => {
    const list = ["a", "b"];

    expect(moveItem(list, 0, 5)).toEqual(["a", "b"]);
    expect(moveItem(list, -1, 0)).toEqual(["a", "b"]);
    expect(moveBy(list, 0, -1)).toEqual(["a", "b"]);
    expect(moveBy(list, 1, 1)).toEqual(["a", "b"]);
    expect(moveBy(list, 1, -1)).toEqual(["b", "a"]);
  });

  test("announces the new position", () => {
    expect(positionAnnouncement("Now", 0, 8)).toBe(
      "Now moved to position 1 of 8.",
    );
  });
});

describe("Say availability fields", () => {
  test("availability and investorNote round-trip and blanks are omitted", () => {
    const say = homeFormFromContent({
      type: "say",
      heading: "Talk",
      email: "hi@example.com",
      availability: "Open to remote contracts.",
      investorNote: "Happy to talk about Shelta.",
    });

    if (say.type !== "say") throw new Error("unexpected");
    expect(say.availability).toBe("Open to remote contracts.");
    expect(say.investorNote).toBe("Happy to talk about Shelta.");
    expect(homeDraftFromForm(say)).toEqual({
      type: "say",
      heading: "Talk",
      email: "hi@example.com",
      availability: "Open to remote contracts.",
      investorNote: "Happy to talk about Shelta.",
    });
    expect(
      homeDraftFromForm({ ...say, availability: " ", investorNote: "" }),
    ).toEqual({ type: "say", heading: "Talk", email: "hi@example.com" });
  });
});
