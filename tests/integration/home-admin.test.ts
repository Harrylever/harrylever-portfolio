import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { asc, eq } from "drizzle-orm";

import { adminActor } from "../helpers/content";
import { assertSafeTestDatabase } from "../helpers/safe-database";

import { homeSectionTypes } from "@/domain/content/home";
import { AdminAuthorizationError } from "@/server/auth/require-admin";
import { db } from "@/server/db/client";
import {
  contentEvents,
  homeSections,
  mediaAssets,
  mediaUsage,
} from "@/server/db/schema/content";
import {
  readHomeForAdmin,
  readHomeSectionForEditing,
  runPublishHomepage,
  runReorderHome,
  runSaveHomeSection,
  runSetHomeSectionVisibility,
} from "@/server/content/home/admin";
import { getHomepageSnapshot } from "@/server/content/home/repository";
import {
  type HomeWriteHook,
  publishHomepage,
  reorderHomeDraft,
} from "@/server/content/home/service";

assertSafeTestDatabase();

const deps = { authorize: async () => adminActor() };
const deny = {
  authorize: async () => {
    throw new AdminAuthorizationError(401);
  },
};

function section(type: HomeSectionType): HomeSectionContent {
  const shared = { heading: `${type} heading` };

  switch (type) {
    case "intro":
      return { type, statement: [{ text: "Hello" }], lede: "Introduction" };
    case "now":
      return { type, ...shared, items: [{ label: "Work", body: "Building" }] };
    case "built":
      return { type, ...shared, ctaLabel: "View project" };
    case "commits":
      return { type, ...shared, githubUsername: "harrylever" };
    case "frames":
      return { type, ...shared, items: [] };
    case "reach":
      return {
        type,
        ...shared,
        groups: [{ label: "Web", items: ["React"] }],
        experiences: [],
      };
    case "loop":
      return {
        type,
        ...shared,
        intro: "Tools",
        items: [{ tool: "Neovim", use: "Code", frequency: "Every day" }],
      };
    case "say":
      return { type, heading: "Say hello", email: "hello@example.com" };
  }
}

function unwrap<T>(result: { ok: true; data: T } | { ok: false }): T {
  if (!result.ok)
    throw new Error(`Expected success: ${JSON.stringify(result)}`);

  return result.data;
}

async function reset() {
  await db.delete(contentEvents);
  await db.delete(mediaUsage);
  await db.delete(homeSections);
  await db.delete(mediaAssets);
}

async function createAll() {
  for (const type of homeSectionTypes) {
    unwrap(
      await runSaveHomeSection(
        {
          type,
          draft: section(type),
          visible: true,
          expectedUpdatedAt: null,
        },
        deps,
      ),
    );
  }

  return readHomeForAdmin();
}

function versions(overview: Awaited<ReturnType<typeof readHomeForAdmin>>) {
  return overview.sections.map((row) => ({
    type: row.type,
    updatedAt: row.updatedAt,
  }));
}

describe.serial("homepage admin", () => {
  beforeEach(reset, 60_000);
  afterAll(reset, 60_000);

  test("creates sections in order, reports missing ones, and maps field errors", async () => {
    const empty = await readHomeForAdmin();

    expect(empty.complete).toBe(false);
    expect(empty.sections.map((row) => [row.type, row.exists])).toEqual(
      homeSectionTypes.map((type) => [type, false]),
    );
    expect(await readHomeSectionForEditing("toString")).toBeNull();
    expect(await readHomeSectionForEditing("now")).toMatchObject({
      type: "now",
      draft: null,
      updatedAt: null,
      visible: true,
    });

    expect(
      await runSaveHomeSection(
        {
          type: "now",
          draft: { ...section("now"), items: [{ label: "", body: "x" }] },
          visible: true,
          expectedUpdatedAt: null,
        },
        deps,
      ),
    ).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        fieldErrors: { "items.0.label": ["Required."] },
      },
    });
    expect(
      await runSaveHomeSection(
        {
          type: "now",
          draft: section("say"),
          visible: true,
          expectedUpdatedAt: null,
        },
        deps,
      ),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(
      await runSaveHomeSection(
        {
          type: "now",
          draft: section("now"),
          visible: true,
          expectedUpdatedAt: null,
        },
        deny,
      ),
    ).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });

    const overview = await createAll();

    expect(overview.complete).toBe(true);
    expect(overview.sections.map((row) => row.type)).toEqual([
      ...homeSectionTypes,
    ]);
    expect(overview.sections.every((row) => row.hasUnpublishedChanges)).toBe(
      true,
    );
  }, 240_000);

  test("saves with conflict detection and toggles visibility only", async () => {
    await createAll();
    const now = await readHomeSectionForEditing("now");

    if (!now?.updatedAt) throw new Error("missing now");
    const saved = unwrap(
      await runSaveHomeSection(
        {
          type: "now",
          draft: { ...section("now"), heading: "Changed" },
          visible: true,
          expectedUpdatedAt: now.updatedAt,
        },
        deps,
      ),
    );

    expect(saved).toMatchObject({ draft: { heading: "Changed" }, position: 1 });
    expect(
      await runSaveHomeSection(
        {
          type: "now",
          draft: { ...section("now"), heading: "Stale" },
          visible: true,
          expectedUpdatedAt: now.updatedAt,
        },
        deps,
      ),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });

    const hidden = unwrap(
      await runSetHomeSectionVisibility(
        { type: "now", visible: false, expectedUpdatedAt: saved.updatedAt },
        deps,
      ),
    );
    const row = hidden.sections.find((item) => item.type === "now");

    expect(row).toMatchObject({ visible: false, position: 1 });
    expect((await readHomeSectionForEditing("now"))?.draft).toMatchObject({
      heading: "Changed",
    });
  }, 240_000);

  test("reorders all sections and rejects stale orders", async () => {
    const overview = await createAll();
    const order = versions(overview);
    const swapped = [order[1], order[0], ...order.slice(2)];

    const reordered = unwrap(
      await runReorderHome(
        {
          order: swapped.map((item) => ({
            type: item.type,
            expectedUpdatedAt: item.updatedAt,
          })),
        },
        deps,
      ),
    );

    expect(reordered.sections.slice(0, 3).map((row) => row.type)).toEqual([
      "now",
      "intro",
      "built",
    ]);
    expect(
      await runReorderHome(
        {
          order: order.map((item) => ({
            type: item.type,
            expectedUpdatedAt: item.updatedAt,
          })),
        },
        deps,
      ),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(
      await runReorderHome({ order: [{ type: "intro" }] }, deps),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
  }, 240_000);

  test("publishes atomically, names failing sections, and refuses stale publishes", async () => {
    const incomplete = await readHomeForAdmin();

    expect(
      await runPublishHomepage({ expected: versions(incomplete) }, deps),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });

    let overview = await createAll();
    const [asset] = await db
      .insert(mediaAssets)
      .values({
        publicId: "portfolio/test/home-admin-no-alt",
        resourceType: "image",
        secureUrl: "https://res.cloudinary.com/x/home-admin-no-alt.png",
        width: 10,
        height: 10,
        bytes: 10,
        format: "png",
        altText: "",
      })
      .returning();
    const frames = overview.sections.find((row) => row.type === "frames");

    unwrap(
      await runSaveHomeSection(
        {
          type: "frames",
          draft: {
            ...section("frames"),
            items: [
              { mediaAssetId: asset.id, aspectRatio: "1 / 1", caption: "Desk" },
            ],
          },
          visible: true,
          expectedUpdatedAt: frames?.updatedAt ?? null,
        },
        deps,
      ),
    );
    overview = await readHomeForAdmin();
    const failed = await runPublishHomepage(
      { expected: versions(overview) },
      deps,
    );

    expect(failed).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        fieldErrors: { frames: [expect.stringMatching(/alt text/)] },
      },
    });
    if (!failed.ok)
      expect(failed.error.message).toMatch(/Nothing was published/);
    expect(
      (await readHomeForAdmin()).sections.every((row) => !row.published),
    ).toBe(true);

    await db
      .update(mediaAssets)
      .set({ altText: "A desk" })
      .where(eq(mediaAssets.id, asset.id));
    expect(
      await runPublishHomepage({ expected: versions(overview).slice(1) }, deps),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    const stale = versions(overview).map((item, index) =>
      index === 0 ? { ...item, updatedAt: new Date(0).toISOString() } : item,
    );

    expect(await runPublishHomepage({ expected: stale }, deps)).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });

    const published = unwrap(
      await runPublishHomepage({ expected: versions(overview) }, deps),
    );

    expect(published.sections.every((row) => row.published)).toBe(true);
    expect(published.hasUnpublishedChanges).toBe(false);
    expect(published.sections.some((row) => row.hasUnpublishedChanges)).toBe(
      false,
    );
    expect(
      await runPublishHomepage({ expected: versions(published) }, deny),
    ).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  }, 240_000);

  /**
   * Inside the transaction, before write `step`, makes a section that is
   * written later stale.
   */
  function staleSectionAt(step: number, type: HomeSectionType): HomeWriteHook {
    return async (transaction, index) => {
      if (index !== step) return;
      const [target] = await transaction
        .select({ id: homeSections.id })
        .from(homeSections)
        .where(eq(homeSections.type, type));

      await transaction
        .update(homeSections)
        .set({ updatedAt: new Date(Date.now() + 60_000) })
        .where(eq(homeSections.id, target.id));
    };
  }

  async function rowsByType() {
    return db.select().from(homeSections).orderBy(asc(homeSections.type));
  }

  test("a publish that conflicts mid-way publishes nothing", async () => {
    await createAll();
    const before = await rowsByType();
    const result = await publishHomepage(adminActor(), {
      beforeWrite: staleSectionAt(3, "say"),
    });

    expect(result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    const after = await rowsByType();

    // Sections 0-2 were written before the conflict; all rolled back.
    expect(after.every((row) => row.publishedAt === null)).toBe(true);
    expect(after.map((row) => row.updatedAt.toISOString())).toEqual(
      before.map((row) => row.updatedAt.toISOString()),
    );
    expect(
      (await db.select().from(contentEvents)).filter(
        (event) => event.eventType === "publish",
      ),
    ).toHaveLength(0);
    expect((await readHomeForAdmin()).publishedAt).toBeNull();
  }, 240_000);

  test("a reorder that conflicts mid-way leaves the order unchanged", async () => {
    const overview = await createAll();
    const before = await rowsByType();
    const order = versions(overview);
    const reversed = [...order].reverse();
    const result = await reorderHomeDraft({
      sections: reversed.map((item) => ({
        type: item.type,
        expectedUpdatedAt: item.updatedAt as string,
      })),
      actor: adminActor(),
      beforeWrite: staleSectionAt(3, "intro"),
    });

    expect(result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    const after = await rowsByType();

    expect(
      after.map((row) => [
        row.type,
        row.draftPosition,
        row.updatedAt.toISOString(),
      ]),
    ).toEqual(
      before.map((row) => [
        row.type,
        row.draftPosition,
        row.updatedAt.toISOString(),
      ]),
    );
  }, 240_000);

  test("publishes a reordered homepage in the new order", async () => {
    const overview = await createAll();
    const order = versions(overview);
    // Now below Built: intro, built, now, ...
    const moved = [order[0], order[2], order[1], ...order.slice(3)];
    const reordered = unwrap(
      await runReorderHome(
        {
          order: moved.map((item) => ({
            type: item.type,
            expectedUpdatedAt: item.updatedAt,
          })),
        },
        deps,
      ),
    );

    unwrap(await runPublishHomepage({ expected: versions(reordered) }, deps));
    const published = await getHomepageSnapshot("published");

    expect(published.sections.slice(0, 3).map((row) => row.type)).toEqual([
      "intro",
      "built",
      "now",
    ]);
  }, 240_000);
});
