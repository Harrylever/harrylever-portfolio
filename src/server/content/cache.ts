import type { ActionResult } from "@/domain/content/action-result";

import { revalidateTag } from "next/cache";

export type ContentMutation = {
  type: "project" | "post";
  slug: string;
  event:
    | "draft"
    | "publish"
    | "unpublish"
    | "trash"
    | "restore"
    | "delete"
    | "reorder";
};

export type CacheInvalidator = (tag: string) => void;

export function cacheTagsFor(mutation: ContentMutation): string[] {
  if (mutation.event === "draft") return [];

  if (mutation.type === "project") {
    if (mutation.event === "reorder") return ["projects:list", "home"];

    return ["projects:list", `project:${mutation.slug}`, "home", "sitemap"];
  }

  return ["blog:list", `blog:${mutation.slug}`, "sitemap"];
}

function nextCacheInvalidator(tag: string) {
  if (process.env.NODE_ENV !== "test") revalidateTag(tag);
}

export function invalidateContentCache<T>(
  result: ActionResult<T>,
  mutation: ContentMutation,
  invalidate: CacheInvalidator = nextCacheInvalidator,
): void {
  if (!result.ok) return;

  for (const tag of cacheTagsFor(mutation)) invalidate(tag);
}
