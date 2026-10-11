import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";

import {
  adminActor,
  projectContent,
  removeContentFixtures,
  resetContentFixtures,
} from "@/../tests/helpers/content";
import { db } from "@/server/db/client";
import { mediaAssets, mediaUsage } from "@/server/db/schema/content";
import {
  deleteMediaAsset,
  getMediaUsage,
  listMedia,
  registerUploadedAsset,
  updateAssetText,
} from "@/server/content/media/service";
import {
  createProject,
  publishProject,
  saveProjectDraft,
  trashProject,
} from "@/server/content/projects/service";
import type {
  CloudinaryMediaConfig,
  CloudinaryResource,
} from "@/server/media/cloudinary";

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
    secureUrl: `https://res.cloudinary.com/portfolio-test/image/upload/v42/${name}.jpg`,
    width: 1600,
    height: 900,
    bytes: 120_000,
    format: "jpg",
  };
}

function signedResponse(cloudinaryResource: CloudinaryResource) {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    signature_version: 1,
  });

  return {
    ...cloudinaryResource,
    version: 42,
    signature: cloudinary.utils.api_sign_request(
      { public_id: cloudinaryResource.publicId, version: 42 },
      config.apiSecret,
    ),
  };
}

function cloudinaryGateway(cloudinaryResource: CloudinaryResource) {
  const destroyed: string[] = [];

  return {
    destroyed,
    dependencies: {
      config,
      getResource: async () => cloudinaryResource,
      destroyResource: async (publicId: string) => {
        destroyed.push(publicId);

        return { result: "ok" };
      },
    },
  };
}

async function register(name: string, altText = "") {
  const authoritative = resource(name);
  const gateway = cloudinaryGateway(authoritative);
  const result = await registerUploadedAsset(
    { ...signedResponse(authoritative), altText, caption: null },
    adminActor(),
    gateway.dependencies,
  );

  if (!result.ok) throw new Error(`Registration failed: ${result.code}`);

  return { asset: result.data, gateway };
}

describe("media service", () => {
  beforeEach(async () => {
    await resetContentFixtures();
    await db.delete(mediaAssets);
  }, 60_000);

  afterAll(async () => {
    await removeContentFixtures();
    await db.delete(mediaAssets);
  }, 60_000);

  test("registers verified Cloudinary metadata and edits descriptive text", async () => {
    const authoritative = resource("verified");
    const gateway = cloudinaryGateway(authoritative);
    const result = await registerUploadedAsset(
      {
        ...signedResponse(authoritative),
        altText: "  A verified report screen  ",
        caption: "  The finding detail.  ",
      },
      adminActor(),
      gateway.dependencies,
    );

    expect(result).toMatchObject({
      ok: true,
      data: {
        ...authoritative,
        altText: "A verified report screen",
        caption: "The finding detail.",
      },
    });
    expect(await listMedia()).toHaveLength(1);

    if (!result.ok) return;
    const updated = await updateAssetText(
      {
        id: result.data.id,
        altText: "Updated report description",
        caption: null,
      },
      adminActor(),
    );
    expect(updated).toMatchObject({
      ok: true,
      data: { altText: "Updated report description", caption: null },
    });
  }, 120_000);

  test("requires useful alt text before attached content can publish", async () => {
    const { asset } = await register("missing-alt");
    const draft = await createProject({
      slug: "missing-alt-project",
      draft: { ...projectContent(), coverAssetId: asset.id },
      actor: adminActor(),
    });

    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    const published = await publishProject({
      id: draft.data.id,
      expectedUpdatedAt: draft.data.updatedAt.toISOString(),
      actor: adminActor(),
    });

    expect(published).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  }, 120_000);

  test("refreshes usage idempotently and preserves it when content is trashed", async () => {
    const { asset } = await register("used-by-project", "Project cover");
    const firstSave = await createProject({
      slug: "media-usage-project",
      draft: { ...projectContent(), coverAssetId: asset.id },
      actor: adminActor(),
    });

    expect(firstSave.ok).toBe(true);
    if (!firstSave.ok) return;

    const secondSave = await saveProjectDraft({
      id: firstSave.data.id,
      slug: firstSave.data.slug,
      draft: { ...projectContent(), coverAssetId: asset.id },
      expectedUpdatedAt: firstSave.data.updatedAt.toISOString(),
      actor: adminActor(),
    });

    expect(secondSave.ok).toBe(true);
    const usagesBeforeTrash = await getMediaUsage(asset.id);
    expect(usagesBeforeTrash).toHaveLength(1);

    if (!secondSave.ok) return;
    const trashed = await trashProject({
      id: secondSave.data.id,
      expectedUpdatedAt: secondSave.data.updatedAt.toISOString(),
      actor: adminActor(),
    });

    expect(trashed.ok).toBe(true);
    expect(await getMediaUsage(asset.id)).toEqual(usagesBeforeTrash);
  }, 180_000);

  test("does not delete a referenced asset", async () => {
    const { asset, gateway } = await register("referenced", "Project cover");
    const draft = await createProject({
      slug: "referenced-project",
      draft: { ...projectContent(), coverAssetId: asset.id },
      actor: adminActor(),
    });
    expect(draft.ok).toBe(true);

    const result = await deleteMediaAsset(
      asset.id,
      adminActor(),
      gateway.dependencies,
    );

    expect(result).toMatchObject({ ok: false, code: "MEDIA_IN_USE" });
    expect(gateway.destroyed).toEqual([]);
    expect(await listMedia()).toHaveLength(1);
  }, 120_000);

  test("deletes Cloudinary before removing an unreferenced database row", async () => {
    const { asset, gateway } = await register("unreferenced", "Unused image");
    const result = await deleteMediaAsset(
      asset.id,
      adminActor(),
      gateway.dependencies,
    );

    expect(result).toEqual({ ok: true, data: { id: asset.id } });
    expect(gateway.destroyed).toEqual(["portfolio/test/unreferenced"]);
    expect(await listMedia()).toEqual([]);
  }, 120_000);

  test("reports an orphan when database registration fails", async () => {
    const authoritative = resource("orphan");
    const gateway = cloudinaryGateway(authoritative);
    const result = await registerUploadedAsset(
      { ...signedResponse(authoritative), altText: "Orphaned upload" },
      adminActor(),
      {
        ...gateway.dependencies,
        insertAsset: async () => {
          throw new Error("database unavailable");
        },
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "ORPHANED_UPLOAD",
      retryable: true,
      publicId: "portfolio/test/orphan",
    });
    expect(gateway.destroyed).toEqual(["portfolio/test/orphan"]);
    expect(
      await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.publicId, "portfolio/test/orphan")),
    ).toEqual([]);
  }, 120_000);

  test("treats an identical registration retry as idempotent", async () => {
    const authoritative = resource("registration-retry");
    const gateway = cloudinaryGateway(authoritative);
    const input = {
      ...signedResponse(authoritative),
      altText: "Retry-safe upload",
      caption: null,
    };
    const first = await registerUploadedAsset(
      input,
      adminActor(),
      gateway.dependencies,
    );
    const second = await registerUploadedAsset(
      input,
      adminActor(),
      gateway.dependencies,
    );

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(gateway.destroyed).toEqual([]);
    expect(await listMedia()).toHaveLength(1);
  }, 120_000);

  test("usage rows continue to protect assets independently of content status", async () => {
    const { asset, gateway } = await register("usage-row", "Usage row image");
    await db.insert(mediaUsage).values({
      mediaAssetId: asset.id,
      contentType: "project",
      contentId: "trashed-content-id",
      snapshot: "draft",
      field: "coverAssetId",
    });

    expect(
      await deleteMediaAsset(asset.id, adminActor(), gateway.dependencies),
    ).toMatchObject({ ok: false, code: "MEDIA_IN_USE" });
  }, 120_000);
});
