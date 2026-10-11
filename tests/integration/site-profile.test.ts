import type { AdminSession } from "@/server/auth/require-admin";

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "@/server/db/client";
import { user } from "@/server/db/schema/auth";
import { contentEvents, siteProfile } from "@/server/db/schema/content";
import {
  publishSiteProfile,
  saveSiteProfileDraft,
} from "@/server/content/site-profile/service";

const actorId = "k00000000000000000000002";
const actor = { user: { id: actorId, role: "admin" } } as AdminSession;
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
  await db.delete(user).where(eq(user.id, actorId));
  await db.insert(user).values({
    id: actorId,
    name: "Profile Admin",
    email: "profile-admin@example.invalid",
    emailVerified: true,
    role: "admin",
  });
}

describe.serial("site profile publication", () => {
  beforeEach(reset, 60_000);
  afterAll(async () => {
    await db.delete(contentEvents);
    await db.delete(siteProfile);
    await db.delete(user).where(eq(user.id, actorId));
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
