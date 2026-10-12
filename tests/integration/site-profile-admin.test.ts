import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { adminActor } from "../helpers/content";
import { assertSafeTestDatabase } from "../helpers/safe-database";

import { AdminAuthorizationError } from "@/server/auth/require-admin";
import { db } from "@/server/db/client";
import { contentEvents, siteProfile } from "@/server/db/schema/content";
import {
  readSiteProfileForEditing,
  runPublishSiteProfile,
  runSaveSiteProfile,
} from "@/server/content/site-profile/admin";

assertSafeTestDatabase();

const draft = {
  name: "Harry Lever",
  location: "Lagos, Nigeria",
  tagline: "Software engineer",
  description: "I build dependable web systems.",
  email: "hello@example.com",
  githubUsername: "harrylever",
  socialLinks: [{ label: "GitHub", href: "https://github.com/harrylever" }],
};

const authorize = async () => adminActor();
const deny = async () => {
  throw new AdminAuthorizationError(401);
};

async function reset() {
  await db.delete(contentEvents);
  await db.delete(siteProfile);
}

describe.serial("site profile settings actions", () => {
  beforeEach(reset, 60_000);
  afterAll(reset, 60_000);

  test("refuses to save or publish without an admin session", async () => {
    expect(
      await runSaveSiteProfile(
        { draft, expectedUpdatedAt: null },
        { authorize: deny },
      ),
    ).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(
      await runPublishSiteProfile(
        { expectedUpdatedAt: new Date().toISOString() },
        { authorize: deny },
      ),
    ).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(await db.select().from(siteProfile)).toHaveLength(0);
  }, 60_000);

  test("returns per-field errors for invalid input", async () => {
    const result = await runSaveSiteProfile(
      {
        draft: {
          ...draft,
          email: "not-an-email",
          socialLinks: [{ label: "Bad", href: "javascript:alert(1)" }],
        },
        expectedUpdatedAt: null,
      },
      { authorize },
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
    if (result.ok) return;
    expect(Object.keys(result.error.fieldErrors ?? {}).sort()).toEqual([
      "email",
      "socialLinks.0.href",
    ]);
  }, 60_000);

  test("saves, flags unpublished changes, publishes and rejects stale saves", async () => {
    const created = await runSaveSiteProfile(
      { draft, expectedUpdatedAt: null },
      { authorize },
    );

    expect(created).toMatchObject({
      ok: true,
      data: { draft, hasUnpublishedChanges: true, publishedAt: null },
    });
    if (!created.ok) return;
    expect(typeof created.data.updatedAt).toBe("string");

    const published = await runPublishSiteProfile(
      { expectedUpdatedAt: created.data.updatedAt },
      { authorize },
    );

    expect(published).toMatchObject({
      ok: true,
      data: { hasUnpublishedChanges: false },
    });
    if (!published.ok) return;
    expect(published.data.publishedAt).not.toBeNull();

    const editing = await readSiteProfileForEditing(adminActor());

    expect(editing).toMatchObject({
      draft,
      updatedAt: published.data.updatedAt,
      hasUnpublishedChanges: false,
    });

    const saved = await runSaveSiteProfile(
      {
        draft: { ...draft, tagline: "Changed" },
        expectedUpdatedAt: published.data.updatedAt,
      },
      { authorize },
    );

    expect(saved).toMatchObject({
      ok: true,
      data: { hasUnpublishedChanges: true },
    });

    // A second tab still holding the pre-save version must not overwrite.
    expect(
      await runSaveSiteProfile(
        {
          draft: { ...draft, tagline: "Stale overwrite" },
          expectedUpdatedAt: published.data.updatedAt,
        },
        { authorize },
      ),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(
      await runPublishSiteProfile(
        { expectedUpdatedAt: published.data.updatedAt },
        { authorize },
      ),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });

    const [row] = await db.select().from(siteProfile);

    expect(row.draftContent.tagline).toBe("Changed");
  }, 90_000);

  test("reads an empty profile as a blank, never-saved form", async () => {
    expect(await readSiteProfileForEditing(adminActor())).toBeNull();
  }, 60_000);
});
