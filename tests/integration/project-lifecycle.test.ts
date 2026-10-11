import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { and, asc, eq, isNull } from "drizzle-orm";

import {
  adminActor,
  projectContent,
  removeContentFixtures,
  resetContentFixtures,
} from "../helpers/content";

import { db } from "@/server/db/client";
import { contentEvents, projects } from "@/server/db/schema/content";
import {
  createProject,
  deleteProjectPermanently,
  duplicateProject,
  publishProject,
  reorderProjects,
  restoreProject,
  saveProjectDraft,
  trashProject,
  unpublishProject,
} from "@/server/content/projects/service";

function unwrap<T>(result: { ok: true; data: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Expected lifecycle operation to succeed");

  return result.data;
}

describe.serial("project lifecycle", () => {
  beforeEach(resetContentFixtures, 30_000);
  afterAll(removeContentFixtures, 30_000);

  test("isolates drafts and supports publish, unpublish, and republish", async () => {
    const actor = adminActor();
    const created = unwrap(
      await createProject({
        slug: "project-one",
        draft: projectContent(),
        actor,
      }),
    );

    expect(created.publishedContent).toBeNull();
    const firstPublish = unwrap(
      await publishProject({
        id: created.id,
        expectedUpdatedAt: created.updatedAt.toISOString(),
        actor,
      }),
    );
    const changedDraft = projectContent("Changed Draft");
    const saved = unwrap(
      await saveProjectDraft({
        id: created.id,
        slug: "project-one",
        draft: changedDraft,
        expectedUpdatedAt: firstPublish.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(saved.publishedContent).toEqual(projectContent());
    expect(
      await saveProjectDraft({
        id: created.id,
        slug: "project-one",
        draft: projectContent("Stale Draft"),
        expectedUpdatedAt: firstPublish.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(
      await saveProjectDraft({
        id: created.id,
        slug: "renamed-after-publish",
        draft: changedDraft,
        expectedUpdatedAt: saved.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });

    const unpublished = unwrap(
      await unpublishProject({
        id: created.id,
        expectedUpdatedAt: saved.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(unpublished.status).toBe("unpublished");
    expect(unpublished.publishedContent).toEqual(projectContent());

    const republished = unwrap(
      await publishProject({
        id: created.id,
        expectedUpdatedAt: unpublished.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(republished.publishedContent).toEqual(changedDraft);
    expect(republished.firstPublishedAt).toEqual(firstPublish.firstPublishedAt);

    const events = await db
      .select({ eventType: contentEvents.eventType })
      .from(contentEvents)
      .where(eq(contentEvents.contentId, created.id));

    expect(events.map((event) => event.eventType)).toEqual([
      "create",
      "publish",
      "update",
      "unpublish",
      "publish",
    ]);
  }, 90_000);

  test("handles duplicate, trash, restore collision, and permanent deletion", async () => {
    const actor = adminActor();
    const original = unwrap(
      await createProject({ slug: "original", draft: projectContent(), actor }),
    );
    const duplicate = unwrap(
      await duplicateProject({ id: original.id, slug: "copy", actor }),
    );

    expect(duplicate).toMatchObject({ slug: "copy", status: "draft" });
    expect(duplicate.publishedContent).toBeNull();

    const trashed = unwrap(
      await trashProject({
        id: original.id,
        expectedUpdatedAt: original.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(trashed.deletedAt).toBeInstanceOf(Date);

    const replacement = unwrap(
      await createProject({ slug: "original", draft: projectContent(), actor }),
    );

    expect(
      await restoreProject({
        id: original.id,
        expectedUpdatedAt: trashed.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });

    await trashProject({
      id: replacement.id,
      expectedUpdatedAt: replacement.updatedAt.toISOString(),
      actor,
    });
    const restored = unwrap(
      await restoreProject({
        id: original.id,
        expectedUpdatedAt: trashed.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(restored.deletedAt).toBeNull();

    const retrash = unwrap(
      await trashProject({
        id: restored.id,
        expectedUpdatedAt: restored.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(
      await deleteProjectPermanently({
        id: retrash.id,
        expectedUpdatedAt: retrash.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: true });
    expect(
      await db.query.projects.findFirst({
        where: (table, { eq }) => eq(table.id, retrash.id),
      }),
    ).toBeUndefined();
  }, 90_000);

  test("enforces slug rules, orders projects, and rolls back failed publish", async () => {
    const actor = adminActor();

    expect(
      await createProject({ slug: "admin", draft: projectContent(), actor }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });

    const first = unwrap(
      await createProject({
        slug: "first",
        draft: projectContent("First"),
        actor,
      }),
    );

    expect(
      await createProject({ slug: "first", draft: projectContent(), actor }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    const second = unwrap(
      await createProject({
        slug: "second",
        draft: projectContent("Second"),
        actor,
      }),
    );

    unwrap(
      await reorderProjects({
        orderedIds: [second.id, first.id],
        featuredIds: [first.id],
        actor,
      }),
    );
    expect(
      (
        await db
          .select({ id: projects.id })
          .from(projects)
          .where(isNull(projects.deletedAt))
          .orderBy(asc(projects.displayOrder))
      ).map((row) => row.id),
    ).toEqual([second.id, first.id]);
    expect(
      await db.query.projects.findFirst({
        columns: { featured: true, featuredOrder: true },
        where: (table, { eq }) => eq(table.id, first.id),
      }),
    ).toMatchObject({ featured: true, featuredOrder: 0 });

    const missingAssetId = "k00000000000000000000009";
    const brokenDraft = projectContent("Broken publish");

    brokenDraft.coverAssetId = missingAssetId;
    await db
      .update(projects)
      .set({ draftContent: brokenDraft, updatedAt: new Date() })
      .where(eq(projects.id, first.id));
    const before = await db.query.projects.findFirst({
      where: (table, { eq }) => eq(table.id, first.id),
    });

    if (!before) throw new Error("Expected project fixture");

    expect(
      await publishProject({
        id: first.id,
        expectedUpdatedAt: before.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    const after = await db.query.projects.findFirst({
      where: (table, { eq }) => eq(table.id, first.id),
    });

    expect(after?.publishedContent).toBeNull();
    expect(
      await db
        .select()
        .from(contentEvents)
        .where(
          and(
            eq(contentEvents.contentId, first.id),
            eq(contentEvents.eventType, "publish"),
          ),
        ),
    ).toHaveLength(0);
  }, 90_000);
});
