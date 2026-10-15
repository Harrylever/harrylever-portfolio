import type { AdminSession } from "@/server/auth/require-admin";

import { count, desc, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/server/db/client";
import {
  contentEvents,
  mediaAssets,
  posts,
  projects,
} from "@/server/db/schema/content";

export type LifecycleCounts = {
  draft: number;
  published: number;
  unpublished: number;
  trashed: number;
  /** Everything not in the trash. */
  active: number;
};

export type DashboardEvent = {
  id: string;
  actorId: string;
  contentType: (typeof contentEvents.$inferSelect)["contentType"];
  contentId: string;
  eventType: (typeof contentEvents.$inferSelect)["eventType"];
  /** Current draft name/title, or null when the item no longer exists. */
  label: string | null;
  createdAt: Date;
};

export type AdminDashboard = {
  projects: LifecycleCounts;
  posts: LifecycleCounts;
  media: { total: number };
  recentEvents: DashboardEvent[];
};

const RECENT_EVENT_LIMIT = 8;

type CountRow = { status: string; trashed: boolean; total: number };

function toCounts(rows: CountRow[]): LifecycleCounts {
  const counts: LifecycleCounts = {
    draft: 0,
    published: 0,
    unpublished: 0,
    trashed: 0,
    active: 0,
  };

  for (const row of rows) {
    if (row.trashed) {
      counts.trashed += row.total;
      continue;
    }
    if (row.status in counts) {
      counts[row.status as "draft" | "published" | "unpublished"] += row.total;
    }
    counts.active += row.total;
  }

  return counts;
}

async function lifecycleCounts(table: typeof projects | typeof posts) {
  const trashed = isNotNull(table.deletedAt);
  const rows = await db
    .select({
      status: table.status,
      trashed: sql<boolean>`${trashed}`.mapWith(Boolean),
      total: count(),
    })
    .from(table)
    .groupBy(table.status, trashed);

  return toCounts(rows);
}

async function recentEvents(): Promise<DashboardEvent[]> {
  const events = await db
    .select()
    .from(contentEvents)
    .orderBy(desc(contentEvents.createdAt), desc(contentEvents.id))
    .limit(RECENT_EVENT_LIMIT);

  const idsOf = (type: DashboardEvent["contentType"]) =>
    events
      .filter((e) => e.contentType === type)
      .map((e) => e.contentId)
      .filter((id, index, ids) => ids.indexOf(id) === index);
  const projectIds = idsOf("project");
  const postIds = idsOf("post");

  const [projectRows, postRows] = await Promise.all([
    projectIds.length
      ? db
          .select({ id: projects.id, content: projects.draftContent })
          .from(projects)
          .where(inArray(projects.id, projectIds))
      : [],
    postIds.length
      ? db
          .select({ id: posts.id, content: posts.draftContent })
          .from(posts)
          .where(inArray(posts.id, postIds))
      : [],
  ]);

  const labels = new Map<string, string>([
    ...projectRows.map(
      (row) => [`project:${row.id}`, row.content.name] as const,
    ),
    ...postRows.map((row) => [`post:${row.id}`, row.content.title] as const),
  ]);

  return events.map((event) => ({
    id: event.id,
    actorId: event.actorId,
    contentType: event.contentType,
    contentId: event.contentId,
    eventType: event.eventType,
    label:
      event.contentType === "site_profile"
        ? "Site profile"
        : (labels.get(`${event.contentType}:${event.contentId}`) ?? null),
    createdAt: event.createdAt,
  }));
}

/**
 * Overview metrics for the admin home. Takes the caller's verified session so
 * it can only be reached after `requireAdmin()` has succeeded.
 */
export async function getAdminDashboard(
  _actor: AdminSession,
): Promise<AdminDashboard> {
  const [projectCounts, postCounts, [media], events] = await Promise.all([
    lifecycleCounts(projects),
    lifecycleCounts(posts),
    db.select({ total: count() }).from(mediaAssets),
    recentEvents(),
  ]);

  return {
    projects: projectCounts,
    posts: postCounts,
    media: { total: media?.total ?? 0 },
    recentEvents: events,
  };
}
