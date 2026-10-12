import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import {
  adminActor,
  postContent,
  projectContent,
  removeContentFixtures,
  resetContentFixtures,
} from "../helpers/content";
import { assertSafeTestDatabase } from "../helpers/safe-database";

import { getAdminDashboard } from "@/server/content/admin-dashboard";
import { db } from "@/server/db/client";
import {
  contentEvents,
  mediaAssets,
  posts,
  projects,
} from "@/server/db/schema/content";

assertSafeTestDatabase();

async function reset() {
  await resetContentFixtures();
  await db.delete(mediaAssets);
}

describe.serial("admin dashboard metrics", () => {
  beforeEach(reset, 60_000);
  afterAll(async () => {
    await removeContentFixtures();
    await db.delete(mediaAssets);
  }, 60_000);

  test("counts content by status, trash and media, newest events first", async () => {
    const now = Date.now();
    const insertedProjects = await db
      .insert(projects)
      .values([
        { slug: "draft-one", draftContent: projectContent("Draft One") },
        { slug: "draft-two", draftContent: projectContent("Draft Two") },
        {
          slug: "live-one",
          draftContent: projectContent("Live One"),
          publishedContent: projectContent("Live One"),
          status: "published",
        },
        {
          slug: "pulled",
          draftContent: projectContent("Pulled"),
          status: "unpublished",
        },
        {
          slug: "binned",
          draftContent: projectContent("Binned"),
          status: "published",
          deletedAt: new Date(),
        },
      ])
      .returning();

    const insertedPosts = await db
      .insert(posts)
      .values([
        {
          slug: "a-post",
          draftContent: postContent("A Post"),
          publishedContent: postContent("A Post"),
          status: "published",
        },
        {
          slug: "b-post",
          draftContent: postContent("B Post"),
          deletedAt: new Date(),
        },
      ])
      .returning();

    await db.insert(mediaAssets).values({
      publicId: "portfolio/test/dashboard-image",
      resourceType: "image",
      secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      width: 10,
      height: 10,
      bytes: 100,
      format: "jpg",
      altText: "A sample",
    });

    const liveProject = insertedProjects.find((row) => row.slug === "live-one");
    const post = insertedPosts.find((row) => row.slug === "a-post");

    await db.insert(contentEvents).values([
      {
        actorId: "admin",
        contentType: "project",
        contentId: liveProject!.id,
        eventType: "publish",
        createdAt: new Date(now - 60_000),
      },
      {
        actorId: "admin",
        contentType: "post",
        contentId: post!.id,
        eventType: "update",
        createdAt: new Date(now),
      },
      {
        actorId: "admin",
        contentType: "project",
        contentId: "gone-forever",
        eventType: "permanent_delete",
        createdAt: new Date(now - 120_000),
      },
    ]);

    const dashboard = await getAdminDashboard(adminActor());

    expect(dashboard.projects).toEqual({
      draft: 2,
      published: 1,
      unpublished: 1,
      trashed: 1,
      active: 4,
    });
    expect(dashboard.posts).toEqual({
      draft: 0,
      published: 1,
      unpublished: 0,
      trashed: 1,
      active: 1,
    });
    expect(dashboard.media).toEqual({ total: 1 });
    expect(
      dashboard.recentEvents.map((event) => [
        event.eventType,
        event.contentType,
        event.label,
        event.actorId,
      ]),
    ).toEqual([
      ["update", "post", "A Post", "admin"],
      ["publish", "project", "Live One", "admin"],
      ["permanent_delete", "project", null, "admin"],
    ]);
    expect(dashboard.recentEvents[0].createdAt).toBeInstanceOf(Date);
  }, 90_000);

  test("returns zeros and no events for an empty database", async () => {
    const dashboard = await getAdminDashboard(adminActor());

    expect(dashboard.projects.active).toBe(0);
    expect(dashboard.posts.trashed).toBe(0);
    expect(dashboard.media.total).toBe(0);
    expect(dashboard.recentEvents).toEqual([]);
  }, 60_000);
});
