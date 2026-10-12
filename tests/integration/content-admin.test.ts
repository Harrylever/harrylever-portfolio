import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import {
  adminActor,
  postContent,
  projectContent,
  removeContentFixtures,
  resetContentFixtures,
} from "../helpers/content";
import { assertSafeTestDatabase } from "../helpers/safe-database";

import { AdminAuthorizationError } from "@/server/auth/require-admin";
import {
  listPostsForAdmin,
  readPostForEditing,
  runCreatePost,
  runPostTransition,
  runSavePost,
} from "@/server/content/posts/admin";
import {
  listProjectsForAdmin,
  readProjectForEditing,
  runCreateProject,
  runDeleteProject,
  runDuplicateProject,
  runProjectTransition,
  runReorderProjects,
  runSaveProject,
} from "@/server/content/projects/admin";

assertSafeTestDatabase();

const authorize = async () => adminActor();
const deny = async () => {
  throw new AdminAuthorizationError(401);
};
const broken = async () => {
  throw new Error("ADMIN_SESSION_SECRET is required");
};

function unwrap<T>(result: { ok: true; data: T } | { ok: false }): T {
  if (!result.ok) {
    throw new Error(`Expected success, got ${JSON.stringify(result)}`);
  }

  return result.data;
}

describe.serial("project admin", () => {
  beforeEach(resetContentFixtures, 30_000);
  afterAll(removeContentFixtures, 30_000);

  test("creates, saves, publishes and reports unpublished changes", async () => {
    const created = unwrap(
      await runCreateProject(
        { slug: "Admin Atlas", draft: projectContent("Atlas") },
        { authorize },
      ),
    );

    expect(created.slug).toBe("admin-atlas");
    expect(created.status).toBe("draft");
    expect(created.slugLocked).toBe(false);
    expect(created.hasUnpublishedChanges).toBe(true);

    const published = unwrap(
      await runProjectTransition(
        "publish",
        { id: created.id, expectedUpdatedAt: created.updatedAt },
        { authorize },
      ),
    );

    expect(published.status).toBe("published");
    expect(published.slugLocked).toBe(true);
    expect(published.hasUnpublishedChanges).toBe(false);

    const saved = unwrap(
      await runSaveProject(
        {
          id: created.id,
          slug: "admin-atlas",
          draft: projectContent("Atlas v2"),
          expectedUpdatedAt: published.updatedAt,
        },
        { authorize },
      ),
    );

    expect(saved.hasUnpublishedChanges).toBe(true);

    const slugChange = await runSaveProject(
      {
        id: created.id,
        slug: "renamed",
        draft: projectContent("Atlas v2"),
        expectedUpdatedAt: saved.updatedAt,
      },
      { authorize },
    );

    expect(slugChange.ok).toBe(false);
    if (!slugChange.ok) {
      expect(slugChange.error.code).toBe("VALIDATION_ERROR");
      expect(slugChange.error.fieldErrors?.slug).toBeDefined();
    }

    const stale = await runSaveProject(
      {
        id: created.id,
        slug: "admin-atlas",
        draft: projectContent("stale"),
        expectedUpdatedAt: published.updatedAt,
      },
      { authorize },
    );

    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe("CONFLICT");
    expect((await readProjectForEditing(created.id))?.draft.name).toBe(
      "Atlas v2",
    );
  }, 120_000);

  test("returns per-field validation errors and auth failures", async () => {
    const invalid = await runCreateProject(
      {
        slug: "x",
        draft: { ...projectContent("Bad"), name: "", stack: [] },
      },
      { authorize },
    );

    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe("VALIDATION_ERROR");
      expect(invalid.error.fieldErrors?.name).toBeDefined();
      expect(invalid.error.fieldErrors?.stack).toBeDefined();
    }

    const badSlug = await runCreateProject(
      { slug: "admin", draft: projectContent("Reserved") },
      { authorize },
    );

    expect(badSlug.ok).toBe(false);
    if (!badSlug.ok) expect(badSlug.error.fieldErrors?.slug).toBeDefined();

    const unauthorized = await runCreateProject(
      { slug: "nope", draft: projectContent() },
      { authorize: deny },
    );

    expect(unauthorized.ok).toBe(false);
    if (!unauthorized.ok) expect(unauthorized.error.code).toBe("UNAUTHORIZED");

    const misconfigured = await runCreateProject(
      { slug: "nope", draft: projectContent() },
      { authorize: broken },
    );

    expect(misconfigured.ok).toBe(false);
    if (!misconfigured.ok) {
      expect(misconfigured.error.code).toBe("INFRASTRUCTURE_ERROR");
    }
  }, 120_000);

  test("lists with search, status filters and a separate trash view", async () => {
    const draft = unwrap(
      await runCreateProject(
        { slug: "draft-one", draft: projectContent("Drafty") },
        { authorize },
      ),
    );
    const live = unwrap(
      await runCreateProject(
        { slug: "live-one", draft: projectContent("Livewire") },
        { authorize },
      ),
    );

    unwrap(
      await runProjectTransition(
        "publish",
        { id: live.id, expectedUpdatedAt: live.updatedAt },
        { authorize },
      ),
    );
    unwrap(
      await runProjectTransition(
        "trash",
        { id: draft.id, expectedUpdatedAt: draft.updatedAt },
        { authorize },
      ),
    );

    const active = await listProjectsForAdmin({ view: "active" });

    expect(active.map((row) => row.slug)).toEqual(["live-one"]);
    expect(active[0].title).toBe("Livewire");
    expect(active[0].status).toBe("published");

    const trash = await listProjectsForAdmin({ view: "trash" });

    expect(trash.map((row) => row.slug)).toEqual(["draft-one"]);
    expect(trash[0].deletedAt).not.toBeNull();
    expect(
      await listProjectsForAdmin({ view: "active", q: "wire" }),
    ).toHaveLength(1);
    expect(
      await listProjectsForAdmin({ view: "active", q: "nothing" }),
    ).toHaveLength(0);
    expect(
      await listProjectsForAdmin({ view: "active", status: "draft" }),
    ).toHaveLength(0);
    expect(
      await listProjectsForAdmin({ view: "active", status: "published" }),
    ).toHaveLength(1);
  }, 120_000);

  test("restore collisions, permanent delete, duplicate and reorder", async () => {
    const first = unwrap(
      await runCreateProject(
        { slug: "shared", draft: projectContent("First") },
        { authorize },
      ),
    );
    const trashed = unwrap(
      await runProjectTransition(
        "trash",
        { id: first.id, expectedUpdatedAt: first.updatedAt },
        { authorize },
      ),
    );

    unwrap(
      await runCreateProject(
        { slug: "shared", draft: projectContent("Second") },
        { authorize },
      ),
    );
    const collision = await runProjectTransition(
      "restore",
      { id: first.id, expectedUpdatedAt: trashed.updatedAt },
      { authorize },
    );

    expect(collision.ok).toBe(false);
    if (!collision.ok) {
      expect(collision.error.code).toBe("CONFLICT");
      expect(collision.error.fieldErrors?.slug).toBeDefined();
    }

    const removed = await runDeleteProject(
      { id: first.id, expectedUpdatedAt: trashed.updatedAt },
      { authorize },
    );

    expect(removed.ok).toBe(true);
    expect(await readProjectForEditing(first.id)).toBeNull();

    const [second] = await listProjectsForAdmin({ view: "active" });
    const copy = unwrap(
      await runDuplicateProject({ id: second.id }, { authorize }),
    );

    expect(copy.slug).toBe("shared-copy");
    expect(copy.status).toBe("draft");

    const again = unwrap(
      await runDuplicateProject({ id: second.id }, { authorize }),
    );

    expect(again.slug).toBe("shared-copy-2");

    const order = (await listProjectsForAdmin({ view: "active" })).map(
      (row) => row.id,
    );
    const reversed = [...order].reverse();

    unwrap(await runReorderProjects({ orderedIds: reversed }, { authorize }));
    expect(
      (await listProjectsForAdmin({ view: "active" })).map((row) => row.id),
    ).toEqual(reversed);

    const stale = await runReorderProjects(
      { orderedIds: reversed.slice(1) },
      { authorize },
    );

    expect(stale.ok).toBe(false);
  }, 120_000);
});

describe.serial("post admin", () => {
  beforeEach(resetContentFixtures, 30_000);
  afterAll(removeContentFixtures, 30_000);

  test("runs the post lifecycle with conflicts and trash filters", async () => {
    const created = unwrap(
      await runCreatePost(
        { slug: "hello-post", draft: postContent("Hello") },
        { authorize },
      ),
    );

    expect(created.status).toBe("draft");
    const published = unwrap(
      await runPostTransition(
        "publish",
        { id: created.id, expectedUpdatedAt: created.updatedAt },
        { authorize },
      ),
    );

    expect(published.slugLocked).toBe(true);
    const saved = unwrap(
      await runSavePost(
        {
          id: created.id,
          slug: "hello-post",
          draft: postContent("Hello again"),
          expectedUpdatedAt: published.updatedAt,
        },
        { authorize },
      ),
    );

    expect(saved.hasUnpublishedChanges).toBe(true);
    const stale = await runSavePost(
      {
        id: created.id,
        slug: "hello-post",
        draft: postContent("stale"),
        expectedUpdatedAt: published.updatedAt,
      },
      { authorize },
    );

    expect(!stale.ok && stale.error.code).toBe("CONFLICT");
    const unpublished = unwrap(
      await runPostTransition(
        "unpublish",
        { id: created.id, expectedUpdatedAt: saved.updatedAt },
        { authorize },
      ),
    );

    expect(unpublished.status).toBe("unpublished");
    expect(
      await listPostsForAdmin({ view: "active", status: "unpublished" }),
    ).toHaveLength(1);
    const trashed = unwrap(
      await runPostTransition(
        "trash",
        { id: created.id, expectedUpdatedAt: unpublished.updatedAt },
        { authorize },
      ),
    );

    expect(await listPostsForAdmin({ view: "active" })).toHaveLength(0);
    expect(await listPostsForAdmin({ view: "trash" })).toHaveLength(1);
    const restored = unwrap(
      await runPostTransition(
        "restore",
        { id: created.id, expectedUpdatedAt: trashed.updatedAt },
        { authorize },
      ),
    );

    expect(restored.deletedAt).toBeNull();
    expect((await readPostForEditing(created.id))?.draft.title).toBe(
      "Hello again",
    );

    const invalid = await runCreatePost(
      { slug: "x", draft: { ...postContent(), title: "" } },
      { authorize },
    );

    expect(!invalid.ok && invalid.error.fieldErrors?.title).toBeTruthy();
    const unauthorized = await runSavePost(
      {
        id: created.id,
        slug: "hello-post",
        draft: postContent(),
        expectedUpdatedAt: restored.updatedAt,
      },
      { authorize: deny },
    );

    expect(!unauthorized.ok && unauthorized.error.code).toBe("UNAUTHORIZED");
  }, 120_000);
});
