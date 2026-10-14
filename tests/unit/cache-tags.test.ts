import type { ActionResult } from "@/domain/content/action-result";

import { describe, expect, mock, test } from "bun:test";

import { cacheTagsFor, invalidateContentCache } from "@/server/content/cache";

describe("content cache tags", () => {
  test("selects narrow project tags for each mutation", () => {
    expect(
      cacheTagsFor({ type: "project", slug: "one", event: "draft" }),
    ).toEqual([]);
    for (const event of [
      "publish",
      "unpublish",
      "trash",
      "restore",
      "delete",
    ] as const) {
      expect(cacheTagsFor({ type: "project", slug: "one", event })).toEqual([
        "projects:list",
        "project:one",
        "home",
        "sitemap",
      ]);
    }
    expect(
      cacheTagsFor({ type: "project", slug: "one", event: "reorder" }),
    ).toEqual(["projects:list", "home"]);
  });

  test("selects narrow post tags for public lifecycle changes", () => {
    for (const event of [
      "publish",
      "unpublish",
      "trash",
      "restore",
      "delete",
    ] as const) {
      expect(cacheTagsFor({ type: "post", slug: "one", event })).toEqual([
        "blog:list",
        "blog:one",
        "sitemap",
      ]);
    }
    expect(cacheTagsFor({ type: "post", slug: "one", event: "draft" })).toEqual(
      [],
    );
  });

  test("does not invalidate cache for failed operations", () => {
    const invalidate = mock(() => undefined);
    const failure: ActionResult<unknown> = {
      ok: false,
      error: { code: "CONFLICT", message: "Stale content" },
    };

    invalidateContentCache(
      failure,
      { type: "post", slug: "one", event: "publish" },
      invalidate,
    );

    expect(invalidate).not.toHaveBeenCalled();
  });
});
