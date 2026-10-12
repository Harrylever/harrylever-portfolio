import type { HomeSectionContent } from "@/domain/content/home";
import type { SiteProfileContent } from "@/domain/content/site-profile";

import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { generateMetadata as generatePostMetadata } from "@/app/blog/[slug]/page";
import { generateMetadata as generateProjectMetadata } from "@/app/projects/[slug]/page";
import sitemap from "@/app/sitemap";
import { homeSectionTypes } from "@/domain/content/home";
import { db } from "@/server/db/client";
import { createId } from "@/server/db/id";
import {
  homeSections,
  mediaAssets,
  mediaUsage,
  posts,
  projects,
  siteProfile,
} from "@/server/db/schema/content";
import {
  getPublishedHomepage,
  getPublishedPost,
  getPublishedProject,
  getPublishedSiteProfile,
  listPublishedPosts,
  listPublishedProjects,
} from "@/server/content/public";

import { postContent, projectContent } from "../helpers/content";
import { assertSafeTestDatabase } from "../helpers/safe-database";

assertSafeTestDatabase();

const projectPublishedAt = new Date("2026-04-02T09:00:00.000Z");
const projectSecondPublishedAt = new Date("2026-04-01T09:00:00.000Z");
const postPublishedAt = new Date("2026-03-12T09:00:00.000Z");
const profilePublishedAt = new Date("2026-04-03T09:00:00.000Z");
const portraitAssetId = "k00000000000000000000031";

const publishedProfile: SiteProfileContent = {
  name: "Published Owner",
  location: "Abuja, Nigeria",
  tagline: "Published tagline",
  description: "Published portfolio description",
  email: "published@example.com",
  githubUsername: "published-owner",
  socialLinks: [{ label: "GitHub", href: "https://github.com/published" }],
};

function section(type: (typeof homeSectionTypes)[number]): HomeSectionContent {
  const shared = { heading: `${type} heading`, note: `${type} note` };

  switch (type) {
    case "intro":
      return {
        type,
        statement: [{ text: "Published", emphasis: true }, { text: "intro" }],
        lede: "Published introduction",
        portraitAssetId,
      };
    case "now":
      return {
        type,
        ...shared,
        items: [{ label: "Work", body: "Published work" }],
      };
    case "built":
      return { type, ...shared, ctaLabel: "Read the write-ups" };
    case "commits":
      return { type, ...shared, githubUsername: "published-owner" };
    case "frames":
      return {
        type,
        ...shared,
        items: [
          {
            placeholderSlot: "published-frame",
            aspectRatio: "4 / 5",
            caption: "Published frame",
          },
        ],
      };
    case "reach":
      return {
        type,
        ...shared,
        groups: [{ label: "Daily", items: ["TypeScript"] }],
        experienceIntro: "Published experience",
        experiences: [],
      };
    case "loop":
      return {
        type,
        ...shared,
        intro: "Published AI note",
        items: [{ tool: "Claude", use: "Pairing", frequency: "Every day" }],
        footer: "Published footer",
      };
    case "say":
      return {
        type,
        heading: "Published contact heading",
        email: "published@example.com",
      };
  }
}

async function clearPublicFixtures() {
  await db.delete(mediaUsage);
  await db.delete(homeSections);
  await db.delete(siteProfile);
  await db.delete(projects);
  await db.delete(posts);
  await db.delete(mediaAssets);
}

async function resetPublicFixtures() {
  await clearPublicFixtures();
  await db.insert(mediaAssets).values({
    id: portraitAssetId,
    publicId: "tests/public/portrait",
    resourceType: "image",
    secureUrl: "https://res.cloudinary.com/demo/image/upload/portrait.jpg",
    width: 800,
    height: 1_000,
    bytes: 42_000,
    format: "jpg",
    altText: "Published portrait",
    caption: "Portrait caption",
  });
  await db.insert(siteProfile).values({
    draftContent: { ...publishedProfile, name: "Private draft owner" },
    publishedContent: publishedProfile,
    firstPublishedAt: profilePublishedAt,
    publishedAt: profilePublishedAt,
  });
  await db.insert(homeSections).values(
    homeSectionTypes.map((type, position) => ({
      type,
      draftContent:
        type === "intro"
          ? { ...section(type), lede: "Private draft introduction" }
          : section(type),
      publishedContent: section(type),
      draftVisible: true,
      publishedVisible: true,
      draftPosition: position,
      publishedPosition: position,
      firstPublishedAt: profilePublishedAt,
      publishedAt: profilePublishedAt,
    })),
  );

  const firstPublished = projectContent("Published First");
  const featuredFirst = projectContent("Featured First");

  firstPublished.seo = {
    title: "Published project SEO",
    description: "Published project SEO description",
  };
  featuredFirst.homepageStory = "Featured project story";

  await db.insert(projects).values([
    {
      id: createId(),
      slug: "published-first",
      draftContent: projectContent("Private Project Draft"),
      publishedContent: firstPublished,
      status: "published",
      displayOrder: 0,
      featured: true,
      featuredOrder: 1,
      firstPublishedAt: projectPublishedAt,
      publishedAt: projectPublishedAt,
    },
    {
      id: createId(),
      slug: "featured-first",
      draftContent: featuredFirst,
      publishedContent: featuredFirst,
      status: "published",
      displayOrder: 1,
      featured: true,
      featuredOrder: 0,
      firstPublishedAt: projectSecondPublishedAt,
      publishedAt: projectSecondPublishedAt,
    },
    {
      id: createId(),
      slug: "draft-project",
      draftContent: projectContent("Draft Project"),
      status: "draft",
      displayOrder: 2,
      featured: true,
      featuredOrder: 2,
    },
    {
      id: createId(),
      slug: "unpublished-project",
      draftContent: projectContent("Unpublished Draft"),
      publishedContent: projectContent("Old Published Project"),
      status: "unpublished",
      displayOrder: 3,
      firstPublishedAt: projectSecondPublishedAt,
      publishedAt: projectSecondPublishedAt,
    },
    {
      id: createId(),
      slug: "trashed-project",
      draftContent: projectContent("Trashed Project"),
      publishedContent: projectContent("Trashed Project"),
      status: "published",
      displayOrder: 4,
      firstPublishedAt: projectSecondPublishedAt,
      publishedAt: projectSecondPublishedAt,
      deletedAt: new Date("2026-04-04T09:00:00.000Z"),
    },
  ]);

  const publishedPost = postContent("Published Post");

  publishedPost.seo = {
    title: "Published post SEO",
    description: "Published post SEO description",
  };
  await db.insert(posts).values([
    {
      id: createId(),
      slug: "published-post",
      draftContent: postContent("Private Post Draft"),
      publishedContent: publishedPost,
      status: "published",
      firstPublishedAt: postPublishedAt,
      publishedAt: postPublishedAt,
    },
    {
      id: createId(),
      slug: "summary-only-draft",
      draftContent: postContent("Summary Only Draft"),
      status: "draft",
    },
    {
      id: createId(),
      slug: "unpublished-post",
      draftContent: postContent("Unpublished Post Draft"),
      publishedContent: postContent("Old Published Post"),
      status: "unpublished",
      firstPublishedAt: postPublishedAt,
      publishedAt: postPublishedAt,
    },
    {
      id: createId(),
      slug: "trashed-post",
      draftContent: postContent("Trashed Post"),
      publishedContent: postContent("Trashed Post"),
      status: "published",
      firstPublishedAt: postPublishedAt,
      publishedAt: postPublishedAt,
      deletedAt: new Date("2026-04-04T09:00:00.000Z"),
    },
  ]);
}

describe.serial("public content repositories", () => {
  beforeEach(resetPublicFixtures, 60_000);
  afterAll(clearPublicFixtures, 60_000);

  test("exposes only published snapshots in public order", async () => {
    expect(await getPublishedSiteProfile()).toMatchObject(publishedProfile);

    const homepage = await getPublishedHomepage();

    expect(homepage?.intro.lede).toBe("Published introduction");
    expect(homepage?.intro.portraitAsset).toMatchObject({
      id: portraitAssetId,
      altText: "Published portrait",
    });
    expect(homepage?.built.projects.map(({ slug }) => slug)).toEqual([
      "featured-first",
      "published-first",
    ]);

    const projectRows = await listPublishedProjects();

    expect(projectRows.map(({ slug, name }) => ({ slug, name }))).toEqual([
      { slug: "published-first", name: "Published First" },
      { slug: "featured-first", name: "Featured First" },
    ]);
    expect((await getPublishedProject("published-first"))?.seo).toEqual({
      title: "Published project SEO",
      description: "Published project SEO description",
    });
    expect(await getPublishedProject("unpublished-project")).toBeNull();
    expect(await getPublishedProject("trashed-project")).toBeNull();
    expect(await getPublishedProject("missing-project")).toBeNull();

    const postRows = await listPublishedPosts();

    expect(postRows.map(({ slug, title }) => ({ slug, title }))).toEqual([
      { slug: "published-post", title: "Published Post" },
    ]);
    expect((await getPublishedPost("published-post"))?.seo).toEqual({
      title: "Published post SEO",
      description: "Published post SEO description",
    });
    expect(await getPublishedPost("summary-only-draft")).toBeNull();
    expect(await getPublishedPost("unpublished-post")).toBeNull();
    expect(await getPublishedPost("trashed-post")).toBeNull();
    expect(await getPublishedPost("missing-post")).toBeNull();
  }, 120_000);

  test("uses published SEO and publication timestamps for metadata and sitemap", async () => {
    expect(
      await generateProjectMetadata({
        params: Promise.resolve({ slug: "published-first" }),
      }),
    ).toMatchObject({
      title: "Published project SEO",
      description: "Published project SEO description",
    });
    expect(
      await generatePostMetadata({
        params: Promise.resolve({ slug: "published-post" }),
      }),
    ).toMatchObject({
      title: "Published post SEO",
      description: "Published post SEO description",
    });

    const entries = await sitemap();

    expect(entries).toContainEqual(
      expect.objectContaining({
        url: "https://www.deanukanah.dev/projects/published-first",
        lastModified: projectPublishedAt,
      }),
    );
    expect(entries).toContainEqual(
      expect.objectContaining({
        url: "https://www.deanukanah.dev/blog/published-post",
        lastModified: postPublishedAt,
      }),
    );
    expect(entries.some(({ url }) => url.includes("draft-project"))).toBe(
      false,
    );
    expect(entries.some(({ url }) => url.includes("summary-only-draft"))).toBe(
      false,
    );
  }, 120_000);
});
