import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";

import {
  framesSectionSchema,
  homeSectionSchema,
  homeSectionTypes,
} from "@/domain/content/home";

/* Form values for the eight fixed homepage sections, and the conversions
   between them and the Task 2 content shapes. Pure: unit-tested. */

export const homeSectionNames: Record<HomeSectionType, string> = {
  intro: "Intro",
  now: "Now",
  built: "Built",
  commits: "Commits",
  frames: "Frames",
  reach: "Reach",
  loop: "Loop",
  say: "Say",
};

export const homeSectionPurposes: Record<HomeSectionType, string> = {
  intro: "The opening statement, lede and portrait.",
  now: "What you're doing right now.",
  built:
    "Heading for the featured projects. Projects are featured from the project editor.",
  commits: "The GitHub contribution calendar.",
  frames: "A sideways strip of photos and placeholders.",
  reach: "Skills you reach for and past work.",
  loop: "How AI tools fit into your work.",
  say: "The closing contact section.",
};

export const loopFrequencies = ["Every day", "Sometimes", "Rarely"] as const;

export function isHomeSectionType(value: unknown): value is HomeSectionType {
  return (
    typeof value === "string" &&
    (homeSectionTypes as readonly string[]).includes(value)
  );
}

type Row<T> = T & { key: string };

let rowCounter = 0;

/** A React key for a repeatable row; never sent to the server. */
export function rowKey() {
  rowCounter += 1;

  return `r${rowCounter}`;
}

function row<T extends object>(fields: T): Row<T> {
  return { ...fields, key: rowKey() };
}

export type IntroForm = {
  type: "intro";
  statement: Row<{ text: string; emphasis: boolean }>[];
  lede: string;
  portraitAssetId: string | null;
  placeholderSlotId: string;
  placeholderAspectRatio: string;
  placeholderCaption: string;
};
export type NowForm = {
  type: "now";
  heading: string;
  note: string;
  items: Row<{ label: string; body: string }>[];
};
export type BuiltForm = {
  type: "built";
  heading: string;
  note: string;
  ctaLabel: string;
};
export type CommitsForm = {
  type: "commits";
  heading: string;
  note: string;
  githubUsername: string;
};
export type FrameItemForm = Row<{
  kind: "media" | "placeholder";
  mediaAssetId: string | null;
  placeholderSlot: string;
  aspectRatio: string;
  caption: string;
}>;
export type FramesForm = {
  type: "frames";
  heading: string;
  note: string;
  items: FrameItemForm[];
};
export type ReachForm = {
  type: "reach";
  heading: string;
  note: string;
  /** `items` holds one entry per line. */
  groups: Row<{ label: string; items: string }>[];
  experienceIntro: string;
  /** `stack` holds one entry per line. */
  experiences: Row<{
    company: string;
    role: string;
    period: string;
    stack: string;
  }>[];
};
export type LoopForm = {
  type: "loop";
  heading: string;
  note: string;
  intro: string;
  items: Row<{ tool: string; use: string; frequency: string }>[];
  footer: string;
};
export type SayForm = {
  type: "say";
  heading: string;
  whatsappUrl: string;
  email: string;
  resumeUrl: string;
  availability: string;
  investorNote: string;
};

export type HomeFormValues =
  | IntroForm
  | NowForm
  | BuiltForm
  | CommitsForm
  | FramesForm
  | ReachForm
  | LoopForm
  | SayForm;

export type HomeFormFor<T extends HomeSectionType> = Extract<
  HomeFormValues,
  { type: T }
>;

export const emptyRows = {
  statement: () => row({ text: "", emphasis: false }),
  nowItem: () => row({ label: "", body: "" }),
  frame: () =>
    row({
      kind: "placeholder" as const,
      mediaAssetId: null,
      placeholderSlot: "",
      aspectRatio: "4 / 5",
      caption: "",
    }),
  group: () => row({ label: "", items: "" }),
  experience: () => row({ company: "", role: "", period: "", stack: "" }),
  loopItem: () => row({ tool: "", use: "", frequency: "Every day" }),
};

export function emptyHomeForm<T extends HomeSectionType>(
  type: T,
): HomeFormFor<T> {
  const forms: { [K in HomeSectionType]: HomeFormFor<K> } = {
    intro: {
      type: "intro",
      statement: [emptyRows.statement()],
      lede: "",
      portraitAssetId: null,
      placeholderSlotId: "",
      placeholderAspectRatio: "",
      placeholderCaption: "",
    },
    now: { type: "now", heading: "", note: "", items: [emptyRows.nowItem()] },
    built: { type: "built", heading: "", note: "", ctaLabel: "" },
    commits: { type: "commits", heading: "", note: "", githubUsername: "" },
    frames: { type: "frames", heading: "", note: "", items: [] },
    reach: {
      type: "reach",
      heading: "",
      note: "",
      groups: [emptyRows.group()],
      experienceIntro: "",
      experiences: [],
    },
    loop: {
      type: "loop",
      heading: "",
      note: "",
      intro: "",
      items: [emptyRows.loopItem()],
      footer: "",
    },
    say: {
      type: "say",
      heading: "",
      whatsappUrl: "",
      email: "",
      resumeUrl: "",
      availability: "",
      investorNote: "",
    },
  };

  return forms[type] as HomeFormFor<T>;
}

export function homeFormFromContent(
  content: HomeSectionContent,
): HomeFormValues {
  switch (content.type) {
    case "intro":
      return {
        type: "intro",
        statement: content.statement.map((part) =>
          row({ text: part.text, emphasis: Boolean(part.emphasis) }),
        ),
        lede: content.lede,
        portraitAssetId: content.portraitAssetId ?? null,
        placeholderSlotId: content.portraitPlaceholder?.slotId ?? "",
        placeholderAspectRatio: content.portraitPlaceholder?.aspectRatio ?? "",
        placeholderCaption: content.portraitPlaceholder?.caption ?? "",
      };
    case "now":
      return {
        type: "now",
        heading: content.heading,
        note: content.note ?? "",
        items: content.items.map((item) => row({ ...item })),
      };
    case "built":
      return {
        type: "built",
        heading: content.heading,
        note: content.note ?? "",
        ctaLabel: content.ctaLabel,
      };
    case "commits":
      return {
        type: "commits",
        heading: content.heading,
        note: content.note ?? "",
        githubUsername: content.githubUsername,
      };
    case "frames":
      return {
        type: "frames",
        heading: content.heading,
        note: content.note ?? "",
        items: content.items.map((item) =>
          "mediaAssetId" in item
            ? row({
                kind: "media" as const,
                mediaAssetId: item.mediaAssetId,
                placeholderSlot: "",
                aspectRatio: item.aspectRatio,
                caption: item.caption,
              })
            : row({
                kind: "placeholder" as const,
                mediaAssetId: null,
                placeholderSlot: item.placeholderSlot,
                aspectRatio: item.aspectRatio,
                caption: item.caption,
              }),
        ),
      };
    case "reach":
      return {
        type: "reach",
        heading: content.heading,
        note: content.note ?? "",
        groups: content.groups.map((group) =>
          row({ label: group.label, items: group.items.join("\n") }),
        ),
        experienceIntro: content.experienceIntro ?? "",
        experiences: content.experiences.map((experience) =>
          row({ ...experience, stack: experience.stack.join("\n") }),
        ),
      };
    case "loop":
      return {
        type: "loop",
        heading: content.heading,
        note: content.note ?? "",
        intro: content.intro,
        items: content.items.map((item) => row({ ...item })),
        footer: content.footer ?? "",
      };
    case "say":
      return {
        type: "say",
        heading: content.heading,
        whatsappUrl: content.whatsappUrl ?? "",
        email: content.email,
        resumeUrl: content.resumeUrl ?? "",
        availability: content.availability ?? "",
        investorNote: content.investorNote ?? "",
      };
  }
}

const text = (value: string) => value.trim();

/** Optional text: blank means absent. */
function optional<K extends string>(key: K, value: string) {
  const trimmed = value.trim();

  return (trimmed ? { [key]: trimmed } : {}) as Partial<Record<K, string>>;
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Builds the section content the services validate (unknown on purpose). */
export function homeDraftFromForm(values: HomeFormValues): unknown {
  switch (values.type) {
    case "intro": {
      const hasPlaceholder = [
        values.placeholderSlotId,
        values.placeholderAspectRatio,
        values.placeholderCaption,
      ].some((value) => value.trim());

      return {
        type: "intro",
        statement: values.statement.map((part) => ({
          text: text(part.text),
          ...(part.emphasis ? { emphasis: true } : {}),
        })),
        lede: text(values.lede),
        portraitAssetId: values.portraitAssetId,
        portraitPlaceholder: hasPlaceholder
          ? {
              slotId: text(values.placeholderSlotId),
              aspectRatio: text(values.placeholderAspectRatio),
              ...optional("caption", values.placeholderCaption),
            }
          : null,
      };
    }
    case "now":
      return {
        type: "now",
        heading: text(values.heading),
        ...optional("note", values.note),
        items: values.items.map((item) => ({
          label: text(item.label),
          body: text(item.body),
        })),
      };
    case "built":
      return {
        type: "built",
        heading: text(values.heading),
        ...optional("note", values.note),
        ctaLabel: text(values.ctaLabel),
      };
    case "commits":
      return {
        type: "commits",
        heading: text(values.heading),
        ...optional("note", values.note),
        githubUsername: text(values.githubUsername),
      };
    case "frames":
      return {
        type: "frames",
        heading: text(values.heading),
        ...optional("note", values.note),
        items: values.items.map((item) =>
          item.kind === "media"
            ? {
                mediaAssetId: item.mediaAssetId ?? "",
                aspectRatio: text(item.aspectRatio),
                caption: text(item.caption),
              }
            : {
                placeholderSlot: text(item.placeholderSlot),
                aspectRatio: text(item.aspectRatio),
                caption: text(item.caption),
              },
        ),
      };
    case "reach":
      return {
        type: "reach",
        heading: text(values.heading),
        ...optional("note", values.note),
        groups: values.groups.map((group) => ({
          label: text(group.label),
          items: lines(group.items),
        })),
        ...optional("experienceIntro", values.experienceIntro),
        experiences: values.experiences.map((experience) => ({
          company: text(experience.company),
          role: text(experience.role),
          period: text(experience.period),
          stack: lines(experience.stack),
        })),
      };
    case "loop":
      return {
        type: "loop",
        heading: text(values.heading),
        ...optional("note", values.note),
        intro: text(values.intro),
        items: values.items.map((item) => ({
          tool: text(item.tool),
          use: text(item.use),
          frequency: item.frequency,
        })),
        ...optional("footer", values.footer),
      };
    case "say":
      return {
        type: "say",
        heading: text(values.heading),
        ...optional("whatsappUrl", values.whatsappUrl),
        email: text(values.email),
        ...optional("resumeUrl", values.resumeUrl),
        ...optional("availability", values.availability),
        ...optional("investorNote", values.investorNote),
      };
  }
}

type Issue = {
  code: string;
  path: readonly PropertyKey[];
  message: string;
  origin?: string;
  maximum?: unknown;
  format?: string;
};

const placeholderKeys: Record<string, string> = {
  slotId: "placeholderSlotId",
  aspectRatio: "placeholderAspectRatio",
  caption: "placeholderCaption",
};

function fieldKey(type: unknown, path: readonly PropertyKey[]): string {
  const parts = path.map(String);

  if (!parts.length || parts[0] === "type") return "form";
  if (type === "intro" && parts[0] === "portraitPlaceholder") {
    return placeholderKeys[parts[1]] ?? "placeholderSlotId";
  }
  if (type === "reach" && parts[0] === "groups" && parts[2] === "items") {
    return `groups.${parts[1]}.items`;
  }
  if (type === "reach" && parts[0] === "experiences" && parts[2] === "stack") {
    return `experiences.${parts[1]}.stack`;
  }

  return parts.join(".");
}

function friendly(issue: Issue): string {
  const last = String(issue.path.at(-1) ?? "");

  if (last.endsWith("AssetId")) return "Choose an image.";
  switch (issue.code) {
    case "too_small":
      return issue.origin === "array" ? "Add at least one." : "Required.";
    case "too_big":
      return `Keep it to ${String(issue.maximum)} characters or fewer.`;
    case "invalid_format":
      return issue.format === "email"
        ? "Enter a valid email address."
        : issue.message;
    case "invalid_value":
      return "Choose one of the options.";
    case "invalid_type":
      return "Required.";
    default:
      return issue.message;
  }
}

const [frameMediaSchema, framePlaceholderSchema] =
  framesSectionSchema.shape.items.element.options;

/** Field errors keyed like the forms' inputs, or null when the draft is valid. */
export function homeFieldErrors(
  draft: unknown,
): Record<string, string[]> | null {
  const parsed = homeSectionSchema.safeParse(draft);

  if (parsed.success) return null;
  const type =
    draft && typeof draft === "object" && "type" in draft
      ? (draft as { type: unknown }).type
      : undefined;
  const issues: Issue[] = [];

  for (const issue of parsed.error.issues as Issue[]) {
    const [root, index] = issue.path;
    const item =
      type === "frames" && root === "items" && typeof index === "number"
        ? (draft as { items: unknown[] }).items[index]
        : undefined;

    // A figure is one of two shapes; report the shape it was meant to be.
    if (issue.code === "invalid_union" && item && typeof item === "object") {
      const branch =
        "mediaAssetId" in item ? frameMediaSchema : framePlaceholderSchema;
      const result = branch.safeParse(item);

      if (!result.success) {
        for (const nested of result.error.issues as Issue[]) {
          issues.push({ ...nested, path: ["items", index, ...nested.path] });
        }
        continue;
      }
    }
    issues.push(issue);
  }

  const errors: Record<string, string[]> = {};

  for (const issue of issues) {
    const list = (errors[fieldKey(type, issue.path)] ??= []);
    const message = friendly(issue);

    if (!list.includes(message)) list.push(message);
  }

  return errors;
}

/** One line describing a section in the running order. */
export function sectionSummary(content: HomeSectionContent | null): string {
  if (!content) return "Not created yet";
  if (content.type === "intro") {
    return content.statement.map((part) => part.text).join(" ");
  }

  return content.heading;
}
