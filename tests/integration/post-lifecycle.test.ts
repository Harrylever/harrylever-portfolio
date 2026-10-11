import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { and, desc, eq } from "drizzle-orm";

import {
  adminActor,
  postContent,
  removeContentFixtures,
  resetContentFixtures,
} from "../helpers/content";

import { db } from "@/server/db/client";
import { contentEvents, posts } from "@/server/db/schema/content";
import {
  createPost,
  deletePostPermanently,
  duplicatePost,
  publishPost,
  restorePost,
  savePostDraft,
  trashPost,
  unpublishPost,
} from "@/server/content/posts/service";

function unwrap<T>(result: { ok: true; data: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Expected lifecycle operation to succeed");

  return result.data;
}

describe.serial("post lifecycle", () => {
  beforeEach(resetContentFixtures, 30_000);
  afterAll(removeContentFixtures, 30_000);

  test("isolates drafts and enforces optimistic saves and stable slugs", async () => {
    const actor = adminActor();
    const created = unwrap(
      await createPost({ slug: "post-one", draft: postContent(), actor }),
    );
    const firstPublish = unwrap(
      await publishPost({
        id: created.id,
        expectedUpdatedAt: created.updatedAt.toISOString(),
        actor,
      }),
    );
    const changedDraft = postContent("Changed post draft");
    const saved = unwrap(
      await savePostDraft({
        id: created.id,
        slug: "post-one",
        draft: changedDraft,
        expectedUpdatedAt: firstPublish.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(saved.publishedContent).toEqual(postContent());
    expect(
      await savePostDraft({
        id: created.id,
        slug: "post-one",
        draft: postContent("Stale post"),
        expectedUpdatedAt: firstPublish.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(
      await savePostDraft({
        id: created.id,
        slug: "renamed-post",
        draft: changedDraft,
        expectedUpdatedAt: saved.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });

    const unpublished = unwrap(
      await unpublishPost({
        id: created.id,
        expectedUpdatedAt: saved.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(unpublished.status).toBe("unpublished");
    const republished = unwrap(
      await publishPost({
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

  test("handles slug collisions, duplicate, trash, restore, and deletion", async () => {
    const actor = adminActor();

    expect(
      await createPost({ slug: "api", draft: postContent(), actor }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });

    const original = unwrap(
      await createPost({ slug: "original-post", draft: postContent(), actor }),
    );

    expect(
      await createPost({ slug: "original-post", draft: postContent(), actor }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    const duplicate = unwrap(
      await duplicatePost({ id: original.id, slug: "copied-post", actor }),
    );

    expect(duplicate).toMatchObject({ slug: "copied-post", status: "draft" });
    expect(duplicate.publishedContent).toBeNull();

    const trashed = unwrap(
      await trashPost({
        id: original.id,
        expectedUpdatedAt: original.updatedAt.toISOString(),
        actor,
      }),
    );
    const replacement = unwrap(
      await createPost({ slug: "original-post", draft: postContent(), actor }),
    );

    expect(
      await restorePost({
        id: original.id,
        expectedUpdatedAt: trashed.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "CONFLICT" } });

    await trashPost({
      id: replacement.id,
      expectedUpdatedAt: replacement.updatedAt.toISOString(),
      actor,
    });
    const restored = unwrap(
      await restorePost({
        id: original.id,
        expectedUpdatedAt: trashed.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(restored.deletedAt).toBeNull();
    const retrash = unwrap(
      await trashPost({
        id: restored.id,
        expectedUpdatedAt: restored.updatedAt.toISOString(),
        actor,
      }),
    );

    expect(
      await deletePostPermanently({
        id: retrash.id,
        expectedUpdatedAt: retrash.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: true });
    expect(
      await db.query.posts.findFirst({
        where: (table, { eq }) => eq(table.id, retrash.id),
      }),
    ).toBeUndefined();
  }, 90_000);

  test("orders published posts and rolls back a failed publish", async () => {
    const actor = adminActor();
    const first = unwrap(
      await createPost({
        slug: "first-post",
        draft: postContent("First"),
        actor,
      }),
    );
    const publishedFirst = unwrap(
      await publishPost({
        id: first.id,
        expectedUpdatedAt: first.updatedAt.toISOString(),
        actor,
      }),
    );
    const second = unwrap(
      await createPost({
        slug: "second-post",
        draft: postContent("Second"),
        actor,
      }),
    );
    const publishedSecond = unwrap(
      await publishPost({
        id: second.id,
        expectedUpdatedAt: second.updatedAt.toISOString(),
        actor,
      }),
    );
    const ordered = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.publishedAt));

    expect(ordered.map((row) => row.id)).toEqual([
      publishedSecond.id,
      publishedFirst.id,
    ]);

    const broken = unwrap(
      await createPost({
        slug: "broken-post",
        draft: postContent("Broken"),
        actor,
      }),
    );
    const brokenDraft = postContent("Broken");

    brokenDraft.coverAssetId = "k00000000000000000000008";
    await db
      .update(posts)
      .set({ draftContent: brokenDraft, updatedAt: new Date() })
      .where(eq(posts.id, broken.id));
    const before = await db.query.posts.findFirst({
      where: (table, { eq }) => eq(table.id, broken.id),
    });

    if (!before) throw new Error("Expected post fixture");

    expect(
      await publishPost({
        id: broken.id,
        expectedUpdatedAt: before.updatedAt.toISOString(),
        actor,
      }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(
      await db
        .select()
        .from(contentEvents)
        .where(
          and(
            eq(contentEvents.contentId, broken.id),
            eq(contentEvents.eventType, "publish"),
          ),
        ),
    ).toHaveLength(0);
  }, 90_000);
});
