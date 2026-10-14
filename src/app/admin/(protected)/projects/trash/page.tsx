import type { Metadata } from "next";

import Link from "next/link";

import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { ContentFilters, ContentTable } from "@/components/admin/content-table";
import { parseListFilters } from "@/lib/admin/content-forms";
import { listProjectsForAdmin } from "@/server/content/projects/admin";

export const metadata: Metadata = { title: "Project trash" };
export const dynamic = "force-dynamic";

export default async function AdminProjectTrashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const filters = parseListFilters(await searchParams);
  const rows = await listProjectsForAdmin({ view: "trash", q: filters.q });

  return (
    <>
      <h1 className="adm-title">Projects</h1>
      <p className="adm-lede">
        Trashed projects are off the public site. Restore one to bring it back
        as it was, or delete it permanently.
      </p>
      <nav aria-label="Project views" className="adm-tabs">
        <Link href="/admin/projects">All projects</Link>
        <Link aria-current="page" href="/admin/projects/trash">
          Trash ({rows.length})
        </Link>
      </nav>
      <ContentFilters
        filters={{ ...filters, status: "all" }}
        kind="project"
        view="trash"
      />
      <ContentTable
        emptyMessage={
          filters.q ? "Nothing in the trash matches." : "The trash is empty."
        }
        kind="project"
        rows={rows}
        view="trash"
      />
    </>
  );
}
