import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";
import type { PostContent } from "@/domain/content/post";
import type { ProjectContent } from "@/domain/content/project";
import type { ResolvedRichTextMedia } from "@/components/content/rich-text";
import type { SiteProfileContent } from "@/domain/content/site-profile";

import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { homeSectionSchema, homeSectionTypes } from "@/domain/content/home";
import { postContentSchema } from "@/domain/content/post";
import { projectContentSchema } from "@/domain/content/project";
import { deriveReadingTime } from "@/domain/content/rich-text";
import { siteProfileContentSchema } from "@/domain/content/site-profile";
import { db } from "@/server/db/client";
import {
  homeSections,
  mediaAssets,
  posts,
  projects,
  siteProfile,
} from "@/server/db/schema/content";
import { collectMediaReferences } from "@/server/content/media/usage";

export type PublicMediaAsset = {
  id: string;
  secureUrl: string;
  width: number;
  height: number;
  altText: string;
  caption: string | null;
};

export type PublicSiteProfile = SiteProfileContent & {
  publishedAt: Date;
};

export type PublicProject = ProjectContent & {
  id: string;
  slug: string;
  displayOrder: number;
  featured: boolean;
  featuredOrder: number | null;
  publishedAt: Date;
  coverAsset: PublicMediaAsset | null;
  galleryAssets: PublicMediaAsset[];
  richTextMedia: ResolvedRichTextMedia;
};

export type PublicPost = PostContent & {
  id: string;
  slug: string;
  publishedAt: Date;
  date: string;
  year: string;
  readingTime: string;
  coverAsset: PublicMediaAsset | null;
  richTextMedia: ResolvedRichTextMedia;
};

type PublicIntroSection = Extract<HomeSectionContent, { type: "intro" }> & {
  portraitAsset: PublicMediaAsset | null;
};

type PublicFramesSection = Omit<
  Extract<HomeSectionContent, { type: "frames" }>,
  "items"
> & {
  items: Array<
    | (Extract<
        Extract<HomeSectionContent, { type: "frames" }>["items"][number],
        { mediaAssetId: string }
      > & { mediaAsset: PublicMediaAsset | null })
    | Extract<
        Extract<HomeSectionContent, { type: "frames" }>["items"][number],
        { placeholderSlot: string }
      >
  >;
};

export type PublicHomepage = {
  publishedAt: Date;
  sections: Array<{
    type: HomeSectionType;
    visible: boolean;
    position: number;
  }>;
  intro: PublicIntroSection;
  now: Extract<HomeSectionContent, { type: "now" }>;
  built: Extract<HomeSectionContent, { type: "built" }> & {
    projects: PublicProject[];
  };
  commits: Extract<HomeSectionContent, { type: "commits" }>;
  frames: PublicFramesSection;
  reach: Extract<HomeSectionContent, { type: "reach" }>;
  loop: Extract<HomeSectionContent, { type: "loop" }>;
  say: Extract<HomeSectionContent, { type: "say" }>;
};

type ProjectRow = {
  id: string;
  slug: string;
  content: ProjectContent;
  displayOrder: number;
  featured: boolean;
  featuredOrder: number | null;
  publishedAt: Date;
};

type PostRow = {
  id: string;
  slug: string;
  content: PostContent;
  publishedAt: Date;
};

function referencedIds(contents: unknown[]): string[] {
  return Array.from(
    new Set(
      contents.flatMap((content) =>
        collectMediaReferences(content).map(({ assetId }) => assetId),
      ),
    ),
  );
}

async function resolveMedia(contents: unknown[]) {
  const ids = referencedIds(contents);

  if (ids.length === 0) return new Map<string, PublicMediaAsset>();
  const rows = await db
    .select({
      id: mediaAssets.id,
      secureUrl: mediaAssets.secureUrl,
      width: mediaAssets.width,
      height: mediaAssets.height,
      altText: mediaAssets.altText,
      caption: mediaAssets.caption,
    })
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, ids));

  return new Map(rows.map((row) => [row.id, row]));
}

function richTextMedia(
  content: unknown,
  assets: Map<string, PublicMediaAsset>,
): ResolvedRichTextMedia {
  return Object.fromEntries(
    collectMediaReferences(content)
      .map(({ assetId }) => assets.get(assetId))
      .filter((asset): asset is PublicMediaAsset => Boolean(asset))
      .map((asset) => [asset.id, asset]),
  );
}

async function projectRowsToPublic(
  rows: ProjectRow[],
): Promise<PublicProject[]> {
  const parsed = rows.map((row) => ({
    ...row,
    content: projectContentSchema.parse(row.content),
  }));
  const assets = await resolveMedia(parsed.map(({ content }) => content));

  return parsed.map(({ content, ...row }) => ({
    ...content,
    ...row,
    coverAsset: content.coverAssetId
      ? (assets.get(content.coverAssetId) ?? null)
      : null,
    galleryAssets: content.galleryAssetIds.flatMap((id) => {
      const asset = assets.get(id);

      return asset ? [asset] : [];
    }),
    richTextMedia: richTextMedia(content.caseStudy, assets),
  }));
}

function displayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function postRowsToPublic(rows: PostRow[]): Promise<PublicPost[]> {
  const parsed = rows.map((row) => ({
    ...row,
    content: postContentSchema.parse(row.content),
  }));
  const assets = await resolveMedia(parsed.map(({ content }) => content));

  return parsed.map(({ content, ...row }) => ({
    ...content,
    ...row,
    date: displayDate(row.publishedAt),
    year: String(row.publishedAt.getUTCFullYear()),
    readingTime: deriveReadingTime(content.document),
    coverAsset: content.coverAssetId
      ? (assets.get(content.coverAssetId) ?? null)
      : null,
    richTextMedia: richTextMedia(content.document, assets),
  }));
}

async function queryPublishedSiteProfile(): Promise<PublicSiteProfile | null> {
  const [row] = await db
    .select({
      content: siteProfile.publishedContent,
      publishedAt: siteProfile.publishedAt,
    })
    .from(siteProfile)
    .where(
      and(
        isNotNull(siteProfile.publishedContent),
        isNotNull(siteProfile.publishedAt),
      ),
    )
    .limit(1);

  if (!row?.content || !row.publishedAt) return null;

  return {
    ...siteProfileContentSchema.parse(row.content),
    publishedAt: row.publishedAt,
  };
}

async function queryPublishedProjects(): Promise<PublicProject[]> {
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      content: projects.publishedContent,
      displayOrder: projects.displayOrder,
      featured: projects.featured,
      featuredOrder: projects.featuredOrder,
      publishedAt: projects.publishedAt,
    })
    .from(projects)
    .where(
      and(
        eq(projects.status, "published"),
        isNull(projects.deletedAt),
        isNotNull(projects.publishedContent),
        isNotNull(projects.publishedAt),
      ),
    )
    .orderBy(asc(projects.displayOrder), asc(projects.createdAt));

  return projectRowsToPublic(rows as ProjectRow[]);
}

async function queryPublishedProject(
  slug: string,
): Promise<PublicProject | null> {
  const [row] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      content: projects.publishedContent,
      displayOrder: projects.displayOrder,
      featured: projects.featured,
      featuredOrder: projects.featuredOrder,
      publishedAt: projects.publishedAt,
    })
    .from(projects)
    .where(
      and(
        eq(projects.slug, slug),
        eq(projects.status, "published"),
        isNull(projects.deletedAt),
        isNotNull(projects.publishedContent),
        isNotNull(projects.publishedAt),
      ),
    )
    .limit(1);

  if (!row?.content || !row.publishedAt) return null;
  const [project] = await projectRowsToPublic([row as ProjectRow]);

  return project;
}

async function queryPublishedPosts(): Promise<PublicPost[]> {
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      content: posts.publishedContent,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.status, "published"),
        isNull(posts.deletedAt),
        isNotNull(posts.publishedContent),
        isNotNull(posts.publishedAt),
      ),
    )
    .orderBy(desc(posts.publishedAt), asc(posts.slug));

  return postRowsToPublic(rows as PostRow[]);
}

async function queryPublishedPost(slug: string): Promise<PublicPost | null> {
  const [row] = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      content: posts.publishedContent,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.slug, slug),
        eq(posts.status, "published"),
        isNull(posts.deletedAt),
        isNotNull(posts.publishedContent),
        isNotNull(posts.publishedAt),
      ),
    )
    .limit(1);

  if (!row?.content || !row.publishedAt) return null;
  const [post] = await postRowsToPublic([row as PostRow]);

  return post;
}

async function queryPublishedHomepage(): Promise<PublicHomepage | null> {
  const [sectionRows, featuredRows] = await Promise.all([
    db
      .select({
        type: homeSections.type,
        content: homeSections.publishedContent,
        visible: homeSections.publishedVisible,
        position: homeSections.publishedPosition,
        publishedAt: homeSections.publishedAt,
      })
      .from(homeSections)
      .where(
        and(
          isNotNull(homeSections.publishedContent),
          isNotNull(homeSections.publishedPosition),
          isNotNull(homeSections.publishedAt),
        ),
      )
      .orderBy(asc(homeSections.publishedPosition)),
    db
      .select({
        id: projects.id,
        slug: projects.slug,
        content: projects.publishedContent,
        displayOrder: projects.displayOrder,
        featured: projects.featured,
        featuredOrder: projects.featuredOrder,
        publishedAt: projects.publishedAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.status, "published"),
          eq(projects.featured, true),
          isNull(projects.deletedAt),
          isNotNull(projects.publishedContent),
          isNotNull(projects.publishedAt),
        ),
      )
      .orderBy(asc(projects.featuredOrder), asc(projects.displayOrder)),
  ]);

  if (sectionRows.length !== homeSectionTypes.length) return null;
  const contentByType = new Map<HomeSectionType, HomeSectionContent>();

  for (const row of sectionRows) {
    if (!row.content || row.position === null || !row.publishedAt) return null;
    const content = homeSectionSchema.parse(row.content);

    if (content.type !== row.type || contentByType.has(row.type)) return null;
    contentByType.set(row.type, content);
  }
  if (homeSectionTypes.some((type) => !contentByType.has(type))) return null;

  const intro = contentByType.get("intro") as Extract<
    HomeSectionContent,
    { type: "intro" }
  >;
  const frames = contentByType.get("frames") as Extract<
    HomeSectionContent,
    { type: "frames" }
  >;
  const assets = await resolveMedia([intro, frames]);
  const featuredProjects = await projectRowsToPublic(
    featuredRows as ProjectRow[],
  );

  return {
    publishedAt: new Date(
      Math.max(
        ...sectionRows.map(({ publishedAt }) =>
          (publishedAt as Date).getTime(),
        ),
      ),
    ),
    sections: sectionRows.map(({ type, visible, position }) => ({
      type,
      visible,
      position: position as number,
    })),
    intro: {
      ...intro,
      portraitAsset: intro.portraitAssetId
        ? (assets.get(intro.portraitAssetId) ?? null)
        : null,
    },
    now: contentByType.get("now") as PublicHomepage["now"],
    built: {
      ...(contentByType.get("built") as PublicHomepage["built"]),
      projects: featuredProjects,
    },
    commits: contentByType.get("commits") as PublicHomepage["commits"],
    frames: {
      ...frames,
      items: frames.items.map((item) =>
        "mediaAssetId" in item
          ? {
              ...item,
              mediaAsset: assets.get(item.mediaAssetId) ?? null,
            }
          : item,
      ),
    },
    reach: contentByType.get("reach") as PublicHomepage["reach"],
    loop: contentByType.get("loop") as PublicHomepage["loop"],
    say: contentByType.get("say") as PublicHomepage["say"],
  };
}

const cachedSiteProfile = unstable_cache(
  queryPublishedSiteProfile,
  ["public-site-profile"],
  { tags: ["site-profile", "metadata"] },
);
const cachedHomepage = unstable_cache(
  queryPublishedHomepage,
  ["public-homepage"],
  { tags: ["home"] },
);
const cachedProjects = unstable_cache(
  queryPublishedProjects,
  ["public-projects"],
  { tags: ["projects:list"] },
);
const cachedPosts = unstable_cache(queryPublishedPosts, ["public-posts"], {
  tags: ["blog:list"],
});

export const getPublishedSiteProfile =
  process.env.NODE_ENV === "test"
    ? queryPublishedSiteProfile
    : cachedSiteProfile;
export const getPublishedHomepage =
  process.env.NODE_ENV === "test" ? queryPublishedHomepage : cachedHomepage;
export const listPublishedProjects =
  process.env.NODE_ENV === "test" ? queryPublishedProjects : cachedProjects;
export const listPublishedPosts =
  process.env.NODE_ENV === "test" ? queryPublishedPosts : cachedPosts;

export function getPublishedProject(slug: string) {
  if (process.env.NODE_ENV === "test") return queryPublishedProject(slug);

  return unstable_cache(
    () => queryPublishedProject(slug),
    ["public-project", slug],
    { tags: [`project:${slug}`] },
  )();
}

export function getPublishedPost(slug: string) {
  if (process.env.NODE_ENV === "test") return queryPublishedPost(slug);

  return unstable_cache(() => queryPublishedPost(slug), ["public-post", slug], {
    tags: [`blog:${slug}`],
  })();
}
