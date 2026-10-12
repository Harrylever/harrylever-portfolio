import type { ActionResult } from "@/domain/content/action-result";
import type { HomeSectionContent } from "@/domain/content/home";
import type { PostContent } from "@/domain/content/post";
import type { ProjectContent } from "@/domain/content/project";
import type { RichTextDocument } from "@/domain/content/rich-text";
import type { SiteProfileContent } from "@/domain/content/site-profile";
import type { PostBlock } from "@/types";
import type { AdminSession } from "@/server/auth/require-admin";

import { isDeepStrictEqual } from "node:util";

import { and, asc, eq, isNull } from "drizzle-orm";

import { homeSectionSchema, homeSectionTypes } from "@/domain/content/home";
import { postContentSchema } from "@/domain/content/post";
import { projectContentSchema } from "@/domain/content/project";
import { siteProfileContentSchema } from "@/domain/content/site-profile";
import { normalizeSlug } from "@/domain/content/shared";
import { ME } from "@/data/me";
import { POSTS } from "@/data/posts";
import { PROJECTS } from "@/data/projects";
import { serverEnv } from "@/env/server";
import { buildAdminSession } from "@/server/auth/session";
import { db } from "@/server/db/client";
import {
  homeSections,
  posts,
  projects,
  siteProfile,
} from "@/server/db/schema/content";
import {
  publishHomepage,
  saveHomeSectionDraft,
} from "@/server/content/home/service";
import { createPost, publishPost } from "@/server/content/posts/service";
import {
  createProject,
  publishProject,
} from "@/server/content/projects/service";
import {
  publishSiteProfile,
  saveSiteProfileDraft,
} from "@/server/content/site-profile/service";

export type SeedSummary = {
  created: number;
  updated: number;
  siteProfiles: number;
  homeSections: number;
  projects: number;
  publishedPosts: number;
  draftPosts: number;
};

function equalJson(left: unknown, right: unknown): boolean {
  return isDeepStrictEqual(left, right);
}

function unwrap<T>(result: ActionResult<T>, operation: string): T {
  if (!result.ok) {
    throw new Error(`${operation}: ${result.error.message}`);
  }

  return result.data;
}

function seedActor(): AdminSession {
  // Seed writes are attributed to the environment-preset administrator.
  return buildAdminSession(
    serverEnv.ADMIN_EMAIL ?? "content-seed@localhost",
    new Date(Date.now() + 60 * 60 * 1000),
  );
}

function siteProfileContent(): SiteProfileContent {
  const github = ME.links.find(({ label }) => label === "GitHub");

  if (!github) throw new Error("Legacy profile is missing its GitHub link");

  return siteProfileContentSchema.parse({
    name: ME.name,
    location: ME.location,
    tagline: ME.intro.map(({ w }) => w).join(" "),
    description: ME.lede,
    email: "devdean315user@gmail.com",
    githubUsername: new URL(github.href).pathname.replace(/^\/+|\/+$/g, ""),
    socialLinks: ME.links,
  });
}

function homeSectionContent(): HomeSectionContent[] {
  const sections: HomeSectionContent[] = [
    {
      type: "intro",
      statement: ME.intro.map(({ w, e }) => ({
        text: w,
        ...(e ? { emphasis: true } : {}),
      })),
      lede: ME.lede,
      portraitAssetId: null,
      portraitPlaceholder: {
        slotId: "intro-portrait",
        aspectRatio: "4 / 5",
        caption: "A photo of you goes here — drag one in.",
      },
    },
    {
      type: "now",
      heading: "Right now",
      note: "Updated whenever it stops being true.",
      items: ME.now,
    },
    {
      type: "built",
      heading: "Things I've built",
      note: "Some are live, some are half-finished. Both count.",
      ctaLabel: "Read the full write-ups",
    },
    {
      type: "commits",
      heading: "Commits",
      note: "Pulled live from GitHub — a rolling year, not a highlight reel.",
      githubUsername: "harrylever",
    },
    {
      type: "frames",
      heading: "Off the screen",
      note: "Abuja, the desk, and the occasional 3am screenshot. Scroll — it moves sideways.",
      items: ME.frames.map(({ slot, aspect, caption }) => ({
        placeholderSlot: slot,
        aspectRatio: aspect,
        caption,
      })),
    },
    {
      type: "reach",
      heading: "What I reach for",
      note: "Grouped by how often I actually open it.",
      groups: ME.reach,
      experienceIntro:
        "I have also done this for other people — four years of it, if the résumé is the thing you came for.",
      experiences: ME.worked,
    },
    {
      type: "loop",
      heading: "AI in the loop",
      note: "Ordered by how often it is actually open, not by how impressive it sounds.",
      intro: ME.aiNote,
      items: ME.ai.map(({ tool, use, freq }) => ({
        tool,
        use,
        frequency: freq,
      })),
      footer:
        "The security work cuts the other way: AIZEN exists because a model will happily write you something that runs and is quietly exploitable.",
    },
    {
      type: "say",
      heading:
        "If you're building something odd, or you just want to compare notes — I'd like to hear about it.",
      whatsappUrl: "https://wa.link/hemaxw",
      email: "devdean315user@gmail.com",
    },
  ];

  return sections.map((section) => homeSectionSchema.parse(section));
}

function legacyDocument(blocks: PostBlock[] = []): RichTextDocument {
  return {
    type: "doc",
    content: blocks.map((block) => {
      if (block.t === "p") {
        return {
          type: "paragraph" as const,
          content: [{ type: "text" as const, text: block.c }],
        };
      }
      if (block.t === "h2" || block.t === "h3") {
        return {
          type: "heading" as const,
          attrs: { level: block.t === "h2" ? (2 as const) : (3 as const) },
          content: [{ type: "text" as const, text: block.c }],
        };
      }
      if (block.t === "blockquote") {
        return {
          type: "blockquote" as const,
          content: [
            {
              type: "paragraph" as const,
              content: [{ type: "text" as const, text: block.c }],
            },
          ],
        };
      }
      if (block.t === "pre") {
        return {
          type: "codeBlock" as const,
          content: [{ type: "text" as const, text: block.c }],
        };
      }

      if (block.t === "ul" || block.t === "ol") {
        return {
          type:
            block.t === "ul"
              ? ("bulletList" as const)
              : ("orderedList" as const),
          content: block.c.map((text) => ({
            type: "listItem" as const,
            content: [
              {
                type: "paragraph" as const,
                content: [{ type: "text" as const, text }],
              },
            ],
          })),
        };
      }

      throw new Error("Unsupported legacy rich-text block");
    }),
  };
}

function projectContent(index: number): ProjectContent {
  const project = PROJECTS[index];
  const build = ME.builds.find(
    ({ name }) => normalizeSlug(name) === project.slug,
  );

  if (!build) throw new Error(`Missing homepage build for ${project.slug}`);

  return projectContentSchema.parse({
    name: project.name,
    hook: project.hook,
    homepageStory: build.story,
    year: project.year,
    role: project.role,
    displayStatus: build.status,
    externalUrl: project.href ?? build.href ?? null,
    stack: project.stack,
    coverAssetId: null,
    coverPlaceholder: {
      slotId: project.slot,
      aspectRatio: build.aspect,
    },
    homepagePlaceholder: {
      slotId: build.slot,
      aspectRatio: build.aspect,
    },
    galleryAssetIds: [],
    galleryPlaceholders: (project.gallery ?? []).map((slotId) => ({
      slotId,
      aspectRatio: build.aspect,
    })),
    seo: {
      title: `${project.name} — Project`,
      description: project.hook,
    },
    caseStudy: legacyDocument(project.body),
  });
}

function postContent(index: number): PostContent {
  const post = POSTS[index];

  return postContentSchema.parse({
    title: post.title,
    summary: post.summary,
    tag: post.tag,
    coverAssetId: null,
    seo: {
      title: post.title,
      description: post.summary,
    },
    document: legacyDocument(post.body),
  });
}

function legacyPostDate(value: string): Date {
  const date = new Date(`${value} UTC`);

  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid post date: ${value}`);

  return date;
}

export async function seedLegacyContent(): Promise<SeedSummary> {
  const actor = seedActor();
  let created = 0;
  let updated = 0;
  const profileContent = siteProfileContent();
  let [profile] = await db.select().from(siteProfile).limit(1);

  if (!profile) {
    profile = unwrap(
      await saveSiteProfileDraft({
        draft: profileContent,
        expectedUpdatedAt: null,
        actor,
      }),
      "Create site profile",
    );
    created += 1;
  } else if (!equalJson(profile.draftContent, profileContent)) {
    profile = unwrap(
      await saveSiteProfileDraft({
        draft: profileContent,
        expectedUpdatedAt: profile.updatedAt.toISOString(),
        actor,
      }),
      "Update site profile",
    );
    updated += 1;
  }
  if (!equalJson(profile.publishedContent, profileContent)) {
    profile = unwrap(
      await publishSiteProfile({
        expectedUpdatedAt: profile.updatedAt.toISOString(),
        actor,
      }),
      "Publish site profile",
    );
  }

  const sectionContent = homeSectionContent();
  const existingSections = await db.select().from(homeSections);
  let homepageNeedsPublish = false;

  for (let position = 0; position < sectionContent.length; position += 1) {
    const content = sectionContent[position];
    let section = existingSections.find(({ type }) => type === content.type);

    if (!section) {
      section = unwrap(
        await saveHomeSectionDraft({
          type: content.type,
          draft: content,
          visible: true,
          position,
          expectedUpdatedAt: null,
          actor,
        }),
        `Create ${content.type} homepage section`,
      );
      created += 1;
    } else if (
      !equalJson(section.draftContent, content) ||
      !section.draftVisible ||
      section.draftPosition !== position
    ) {
      section = unwrap(
        await saveHomeSectionDraft({
          type: content.type,
          draft: content,
          visible: true,
          position,
          expectedUpdatedAt: section.updatedAt.toISOString(),
          actor,
        }),
        `Update ${content.type} homepage section`,
      );
      updated += 1;
    }
    if (
      !equalJson(section.publishedContent, content) ||
      !section.publishedVisible ||
      section.publishedPosition !== position
    ) {
      homepageNeedsPublish = true;
    }
  }
  if (homepageNeedsPublish) {
    unwrap(await publishHomepage(actor), "Publish homepage");
  }

  const projectRecords = [];

  for (let index = 0; index < PROJECTS.length; index += 1) {
    const legacy = PROJECTS[index];
    const content = projectContent(index);
    const [existing] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.slug, legacy.slug), isNull(projects.deletedAt)))
      .limit(1);
    const featuredOrder = ME.builds.findIndex(
      ({ name }) => normalizeSlug(name) === legacy.slug,
    );
    let record = existing;

    if (!record) {
      record = unwrap(
        await createProject({
          slug: legacy.slug,
          draft: content,
          actor,
          displayOrder: index,
          featured: true,
          featuredOrder,
        }),
        `Create project ${legacy.slug}`,
      );
      created += 1;
    } else if (!equalJson(record.draftContent, content)) {
      throw new Error(
        `Refusing to overwrite edited legacy project ${legacy.slug}`,
      );
    }
    if (
      record.status !== "published" ||
      !equalJson(record.publishedContent, content)
    ) {
      record = unwrap(
        await publishProject({
          id: record.id,
          expectedUpdatedAt: record.updatedAt.toISOString(),
          actor,
        }),
        `Publish project ${legacy.slug}`,
      );
    }
    projectRecords.push(record);
  }

  const orderedProjects = [...projectRecords].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
  const desiredFeatured = [...projectRecords].sort(
    (left, right) =>
      (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) -
      (right.featuredOrder ?? Number.MAX_SAFE_INTEGER),
  );

  if (
    orderedProjects.some(
      (record, index) => record.slug !== PROJECTS[index].slug,
    ) ||
    desiredFeatured.some(
      (record, index) =>
        record.slug !==
        normalizeSlug(ME.builds[index]?.name ?? "missing-featured-project"),
    )
  ) {
    throw new Error("Legacy project ordering could not be preserved");
  }

  for (let index = 0; index < POSTS.length; index += 1) {
    const legacy = POSTS[index];
    const content = postContent(index);
    const [existing] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.slug, legacy.slug), isNull(posts.deletedAt)))
      .limit(1);
    let record = existing;

    if (!record) {
      record = unwrap(
        await createPost({ slug: legacy.slug, draft: content, actor }),
        `Create post ${legacy.slug}`,
      );
      created += 1;
    } else if (!equalJson(record.draftContent, content)) {
      throw new Error(
        `Refusing to overwrite edited legacy post ${legacy.slug}`,
      );
    }

    if (
      legacy.body &&
      (record.status !== "published" ||
        !equalJson(record.publishedContent, content))
    ) {
      record = unwrap(
        await publishPost({
          id: record.id,
          expectedUpdatedAt: record.updatedAt.toISOString(),
          actor,
        }),
        `Publish post ${legacy.slug}`,
      );
      const publishedAt = legacyPostDate(legacy.date);

      await db
        .update(posts)
        .set({ firstPublishedAt: publishedAt, publishedAt })
        .where(eq(posts.id, record.id));
    }
  }

  const [projectCount, postStatuses] = await Promise.all([
    db
      .select({ slug: projects.slug })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .orderBy(asc(projects.displayOrder)),
    db
      .select({ slug: posts.slug, status: posts.status })
      .from(posts)
      .where(isNull(posts.deletedAt)),
  ]);

  return {
    created,
    updated,
    siteProfiles: 1,
    homeSections: homeSectionTypes.length,
    projects: projectCount.filter(({ slug }) =>
      PROJECTS.some((project) => project.slug === slug),
    ).length,
    publishedPosts: postStatuses.filter(
      ({ slug, status }) =>
        POSTS.some((post) => post.slug === slug) && status === "published",
    ).length,
    draftPosts: postStatuses.filter(
      ({ slug, status }) =>
        POSTS.some((post) => post.slug === slug) && status === "draft",
    ).length,
  };
}
