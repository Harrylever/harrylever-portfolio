import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { signInAdmin } from "@/server/auth";
import { requireAdmin } from "@/server/auth/require-admin";
import { ADMIN_SESSION_COOKIE, ADMIN_USER_ID } from "@/server/auth/session";
import { saveSiteProfileDraft } from "@/server/content/site-profile/service";
import { db } from "@/server/db/client";
import { contentEvents, siteProfile } from "@/server/db/schema/content";
import { assertSafeTestDatabase } from "../helpers/safe-database";

assertSafeTestDatabase();

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) throw new Error(`${name} is required for auth integration tests`);

  return value;
}

async function clean() {
  await db.delete(contentEvents);
  await db.delete(siteProfile);
}

describe.serial("environment-preset administrator authentication", () => {
  beforeEach(clean, 60_000);
  afterAll(clean, 60_000);

  test("a signed-in admin can write content attributed to the admin id", async () => {
    const cookies: Array<{ name: string; value: string }> = [];
    const result = await signInAdmin(
      requiredEnv("ADMIN_EMAIL"),
      requiredEnv("ADMIN_PASSWORD"),
      { cookies: { set: (name, value) => void cookies.push({ name, value }) } },
    );

    expect(result.ok).toBe(true);
    const [cookie] = cookies;

    expect(cookie.name).toBe(ADMIN_SESSION_COOKIE);
    const actor = await requireAdmin(
      new Headers({ cookie: `${cookie.name}=${cookie.value}` }),
    );

    const saved = await saveSiteProfileDraft({
      draft: {
        name: "Auth Owner",
        location: "Lagos",
        tagline: "t",
        description: "d",
        email: "owner@example.com",
        githubUsername: "owner",
        socialLinks: [],
      },
      expectedUpdatedAt: null,
      actor,
    });

    expect(saved.ok).toBe(true);
    const events = await db
      .select({ actorId: contentEvents.actorId })
      .from(contentEvents)
      .where(eq(contentEvents.actorId, ADMIN_USER_ID));

    expect(events.length).toBeGreaterThan(0);
  }, 60_000);
});
