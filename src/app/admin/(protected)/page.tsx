import type { Metadata } from "next";
import type {
  DashboardEvent,
  LifecycleCounts,
} from "@/server/content/admin-dashboard";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { getAdminDashboard } from "@/server/content/admin-dashboard";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

const verbs: Record<DashboardEvent["eventType"], string> = {
  create: "Created",
  update: "Saved draft of",
  publish: "Published",
  unpublish: "Unpublished",
  trash: "Moved to trash:",
  restore: "Restored",
  permanent_delete: "Permanently deleted",
};

const nouns: Record<DashboardEvent["contentType"], string> = {
  project: "project",
  post: "post",
  home_section: "homepage section",
  site_profile: "site profile",
};

function describe(event: DashboardEvent) {
  if (event.contentType === "site_profile") {
    return `${verbs[event.eventType]} the site profile`;
  }
  const name = event.label
    ? `“${event.label}”`
    : "an item that no longer exists";

  return `${verbs[event.eventType]} ${nouns[event.contentType]} ${name}`;
}

function Cell({
  value,
  attention = false,
}: {
  value: number;
  attention?: boolean;
}) {
  const tone = value === 0 ? "is-zero" : attention ? "is-attention" : undefined;

  return <td className={tone}>{value}</td>;
}

function LedgerRow({
  label,
  href,
  counts,
}: {
  label: string;
  href: string;
  counts: LifecycleCounts;
}) {
  return (
    <tr>
      <th scope="row">
        <Link href={href}>{label}</Link>
      </th>
      <Cell value={counts.published} />
      <Cell attention value={counts.draft} />
      <Cell value={counts.unpublished} />
      <Cell value={counts.trashed} />
    </tr>
  );
}

export default async function AdminOverviewPage() {
  const dashboard = await getAdminDashboard(await requireAdminPage());
  const { projects, posts, media, recentEvents } = dashboard;
  const drafts = projects.draft + posts.draft;
  const trashed = projects.trashed + posts.trashed;

  return (
    <>
      <h1 className="adm-title">Overview</h1>
      <p className="adm-summary">
        <strong>{plural(projects.published, "project", "projects")}</strong> and{" "}
        <strong>{plural(posts.published, "post", "posts")}</strong> are live.{" "}
        {drafts > 0
          ? `${plural(drafts, "draft is", "drafts are")} waiting.`
          : "No drafts waiting."}
      </p>

      <section aria-labelledby="content-heading" className="adm-section">
        <h2 className="adm-h2" id="content-heading">
          Content
        </h2>
        <div className="adm-scroll">
          <table className="adm-ledger">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Published</th>
                <th scope="col">Draft</th>
                <th scope="col">Unpublished</th>
                <th scope="col">In trash</th>
              </tr>
            </thead>
            <tbody>
              <LedgerRow
                counts={projects}
                href="/admin/projects"
                label="Projects"
              />
              <LedgerRow counts={posts} href="/admin/blog" label="Blog posts" />
            </tbody>
          </table>
        </div>
        <p className="adm-lede">
          <Link className="adm-btn" data-variant="quiet" href="/admin/media">
            {plural(media.total, "image", "images")} in the media library
          </Link>
          {trashed > 0
            ? `. ${plural(trashed, "item", "items")} in the trash can be restored or deleted for good.`
            : null}
        </p>
      </section>

      <section aria-labelledby="activity-heading" className="adm-section">
        <h2 className="adm-h2" id="activity-heading">
          Recent activity
        </h2>
        {recentEvents.length ? (
          <ol className="adm-activity">
            {recentEvents.map((event) => (
              <li key={event.id}>
                <span>{describe(event)}</span>
                <time
                  dateTime={event.createdAt.toISOString()}
                  title={event.createdAt.toISOString()}
                >
                  {formatDistanceToNow(event.createdAt, { addSuffix: true })} by{" "}
                  {event.actorId}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="adm-empty">
            Nothing has changed yet. Edits, publishes and deletions will be
            listed here.
          </p>
        )}
      </section>
    </>
  );
}
