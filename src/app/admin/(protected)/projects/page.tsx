import type { Metadata } from "next";

import Link from "next/link";

import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { ContentFilters, ContentTable } from "@/components/admin/content-table";
import { parseListFilters } from "@/lib/admin/content-forms";
import { listProjectsForAdmin } from "@/server/content/projects/admin";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const filters = parseListFilters(await searchParams);
  const [rows, trash] = await Promise.all([
    listProjectsForAdmin({ view: "active", ...filters }),
    listProjectsForAdmin({ view: "trash" }),
  ]);
  const filtered = Boolean(filters.q) || filters.status !== "all";

  return (
    <>
      <div className="adm-pagehead">
        <h1 className="adm-title">Projects</h1>
        <Link
          className="adm-btn"
          data-variant="solid"
          href="/admin/projects/new"
        >
          New project
        </Link>
      </div>
      <p className="adm-lede">
        Drafts stay private until you publish them. The order here is the order
        on the public projects page.
      </p>
      <nav aria-label="Project views" className="adm-tabs">
        <Link aria-current="page" href="/admin/projects">
          All projects
        </Link>
        <Link href="/admin/projects/trash">Trash ({trash.length})</Link>
      </nav>
      <ContentFilters filters={filters} kind="project" view="active" />
      <ContentTable
        canReorder={!filtered}
        emptyMessage={
          filtered
            ? "No projects match. Try another search or state."
            : "No projects yet. Create one to start a draft."
        }
        kind="project"
        rows={rows}
        view="active"
      />
    </>
  );
}
