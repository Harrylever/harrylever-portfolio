import type { PostContent } from "@/domain/content/post";
import type { ProjectContent } from "@/domain/content/project";
import type { SiteProfileContent } from "@/domain/content/site-profile";
import type { AdminSession } from "@/server/auth/require-admin";
import type {
  PostRow,
  ProjectRow,
  PublicHomepage,
  PublicPost,
  PublicProject,
  PublicSiteProfile,
} from "@/server/content/public";

import { and, asc, eq, isNull } from "drizzle-orm";
import { draftMode } from "next/headers";

import { postContentSchema } from "@/domain/content/post";
import { projectContentSchema } from "@/domain/content/project";
import { siteProfileContentSchema } from "@/domain/content/site-profile";
import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/server/auth/require-admin";
import {
  assembleHomepage,
  postRowsToPublic,
  projectRowsToPublic,
} from "@/server/content/public";
import { db } from "@/server/db/client";
import {
  homeSections,
  posts,
  projects,
  siteProfile,
} from "@/server/db/schema/content";

export type ContentReadMode = "published" | "draft";

export const previewRobots = { index: false, follow: false } as const;
export const previewResponseHeaders = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

const draftCookieName = "__prerender_bypass";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PreviewTarget =
  | { type: "home" }
  | { type: "project"; slug: string }
  | { type: "post"; slug: string };

function hasDraftCookie(requestHeaders: Headers): boolean {
  return (requestHeaders.get("cookie") ?? "")
    .split(";")
    .some((part) => part.trim().startsWith(`${draftCookieName}=`));
}

async function ambientDraftModeEnabled(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    // Outside a request scope (build, tests) there is no draft cookie.
    return false;
  }
}

/**
 * Draft mode alone is never trusted: a draft cookie is only honoured when it is
 * accompanied by a live administrator session, otherwise this throws 401/403.
 */
export async function resolveContentReadMode(
  requestHeaders?: Headers,
): Promise<ContentReadMode> {
  const enabled = requestHeaders
    ? hasDraftCookie(requestHeaders)
    : await ambientDraftModeEnabled();

  if (!enabled) return "published";
  await requireAdmin(requestHeaders);

  return "draft";
}

function assertAdmin(admin: AdminSession): void {
  if (!admin?.user) throw new AdminAuthorizationError(401);
  if (admin.user.role !== "admin") throw new AdminAuthorizationError(403);
}

export function parsePreviewTarget(
  params: URLSearchParams,
): PreviewTarget | null {
  const type = params.get("type");

  if (type === "home") return { type };
  const slug = params.get("slug");

  if ((type === "project" || type === "post") && slug && slugPattern.test(slug))
    return { type, slug };

  return null;
}

export function canonicalPreviewPath(target: PreviewTarget): string {
  switch (target.type) {
    case "home":
      return "/";
    case "project":
      return `/projects/${target.slug}`;
    case "post":
      return `/blog/${target.slug}`;
  }
}

export async function getPreviewSiteProfile(
  admin: AdminSession,
): Promise<PublicSiteProfile | null> {
  assertAdmin(admin);
  const [row] = await db
    .select({
      content: siteProfile.draftContent,
      updatedAt: siteProfile.updatedAt,
    })
    .from(siteProfile)
    .limit(1);

  if (!row) return null;

  return {
    ...siteProfileContentSchema.parse(row.content as SiteProfileContent),
    publishedAt: row.updatedAt,
  };
}

const draftProjectColumns = {
  id: projects.id,
  slug: projects.slug,
  content: projects.draftContent,
  displayOrder: projects.displayOrder,
  featured: projects.featured,
  featuredOrder: projects.featuredOrder,
  publishedAt: projects.publishedAt,
  updatedAt: projects.updatedAt,
};

function toProjectRow(row: {
  id: string;
  slug: string;
  content: ProjectContent;
  displayOrder: number;
  featured: boolean;
  featuredOrder: number | null;
  publishedAt: Date | null;
  updatedAt: Date;
}): ProjectRow {
  return {
    id: row.id,
    slug: row.slug,
    content: projectContentSchema.parse(row.content),
    displayOrder: row.displayOrder,
    featured: row.featured,
    featuredOrder: row.featuredOrder,
    publishedAt: row.publishedAt ?? row.updatedAt,
  };
}

export async function getPreviewProject(
  slug: string,
  admin: AdminSession,
): Promise<PublicProject | null> {
  assertAdmin(admin);
  const [row] = await db
    .select(draftProjectColumns)
    .from(projects)
    .where(and(eq(projects.slug, slug), isNull(projects.deletedAt)))
    .limit(1);

  if (!row) return null;
  const [project] = await projectRowsToPublic([toProjectRow(row)]);

  return project;
}

export async function getPreviewPost(
  slug: string,
  admin: AdminSession,
): Promise<PublicPost | null> {
  assertAdmin(admin);
  const [row] = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      content: posts.draftContent,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(and(eq(posts.slug, slug), isNull(posts.deletedAt)))
    .limit(1);

  if (!row) return null;
  const postRow: PostRow = {
    id: row.id,
    slug: row.slug,
    content: postContentSchema.parse(row.content as PostContent),
    publishedAt: row.publishedAt ?? row.updatedAt,
  };
  const [post] = await postRowsToPublic([postRow]);

  return post;
}

export async function getPreviewHomepage(
  admin: AdminSession,
): Promise<PublicHomepage | null> {
  assertAdmin(admin);
  const [sectionRows, featuredRows] = await Promise.all([
    db.select().from(homeSections).orderBy(asc(homeSections.draftPosition)),
    db
      .select(draftProjectColumns)
      .from(projects)
      .where(
        and(
          eq(projects.status, "published"),
          eq(projects.featured, true),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(asc(projects.featuredOrder), asc(projects.displayOrder)),
  ]);

  return assembleHomepage(
    sectionRows.map((row) => ({
      type: row.type,
      content: row.draftContent,
      visible: row.draftVisible,
      position: row.draftPosition,
      publishedAt: row.updatedAt,
    })),
    featuredRows.map(toProjectRow),
  );
}

export type DraftModeController = {
  enable(): void | Promise<void>;
  disable(): void | Promise<void>;
};

async function nextDraftController(): Promise<DraftModeController> {
  return draftMode();
}

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: previewResponseHeaders });
}

function failure(error: unknown) {
  if (error instanceof AdminAuthorizationError)
    return json({ error: error.message }, error.status);

  return json({ error: "Preview is temporarily unavailable" }, 500);
}

export async function handlePreviewEnable(
  request: Request,
  controller?: DraftModeController,
): Promise<Response> {
  try {
    await requireAdmin(request.headers);
    const target = parsePreviewTarget(new URL(request.url).searchParams);

    if (!target) return json({ error: "Invalid preview target" }, 400);
    await (controller ?? (await nextDraftController())).enable();

    return new Response(null, {
      status: 307,
      headers: {
        ...previewResponseHeaders,
        Location: canonicalPreviewPath(target),
      },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function handlePreviewDisable(
  request: Request,
  controller?: DraftModeController,
): Promise<Response> {
  try {
    await requireAdmin(request.headers);
    await (controller ?? (await nextDraftController())).disable();

    return new Response(null, {
      status: 307,
      headers: { ...previewResponseHeaders, Location: "/" },
    });
  } catch (error) {
    return failure(error);
  }
}
