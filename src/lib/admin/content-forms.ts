import type { PostContent } from "@/domain/content/post";
import type {
  ProjectContent,
  ProjectKind,
  StatusTone,
} from "@/domain/content/project";
import type { RichTextDocument } from "@/domain/content/rich-text";

import { projectKindOf } from "@/domain/content/project";

/* Pure helpers shared by the project/post forms and their server actions. */

export type ProjectFormValues = {
  slug: string;
  name: string;
  hook: string;
  homepageStory: string;
  year: string;
  role: string;
  displayStatus: string;
  kind: ProjectKind;
  statusTone: StatusTone | "";
  metrics: { label: string; value: string; asOf: string }[];
  externalUrl: string;
  /** One technology per line (commas also split). */
  stack: string;
  coverAssetId: string | null;
  galleryAssetIds: string[];
  seoTitle: string;
  seoDescription: string;
  caseStudy: RichTextDocument;
};

export type PostFormValues = {
  slug: string;
  title: string;
  summary: string;
  tag: string;
  coverAssetId: string | null;
  seoTitle: string;
  seoDescription: string;
  document: RichTextDocument;
};

const emptyDocument = (): RichTextDocument => ({ type: "doc", content: [] });

export function emptyProjectForm(): ProjectFormValues {
  return {
    slug: "",
    name: "",
    hook: "",
    homepageStory: "",
    year: String(new Date().getFullYear()),
    role: "",
    displayStatus: "",
    kind: "product",
    statusTone: "",
    metrics: [],
    externalUrl: "",
    stack: "",
    coverAssetId: null,
    galleryAssetIds: [],
    seoTitle: "",
    seoDescription: "",
    caseStudy: emptyDocument(),
  };
}

export function emptyPostForm(): PostFormValues {
  return {
    slug: "",
    title: "",
    summary: "",
    tag: "",
    coverAssetId: null,
    seoTitle: "",
    seoDescription: "",
    document: emptyDocument(),
  };
}

export function projectFormFromContent(
  slug: string,
  content: ProjectContent,
): ProjectFormValues {
  return {
    slug,
    name: content.name,
    hook: content.hook,
    homepageStory: content.homepageStory,
    year: content.year,
    role: content.role,
    displayStatus: content.displayStatus,
    kind: projectKindOf(content),
    statusTone: content.statusTone ?? "",
    metrics: (content.metrics ?? []).map((metric) => ({ ...metric })),
    externalUrl: content.externalUrl ?? "",
    stack: content.stack.join("\n"),
    coverAssetId: content.coverAssetId ?? null,
    galleryAssetIds: [...content.galleryAssetIds],
    seoTitle: content.seo.title,
    seoDescription: content.seo.description,
    caseStudy: content.caseStudy,
  };
}

export function postFormFromContent(
  slug: string,
  content: PostContent,
): PostFormValues {
  return {
    slug,
    title: content.title,
    summary: content.summary,
    tag: content.tag,
    coverAssetId: content.coverAssetId ?? null,
    seoTitle: content.seo.title,
    seoDescription: content.seo.description,
    document: content.document,
  };
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Builds the unvalidated draft the server parses. Fields the form doesn't
 * edit (image placeholders from the seed) are carried over from `base`.
 */
export function projectDraftFromForm(
  values: ProjectFormValues,
  base: ProjectContent | null,
): unknown {
  const preserved: Partial<ProjectContent> = {};

  if (base?.coverPlaceholder)
    preserved.coverPlaceholder = base.coverPlaceholder;
  if (base?.homepagePlaceholder) {
    preserved.homepagePlaceholder = base.homepagePlaceholder;
  }
  if (base?.galleryPlaceholders) {
    preserved.galleryPlaceholders = base.galleryPlaceholders;
  }

  const metrics = values.metrics
    .map(({ label, value, asOf }) => ({
      label: label.trim(),
      value: value.trim(),
      asOf: asOf.trim(),
    }))
    .filter(({ label, value, asOf }) => label || value || asOf);

  return {
    name: values.name.trim(),
    hook: values.hook.trim(),
    homepageStory: values.homepageStory.trim(),
    year: values.year.trim(),
    role: values.role.trim(),
    displayStatus: values.displayStatus.trim(),
    // The default kind is only written when the row already carried one, so
    // a legacy row saves without gaining keys.
    ...(values.kind !== "product" || base?.kind ? { kind: values.kind } : {}),
    ...(values.statusTone ? { statusTone: values.statusTone } : {}),
    ...(metrics.length ? { metrics } : {}),
    externalUrl: values.externalUrl.trim() || null,
    stack: splitList(values.stack),
    coverAssetId: values.coverAssetId,
    ...preserved,
    galleryAssetIds: values.galleryAssetIds,
    seo: {
      title: values.seoTitle.trim(),
      description: values.seoDescription.trim(),
    },
    caseStudy: values.caseStudy,
  };
}

export function postDraftFromForm(values: PostFormValues): unknown {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    tag: values.tag.trim(),
    coverAssetId: values.coverAssetId,
    seo: {
      title: values.seoTitle.trim(),
      description: values.seoDescription.trim(),
    },
    document: values.document,
  };
}

/** Content paths whose errors belong to one form control. */
const collapsedRoots = new Set([
  "stack",
  "metrics",
  "galleryAssetIds",
  "galleryPlaceholders",
  "caseStudy",
  "document",
]);

const seoKeys: Record<string, string> = {
  title: "seoTitle",
  description: "seoDescription",
};

/** Maps zod issue paths on content to the form's field keys. */
export function fieldErrorsFromIssues(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of issues) {
    const [root, child] = issue.path.map(String);
    let key = root ?? "form";

    if (root === "seo" && child && seoKeys[child]) key = seoKeys[child];
    else if (!root) key = "form";
    else if (!collapsedRoots.has(root) && issue.path.length > 1) {
      key = issue.path.map(String).join(".");
    }
    const list = (errors[key] ??= []);

    if (!list.includes(issue.message)) list.push(issue.message);
  }

  return errors;
}

/** Service failures that are really about a single field. */
export function serviceFieldErrors(
  message: string,
): Record<string, string[]> | undefined {
  if (/slug cannot be changed/i.test(message)) {
    return { slug: ["A published URL can't change."] };
  }
  if (/already uses this slug|now uses this slug/i.test(message)) {
    return { slug: ["Another active item already uses this URL slug."] };
  }
  if (/slug is invalid/i.test(message)) {
    return { slug: ["Use lowercase letters, numbers and hyphens."] };
  }

  return undefined;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }

  return value;
}

/** Key-order independent JSON, so jsonb round-trips compare equal. */
export function formSnapshot(value: unknown): string {
  return JSON.stringify(canonical(value));
}

const maxSlugLength = 120;

export function suggestDuplicateSlug(
  slug: string,
  takenSlugs: Iterable<string>,
): string {
  // The source is active, so its own slug is never a valid answer.
  const taken = new Set(Array.from(takenSlugs));

  taken.add(slug);

  for (let n = 1; ; n += 1) {
    const suffix = n === 1 ? "-copy" : `-copy-${n}`;
    // Trim the source so the result fits the 120-character slug limit, and
    // never leave a trailing hyphen before the suffix.
    const stem = slug
      .slice(0, maxSlugLength - suffix.length)
      .replace(/-+$/, "");
    const candidate = `${stem || "item"}${suffix}`;

    if (!taken.has(candidate)) return candidate;
  }
}

/** "Name (copy)", shortened so it still fits the field's limit. */
export function duplicateName(name: string, max: number): string {
  const suffix = " (copy)";

  return `${name.slice(0, max - suffix.length).trimEnd()}${suffix}`;
}

export const listStatusFilters = [
  "all",
  "draft",
  "published",
  "unpublished",
  "changes",
] as const;

export type ListStatusFilter = (typeof listStatusFilters)[number];

export type ListFilters = { q: string; status: ListStatusFilter };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseListFilters(
  params: Record<string, string | string[] | undefined>,
): ListFilters {
  const status = first(params.status);

  return {
    q: first(params.q).trim().slice(0, 120),
    status: (listStatusFilters as readonly string[]).includes(status)
      ? (status as ListStatusFilter)
      : "all",
  };
}
