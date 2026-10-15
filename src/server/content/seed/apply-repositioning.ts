import type { ActionResult } from "@/domain/content/action-result";
import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";
import type { AdminSession } from "@/server/auth/require-admin";

import { isDeepStrictEqual } from "node:util";

import { and, eq, isNull } from "drizzle-orm";

import {
  repositioningHomeSections,
  repositioningPost,
  repositioningProjects,
  repositioningSiteProfile,
} from "./repositioning-content";

import { homeSectionTypes } from "@/domain/content/home";
import { buildAdminSession } from "@/server/auth/session";
import { saveHomeSectionDraft } from "@/server/content/home/service";
import { createPost, savePostDraft } from "@/server/content/posts/service";
import {
  createProject,
  saveProjectDraft,
} from "@/server/content/projects/service";
import { saveSiteProfileDraft } from "@/server/content/site-profile/service";
import { db } from "@/server/db/client";
import { assertLocalDatabaseTarget } from "@/server/db/local-target";
import {
  homeSections,
  posts,
  projects,
  siteProfile,
} from "@/server/db/schema/content";

export type RepositioningItem = {
  type: "site_profile" | "home_section" | "project" | "post";
  key: string;
  action: "create" | "update" | "unchanged" | "skipped";
};

export type RepositioningReport = {
  applied: boolean;
  items: RepositioningItem[];
};

/** jsonb drops `undefined` keys, so compare the JSON forms. */
const sameJson = (left: unknown, right: unknown) =>
  isDeepStrictEqual(
    JSON.parse(JSON.stringify(left ?? null)),
    JSON.parse(JSON.stringify(right ?? null)),
  );

function unwrap<T>(result: ActionResult<T>, operation: string): T {
  if (!result.ok) throw new Error(`${operation}: ${result.error.message}`);

  return result.data;
}

/**
 * Loads the repositioning copy as DRAFTS only. Without `apply` it reports
 * what would change and writes nothing. It never publishes, unpublishes,
 * trashes or reorders: featured and display order are live columns, so they
 * are only set when a project is created (a draft is not public).
 */
export async function applyRepositioning(options: {
  apply: boolean;
  /**
   * Existing drafts that may be replaced: "all", or any of "profile", "home",
   * "post" and "project:<slug>". Anything else that differs is skipped, so a
   * re-run never overwrites edits made in /admin. Missing items are always
   * created on `apply`.
   */
  overwrite?: "all" | readonly string[];
  databaseUrl: string | undefined;
  envLabel: string | undefined;
}): Promise<RepositioningReport> {
  assertLocalDatabaseTarget(options.databaseUrl, options.envLabel);

  const actor: AdminSession = buildAdminSession(
    "content-repositioning",
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const [profile] = await db.select().from(siteProfile).limit(1);
  const sectionRows = await db.select().from(homeSections);
  const missing = homeSectionTypes.filter(
    (type) => !sectionRows.some((row) => row.type === type),
  );

  if (!profile || missing.length) {
    throw new Error("Run bun run db:seed first");
  }

  const mayOverwrite = (key: string) =>
    options.overwrite === "all" || (options.overwrite ?? []).includes(key);
  const items: RepositioningItem[] = [];
  const record = (
    type: RepositioningItem["type"],
    key: string,
    action: RepositioningItem["action"],
  ) => items.push({ type, key, action });

  const profileTarget = repositioningSiteProfile(profile.draftContent);

  if (sameJson(profile.draftContent, profileTarget)) {
    record("site_profile", "site", "unchanged");
  } else if (!mayOverwrite("profile")) {
    record("site_profile", "site", "skipped");
  } else {
    record("site_profile", "site", "update");
    if (options.apply) {
      unwrap(
        await saveSiteProfileDraft({
          draft: profileTarget,
          expectedUpdatedAt: profile.updatedAt.toISOString(),
          actor,
        }),
        "Update site profile",
      );
    }
  }

  const base = new Map<HomeSectionType, HomeSectionContent>(
    sectionRows.map((row) => [row.type, row.draftContent]),
  );

  for (const target of repositioningHomeSections(base)) {
    const row = sectionRows.find(({ type }) => type === target.type)!;

    if (sameJson(row.draftContent, target)) {
      record("home_section", target.type, "unchanged");
      continue;
    }
    if (!mayOverwrite("home")) {
      record("home_section", target.type, "skipped");
      continue;
    }
    record("home_section", target.type, "update");
    if (options.apply) {
      unwrap(
        await saveHomeSectionDraft({
          type: target.type,
          draft: target,
          visible: row.draftVisible,
          position: row.draftPosition,
          expectedUpdatedAt: row.updatedAt.toISOString(),
          actor,
        }),
        `Update ${target.type} section`,
      );
    }
  }

  for (const item of repositioningProjects) {
    const [existing] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.slug, item.slug), isNull(projects.deletedAt)))
      .limit(1);

    if (!existing) {
      record("project", item.slug, "create");
      if (options.apply) {
        unwrap(
          await createProject({
            slug: item.slug,
            draft: item.content,
            actor,
            displayOrder: item.displayOrder,
            featured: item.featured,
            featuredOrder: item.featuredOrder,
          }),
          `Create project ${item.slug}`,
        );
      }
      continue;
    }

    // Images the owner uploaded or placed stay as they are.
    const current = existing.draftContent;
    const target = {
      ...item.content,
      coverAssetId: current.coverAssetId ?? null,
      galleryAssetIds: current.galleryAssetIds,
      ...(current.coverPlaceholder
        ? { coverPlaceholder: current.coverPlaceholder }
        : {}),
      ...(current.homepagePlaceholder
        ? { homepagePlaceholder: current.homepagePlaceholder }
        : {}),
      ...(current.galleryPlaceholders
        ? { galleryPlaceholders: current.galleryPlaceholders }
        : {}),
    };

    if (sameJson(current, target)) {
      record("project", item.slug, "unchanged");
      continue;
    }
    if (!mayOverwrite(`project:${item.slug}`)) {
      record("project", item.slug, "skipped");
      continue;
    }
    record("project", item.slug, "update");
    if (options.apply) {
      unwrap(
        await saveProjectDraft({
          id: existing.id,
          slug: item.slug,
          draft: target,
          expectedUpdatedAt: existing.updatedAt.toISOString(),
          actor,
        }),
        `Update project ${item.slug}`,
      );
    }
  }

  const post = repositioningPost();
  const [existingPost] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, post.slug), isNull(posts.deletedAt)))
    .limit(1);

  if (!existingPost) {
    record("post", post.slug, "create");
    if (options.apply) {
      unwrap(
        await createPost({ slug: post.slug, draft: post.content, actor }),
        "Create housing post",
      );
    }
  } else if (sameJson(existingPost.draftContent, post.content)) {
    record("post", post.slug, "unchanged");
  } else if (!mayOverwrite("post")) {
    record("post", post.slug, "skipped");
  } else {
    record("post", post.slug, "update");
    if (options.apply) {
      unwrap(
        await savePostDraft({
          id: existingPost.id,
          slug: post.slug,
          draft: post.content,
          expectedUpdatedAt: existingPost.updatedAt.toISOString(),
          actor,
        }),
        "Update housing post",
      );
    }
  }

  return { applied: options.apply, items };
}
