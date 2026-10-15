import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { count } from "drizzle-orm";

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
import { applyRepositioning } from "@/server/content/seed/apply-repositioning";
import { seedLegacyContent } from "@/server/content/seed/legacy-content";

import { assertSafeTestDatabase } from "../helpers/safe-database";

assertSafeTestDatabase();

const target = () => ({
  databaseUrl: process.env.DATABASE_URL,
  envLabel: process.env.APP_ENV_LABEL,
});

async function clear() {
  await db.delete(contentEvents);
  await db.delete(mediaUsage);
  await db.delete(homeSections);
  await db.delete(siteProfile);
  await db.delete(projects);
  await db.delete(posts);
  await db.delete(mediaAssets);
}

const eventCount = async () =>
  (await db.select({ value: count() }).from(contentEvents))[0].value;

async function publishedSnapshot() {
  const [profile] = await db.select().from(siteProfile);
  const sections = await db.select().from(homeSections);
  const projectRows = await db.select().from(projects);
  const postRows = await db.select().from(posts);

  return JSON.stringify({
    profile: profile?.publishedContent,
    sections: sections
      .map((s) => [
        s.type,
        s.publishedContent,
        s.publishedVisible,
        s.publishedPosition,
      ])
      .sort(),
    projects: projectRows
      .filter((p) => p.publishedContent)
      .map((p) => [p.slug, p.status, p.publishedContent])
      .sort(),
    posts: postRows
      .filter((p) => p.publishedContent)
      .map((p) => [p.slug, p.status, p.publishedContent])
      .sort(),
  });
}

async function draftSnapshot() {
  return JSON.stringify({
    profile: (await db.select().from(siteProfile)).map((p) => p.draftContent),
    sections: (await db.select().from(homeSections)).map((s) => s.draftContent),
    projects: (await db.select().from(projects)).map((p) => p.draftContent),
    posts: (await db.select().from(posts)).map((p) => p.draftContent),
  });
}

describe.serial("repositioning drafts", () => {
  beforeEach(clear, 60_000);
  afterAll(clear, 60_000);

  test("a Neon target is refused before any write", async () => {
    await seedLegacyContent();
    const before = await eventCount();

    await expect(
      applyRepositioning({
        apply: true,
        databaseUrl: "postgresql://u:p@ep-x.us-east-2.aws.neon.tech/db",
        envLabel: "local-dev",
      }),
    ).rejects.toThrow(/neon/i);
    expect(await eventCount()).toBe(before);
  }, 120_000);

  test("fails with the db:seed message when the database is unseeded", async () => {
    await expect(
      applyRepositioning({ apply: true, ...target() }),
    ).rejects.toThrow(/db:seed first/);
  }, 120_000);

  test("a dry run reports changes and writes nothing", async () => {
    await seedLegacyContent();
    const drafts = await draftSnapshot();
    const events = await eventCount();
    const report = await applyRepositioning({ apply: false, ...target() });

    expect(report.applied).toBe(false);
    expect(report.items.some(({ action }) => action === "update")).toBe(true);
    expect(report.items.some(({ action }) => action === "create")).toBe(true);
    expect(await draftSnapshot()).toBe(drafts);
    expect(await eventCount()).toBe(events);
  }, 120_000);

  test("apply writes drafts and leaves every published column untouched", async () => {
    await seedLegacyContent();
    const published = await publishedSnapshot();
    const report = await applyRepositioning({ apply: true, ...target() });

    expect(report.applied).toBe(true);
    expect(await publishedSnapshot()).toBe(published);

    const projectRows = await db.select().from(projects);
    const shelta = projectRows.find((p) => p.slug === "shelta");

    expect(shelta?.draftContent.metrics).toHaveLength(5);
    expect(shelta?.draftContent.coverPlaceholder?.slotId).toBe(
      "pj-shelta-lead",
    );
    expect(shelta?.publishedContent?.metrics).toBeUndefined();
  }, 120_000);

  test("apply creates the missing projects and the housing post as drafts only", async () => {
    await seedLegacyContent();
    await applyRepositioning({ apply: true, ...target() });

    const projectRows = await db.select().from(projects);
    const postRows = await db.select().from(posts);

    for (const slug of ["karrigo", "libra-cleaning", "upskill-simulator"]) {
      const row = projectRows.find((p) => p.slug === slug);

      expect(row?.status).toBe("draft");
      expect(row?.publishedContent).toBeNull();
    }
    const post = postRows.find((p) => p.slug === "student-housing-in-nigeria");

    expect(post?.status).toBe("draft");
    expect(post?.publishedContent).toBeNull();
  }, 120_000);

  test("a second apply reports every item unchanged and adds no events", async () => {
    await seedLegacyContent();
    await applyRepositioning({ apply: true, ...target() });
    const events = await eventCount();
    const second = await applyRepositioning({ apply: true, ...target() });

    expect(second.items.every(({ action }) => action === "unchanged")).toBe(
      true,
    );
    expect(await eventCount()).toBe(events);
  }, 120_000);
});
