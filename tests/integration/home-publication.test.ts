import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";
import type { AdminSession } from "@/server/auth/require-admin";

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { asc, eq } from "drizzle-orm";

import { projectContent } from "../helpers/content";

import { homeSectionTypes } from "@/domain/content/home";
import { db } from "@/server/db/client";
import { createId } from "@/server/db/id";
import { user } from "@/server/db/schema/auth";
import {
  contentEvents,
  homeSections,
  mediaUsage,
  projects,
} from "@/server/db/schema/content";
import { getHomepageSnapshot } from "@/server/content/home/repository";
import {
  publishHomepage,
  reorderHomeDraft,
  saveHomeSectionDraft,
} from "@/server/content/home/service";

const actorId = "k00000000000000000000003";
const actor = { user: { id: actorId, role: "admin" } } as AdminSession;

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

async function reset() {
  await db.delete(contentEvents);
  await db.delete(mediaUsage);
  await db.delete(homeSections);
  await db.delete(projects);
  await db.delete(user).where(eq(user.id, actorId));
  await db.insert(user).values({
    id: actorId,
    name: "Home Admin",
    email: "home-admin@example.invalid",
    emailVerified: true,
    role: "admin",
  });
}

describe.serial("homepage publication", () => {
  beforeEach(reset, 60_000);
  afterAll(async () => {
    await db.delete(contentEvents);
    await db.delete(mediaUsage);
    await db.delete(homeSections);
    await db.delete(projects);
    await db.delete(user).where(eq(user.id, actorId));
  }, 60_000);

  test("publishes all eight sections atomically and keeps later drafts private", async () => {
    for (let position = 0; position < homeSectionTypes.length; position += 1) {
      const type = homeSectionTypes[position];

      expect(
        await saveHomeSectionDraft({
          type,
          draft: section(type),
          visible: true,
          position,
          expectedUpdatedAt: null,
          actor,
        }),
      ).toMatchObject({ ok: true });
    }

    expect(await publishHomepage(actor)).toMatchObject({ ok: true });
    await db.insert(projects).values([
      {
        id: createId(),
        slug: "featured-second",
        draftContent: projectContent("Featured second"),
        publishedContent: projectContent("Featured second"),
        status: "published",
        featured: true,
        featuredOrder: 1,
        firstPublishedAt: new Date(),
        publishedAt: new Date(),
      },
      {
        id: createId(),
        slug: "featured-first",
        draftContent: projectContent("Featured first"),
        publishedContent: projectContent("Featured first"),
        status: "published",
        featured: true,
        featuredOrder: 0,
        firstPublishedAt: new Date(),
        publishedAt: new Date(),
      },
    ]);
    const beforeDraftChange = await getHomepageSnapshot("published");

    expect(beforeDraftChange.sections).toHaveLength(8);
    expect(
      beforeDraftChange.featuredProjects.map((project) => project.slug),
    ).toEqual(["featured-first", "featured-second"]);

    const intro = await db.query.homeSections.findFirst({
      where: (table, { eq }) => eq(table.type, "intro"),
    });

    if (!intro) throw new Error("Missing intro section");
    const changedIntro = { ...section("intro"), lede: "Private draft" };
    const saved = await saveHomeSectionDraft({
      type: "intro",
      draft: changedIntro,
      visible: false,
      position: 7,
      expectedUpdatedAt: intro.updatedAt.toISOString(),
      actor,
    });

    expect(saved).toMatchObject({ ok: true });
    expect(await getHomepageSnapshot("published")).toEqual(beforeDraftChange);
    expect(
      await saveHomeSectionDraft({
        type: "intro",
        draft: changedIntro,
        visible: false,
        position: 7,
        expectedUpdatedAt: intro.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });

    const current = await db
      .select()
      .from(homeSections)
      .orderBy(asc(homeSections.draftPosition));
    const reordered = [...current].reverse();

    expect(
      await reorderHomeDraft({
        sections: reordered.map((item) => ({
          type: item.type,
          expectedUpdatedAt: item.updatedAt.toISOString(),
        })),
        actor,
      }),
    ).toMatchObject({ ok: true });
    expect(await publishHomepage(actor)).toMatchObject({ ok: true });
    const afterPublish = await getHomepageSnapshot("published");

    expect(afterPublish.sections.map((item) => item.type)).toEqual(
      reordered.map((item) => item.type),
    );
    expect(
      afterPublish.sections.find((item) => item.type === "intro"),
    ).toMatchObject({
      type: "intro",
      visible: false,
      content: changedIntro,
    });
  }, 240_000);

  test("rolls back all sections when one stored draft is invalid", async () => {
    for (let position = 0; position < homeSectionTypes.length; position += 1) {
      const type = homeSectionTypes[position];

      await saveHomeSectionDraft({
        type,
        draft: section(type),
        visible: true,
        position,
        expectedUpdatedAt: null,
        actor,
      });
    }
    await publishHomepage(actor);
    const before = await getHomepageSnapshot("published");

    await db
      .update(homeSections)
      .set({ draftContent: {} as HomeSectionContent, updatedAt: new Date() })
      .where(eq(homeSections.type, "frames"));

    expect(await publishHomepage(actor)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
    expect(await getHomepageSnapshot("published")).toEqual(before);
  }, 240_000);
});
