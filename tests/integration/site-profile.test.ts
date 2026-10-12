import type { AdminSession } from "@/server/auth/require-admin";

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { buildAdminSession } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { contentEvents, siteProfile } from "@/server/db/schema/content";
import {
  publishSiteProfile,
  saveSiteProfileDraft,
} from "@/server/content/site-profile/service";
import { assertSafeTestDatabase } from "../helpers/safe-database";

assertSafeTestDatabase();

const actor: AdminSession = buildAdminSession(
  "profile-admin@example.invalid",
  new Date(Date.now() + 60 * 60 * 1000),
);
const firstDraft = {
  name: "Harry Lever",
  location: "Lagos, Nigeria",
  tagline: "Software engineer",
  description: "I build dependable web systems.",
  email: "hello@example.com",
  githubUsername: "harrylever",
  socialLinks: [{ label: "GitHub", href: "https://github.com/harrylever" }],
};

async function reset() {
  await db.delete(contentEvents);
  await db.delete(siteProfile);
}

describe.serial("site profile publication", () => {
  beforeEach(reset, 60_000);
  afterAll(async () => {
    await db.delete(contentEvents);
    await db.delete(siteProfile);
  }, 60_000);

  test("keeps one profile and publishes draft changes explicitly", async () => {
    const created = await saveSiteProfileDraft({
      draft: firstDraft,
      expectedUpdatedAt: null,
      actor,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const published = await publishSiteProfile({
      expectedUpdatedAt: created.data.updatedAt.toISOString(),
      actor,
    });

    expect(published.ok).toBe(true);
    if (!published.ok) return;

    const changedDraft = { ...firstDraft, tagline: "Changed privately" };
    const saved = await saveSiteProfileDraft({
      draft: changedDraft,
      expectedUpdatedAt: published.data.updatedAt.toISOString(),
      actor,
    });

    expect(saved).toMatchObject({
      ok: true,
      data: { publishedContent: firstDraft },
    });
    expect(
      await saveSiteProfileDraft({
        draft: { ...firstDraft, tagline: "Stale overwrite" },
        expectedUpdatedAt: published.data.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });

    expect(await db.select().from(siteProfile)).toHaveLength(1);
    if (!saved.ok) return;
    const republished = await publishSiteProfile({
      expectedUpdatedAt: saved.data.updatedAt.toISOString(),
      actor,
    });

    expect(republished).toMatchObject({
      ok: true,
      data: { publishedContent: changedDraft },
    });
    if (republished.ok) {
      expect(republished.data.firstPublishedAt).toEqual(
        published.data.firstPublishedAt,
      );
    }
  }, 90_000);
});
