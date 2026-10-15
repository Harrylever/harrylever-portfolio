import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { asc, count } from "drizzle-orm";

import { ME } from "@/data/me";
import { POSTS } from "@/data/posts";
import { PROJECTS } from "@/data/projects";
import { db } from "@/server/db/client";
import {
  contentEvents,
  homeSections,
  mediaAssets,
  mediaUsage,
  posts,
  projects,
  siteProfile,
} from "@/server/db/schema/content";
import { seedLegacyContent } from "@/server/content/seed/legacy-content";
import { assertSafeTestDatabase } from "../helpers/safe-database";

assertSafeTestDatabase();

async function resetSeedFixtures() {
  await db.delete(contentEvents);
  await db.delete(mediaUsage);
  await db.delete(homeSections);
  await db.delete(siteProfile);
  await db.delete(projects);
  await db.delete(posts);
  await db.delete(mediaAssets);
}

async function removeSeedFixtures() {
  await db.delete(contentEvents);
  await db.delete(mediaUsage);
  await db.delete(homeSections);
  await db.delete(siteProfile);
  await db.delete(projects);
  await db.delete(posts);
  await db.delete(mediaAssets);
}

async function recordIds() {
  const [profiles, sections, projectRows, postRows] = await Promise.all([
    db.select({ id: siteProfile.id }).from(siteProfile),
    db
      .select({ id: homeSections.id, type: homeSections.type })
      .from(homeSections)
      .orderBy(asc(homeSections.draftPosition)),
    db
      .select({ id: projects.id, slug: projects.slug })
      .from(projects)
      .orderBy(asc(projects.displayOrder)),
    db
      .select({ id: posts.id, slug: posts.slug })
      .from(posts)
      .orderBy(asc(posts.slug)),
  ]);

  return { profiles, sections, projects: projectRows, posts: postRows };
}

describe.serial("legacy content seed", () => {
  beforeEach(resetSeedFixtures, 60_000);
  afterAll(removeSeedFixtures, 60_000);

  test("imports all legacy content without duplicates or invented media", async () => {
    const first = await seedLegacyContent();
    const firstIds = await recordIds();
    const [{ value: firstEventCount }] = await db
      .select({ value: count() })
      .from(contentEvents);
    const second = await seedLegacyContent();
    const secondIds = await recordIds();
    const [{ value: secondEventCount }] = await db
      .select({ value: count() })
      .from(contentEvents);

    expect(first).toMatchObject({
      created: 21,
      updated: 0,
      siteProfiles: 1,
      homeSections: 8,
      projects: 6,
      publishedPosts: 1,
      draftPosts: 5,
    });
    expect(second).toEqual({
      created: 0,
      updated: 0,
      siteProfiles: 1,
      homeSections: 8,
      projects: 6,
      publishedPosts: 1,
      draftPosts: 5,
    });
    expect(secondIds).toEqual(firstIds);
    expect(secondEventCount).toBe(firstEventCount);

    const projectRows = await db
      .select({
        slug: projects.slug,
        status: projects.status,
        featured: projects.featured,
        featuredOrder: projects.featuredOrder,
        draftContent: projects.draftContent,
        publishedContent: projects.publishedContent,
      })
      .from(projects)
      .orderBy(asc(projects.displayOrder));

    expect(projectRows.map(({ slug }) => slug)).toEqual(
      PROJECTS.map(({ slug }) => slug),
    );
    expect(projectRows.every(({ status }) => status === "published")).toBe(
      true,
    );
    expect(
      [...projectRows]
        .filter(({ featured }) => featured)
        .sort(
          (left, right) =>
            (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.featuredOrder ?? Number.MAX_SAFE_INTEGER),
        )
        .map(({ slug }) => slug),
    ).toEqual([
      "shelta",
      "aizen",
      "fola",
      "priceit",
      "sakzpredict",
      "crystalizer",
    ]);
    expect(projectRows[0].publishedContent).toEqual(
      projectRows[0].draftContent,
    );
    expect(projectRows[0].draftContent).toMatchObject({
      homepageStory: ME.builds[0].story,
      homepagePlaceholder: {
        slotId: "build-shelta",
        aspectRatio: "3 / 2",
      },
      coverPlaceholder: {
        slotId: "pj-shelta-lead",
        aspectRatio: "3 / 2",
      },
      galleryPlaceholders: [
        { slotId: "pj-shelta-a", aspectRatio: "3 / 2" },
        { slotId: "pj-shelta-b", aspectRatio: "3 / 2" },
      ],
    });

    const postRows = await db
      .select({
        slug: posts.slug,
        status: posts.status,
        publishedContent: posts.publishedContent,
      })
      .from(posts)
      .orderBy(asc(posts.slug));
    const publishedPosts = postRows.filter(
      ({ status }) => status === "published",
    );

    expect(publishedPosts.map(({ slug }) => slug)).toEqual([
      "tree-sitter-reading-code",
    ]);
    expect(publishedPosts[0].publishedContent).not.toBeNull();
    expect(postRows.filter(({ status }) => status === "draft")).toHaveLength(
      POSTS.length - 1,
    );

    const [profile] = await db.select().from(siteProfile);

    expect(profile.publishedContent).toEqual(profile.draftContent);
    expect(profile.publishedContent).toMatchObject({
      name: ME.name,
      location: ME.location,
      githubUsername: "harrylever",
    });

    const sectionRows = await db
      .select({
        type: homeSections.type,
        position: homeSections.publishedPosition,
        draftContent: homeSections.draftContent,
        publishedContent: homeSections.publishedContent,
      })
      .from(homeSections)
      .orderBy(asc(homeSections.publishedPosition));

    expect(sectionRows.map(({ type }) => type)).toEqual([
      "intro",
      "now",
      "built",
      "commits",
      "frames",
      "reach",
      "loop",
      "say",
    ]);
    expect(
      sectionRows.every(
        ({ draftContent, publishedContent }) =>
          JSON.stringify(draftContent) === JSON.stringify(publishedContent),
      ),
    ).toBe(true);
    expect(
      sectionRows.find(({ type }) => type === "intro")?.draftContent,
    ).toMatchObject({
      portraitPlaceholder: {
        slotId: "intro-portrait",
        aspectRatio: "4 / 5",
      },
    });
    expect(
      sectionRows.find(({ type }) => type === "frames")?.draftContent,
    ).toMatchObject({
      items: ME.frames.map((frame) => ({
        placeholderSlot: frame.slot,
        aspectRatio: frame.aspect,
        caption: frame.caption,
      })),
    });

    const [{ value: mediaCount }] = await db
      .select({ value: count() })
      .from(mediaAssets);

    expect(mediaCount).toBe(0);
  }, 300_000);
});
