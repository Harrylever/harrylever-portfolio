import type {
  CloudinaryMediaConfig,
  CloudinaryResource,
} from "@/server/media/cloudinary";

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";

import {
  adminActor,
  projectContent,
  removeContentFixtures,
  resetContentFixtures,
} from "../helpers/content";
import { assertSafeTestDatabase } from "../helpers/safe-database";

import { AdminAuthorizationError } from "@/server/auth/require-admin";
import { db } from "@/server/db/client";
import { homeSections, mediaAssets } from "@/server/db/schema/content";
import {
  listMediaForAdmin,
  runDeleteMedia,
  runRegisterMediaUpload,
  runUpdateMediaText,
} from "@/server/content/media/admin";
import {
  createProject,
  saveProjectDraft,
  trashProject,
} from "@/server/content/projects/service";

assertSafeTestDatabase();

const config: CloudinaryMediaConfig = {
  cloudName: "portfolio-test",
  apiKey: "test-key",
  apiSecret: "test-secret",
  folder: "portfolio/test",
};

function resource(name: string): CloudinaryResource {
  return {
    publicId: `portfolio/test/${name}`,
    resourceType: "image",
    secureUrl: `https://res.cloudinary.com/portfolio-test/image/upload/v42/${name}.png`,
    width: 800,
    height: 600,
    bytes: 50_000,
    format: "png",
  };
}

function signed(item: CloudinaryResource) {
  return {
    ...item,
    version: 42,
    // Response signatures are always version 1 (see the SDK's verifier).
    signature: (
      cloudinary.utils.api_sign_request as (
        params: Record<string, unknown>,
        secret: string,
        algorithm: null,
        version: number,
      ) => string
    )({ public_id: item.publicId, version: 42 }, config.apiSecret, null, 1),
  };
}

function gateway(item: CloudinaryResource) {
  const destroyed: string[] = [];

  return {
    destroyed,
    media: {
      config,
      getResource: async () => item,
      destroyResource: async (publicId: string) => {
        destroyed.push(publicId);

        return { result: "ok" };
      },
    },
  };
}

const authorize = async () => adminActor();
const deny = async () => {
  throw new AdminAuthorizationError(401);
};

async function register(name: string, altText = "A test image") {
  const item = resource(name);
  const fake = gateway(item);
  const result = await runRegisterMediaUpload(
    { ...signed(item), altText, caption: null },
    { authorize, media: fake.media },
  );

  if (!result.ok) throw new Error(JSON.stringify(result));

  return { asset: result.data, fake };
}

async function reset() {
  await resetContentFixtures();
  await db.delete(homeSections);
  await db.delete(mediaAssets);
}

describe.serial("media admin", () => {
  beforeEach(reset, 60_000);
  afterAll(async () => {
    await removeContentFixtures();
    await db.delete(mediaAssets);
  }, 60_000);

  test("requires alt text and registers only verified uploads", async () => {
    const item = resource("needs-alt");
    const fake = gateway(item);

    expect(
      await runRegisterMediaUpload(
        { ...signed(item), altText: "   ", caption: null },
        { authorize, media: fake.media },
      ),
    ).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        fieldErrors: {
          altText: ["Describe the image for people who can't see it."],
        },
      },
    });
    expect(
      await runRegisterMediaUpload(
        { ...signed(item), width: 9999, altText: "Tampered", caption: null },
        { authorize, media: fake.media },
      ),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(
      await runRegisterMediaUpload(
        { ...signed(item), signature: "forged", altText: "Forged" },
        { authorize, media: fake.media },
      ),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(
      await runRegisterMediaUpload(
        { ...signed(item), altText: "Denied" },
        { authorize: deny, media: fake.media },
      ),
    ).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(await db.select().from(mediaAssets)).toHaveLength(0);

    const { asset } = await register("verified", "  A verified desk  ");

    expect(asset).toMatchObject({
      altText: "A verified desk",
      secureUrl: item.secureUrl.replace("needs-alt", "verified"),
      usage: [],
    });
    expect(asset).not.toHaveProperty("publicId");
  }, 120_000);

  test("reports a retryable orphaned upload and cleans Cloudinary up", async () => {
    const item = resource("orphan");
    const fake = gateway(item);
    const result = await runRegisterMediaUpload(
      { ...signed(item), altText: "Orphan" },
      {
        authorize,
        media: {
          ...fake.media,
          insertAsset: async () => {
            throw new Error("database unavailable");
          },
        },
      },
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "INFRASTRUCTURE_ERROR", retryable: true },
    });
    if (!result.ok) expect(result.error.message).toMatch(/Retry the upload/);
    expect(fake.destroyed).toEqual([item.publicId]);
    expect(await db.select().from(mediaAssets)).toHaveLength(0);
  }, 120_000);

  test("edits text with alt required", async () => {
    const { asset } = await register("text");

    expect(
      await runUpdateMediaText(
        { id: asset.id, altText: "", caption: "Caption" },
        { authorize },
      ),
    ).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        fieldErrors: { altText: [expect.any(String)] },
      },
    });
    expect(
      await runUpdateMediaText(
        { id: asset.id, altText: " New alt ", caption: "  " },
        { authorize },
      ),
    ).toMatchObject({ ok: true, data: { altText: "New alt", caption: null } });
    expect(
      await runUpdateMediaText(
        { id: "z".repeat(24), altText: "x" },
        { authorize },
      ),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  }, 120_000);

  test("lists usage by name and blocks deletion while referenced", async () => {
    const { asset, fake } = await register("used", "Atlas cover");
    const created = await createProject({
      slug: "media-admin-atlas",
      draft: { ...projectContent("Atlas"), coverAssetId: asset.id },
      actor: adminActor(),
    });

    if (!created.ok) throw new Error("project");
    const [listed] = await listMediaForAdmin();

    expect(listed.usage).toEqual([
      {
        contentType: "project",
        contentId: created.data.id,
        snapshot: "draft",
        field: "coverAssetId",
        label: "Project “Atlas”",
        href: `/admin/projects/${created.data.id}`,
        trashed: false,
      },
    ]);

    const trashed = await trashProject({
      id: created.data.id,
      expectedUpdatedAt: created.data.updatedAt.toISOString(),
      actor: adminActor(),
    });

    if (!trashed.ok) throw new Error("trash");
    expect((await listMediaForAdmin())[0].usage[0]).toMatchObject({
      trashed: true,
    });

    const blocked = await runDeleteMedia(
      { id: asset.id },
      { authorize, media: fake.media },
    );

    expect(blocked).toMatchObject({ ok: false, error: { code: "IN_USE" } });
    if (!blocked.ok) {
      expect(blocked.error.message).toBe(
        "“Atlas cover” is used by Project “Atlas” (draft, in trash). Remove it there before deleting it.",
      );
    }
    expect(fake.destroyed).toEqual([]);
    expect(
      await db.select().from(mediaAssets).where(eq(mediaAssets.id, asset.id)),
    ).toHaveLength(1);

    expect(
      await runDeleteMedia(
        { id: asset.id },
        { authorize: deny, media: fake.media },
      ),
    ).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  }, 120_000);

  test("deletes an unreferenced asset permanently", async () => {
    const { asset, fake } = await register("unused");
    const created = await createProject({
      slug: "media-admin-unused",
      draft: { ...projectContent("Unused"), coverAssetId: asset.id },
      actor: adminActor(),
    });

    if (!created.ok) throw new Error("project");
    const cleared = await saveProjectDraft({
      id: created.data.id,
      slug: created.data.slug,
      draft: projectContent("Unused"),
      expectedUpdatedAt: created.data.updatedAt.toISOString(),
      actor: adminActor(),
    });

    expect(cleared.ok).toBe(true);
    expect(
      await runDeleteMedia({ id: asset.id }, { authorize, media: fake.media }),
    ).toMatchObject({ ok: true, data: { id: asset.id } });
    expect(fake.destroyed).toEqual([`portfolio/test/unused`]);
    expect(await listMediaForAdmin()).toHaveLength(0);
    expect(
      await runDeleteMedia({ id: "bad" }, { authorize, media: fake.media }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  }, 120_000);
});
