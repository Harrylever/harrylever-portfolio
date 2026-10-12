import type { Metadata } from "next";

import Link from "next/link";

import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { ContentFilters, ContentTable } from "@/components/admin/content-table";
import { parseListFilters } from "@/lib/admin/content-forms";
import { listPostsForAdmin } from "@/server/content/posts/admin";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const filters = parseListFilters(await searchParams);
  const [rows, trash] = await Promise.all([
    listPostsForAdmin({ view: "active", ...filters }),
    listPostsForAdmin({ view: "trash" }),
  ]);
  const filtered = Boolean(filters.q) || filters.status !== "all";

  return (
    <>
      <div className="adm-pagehead">
        <h1 className="adm-title">Blog</h1>
        <Link className="adm-btn" data-variant="solid" href="/admin/blog/new">
          New post
        </Link>
      </div>
      <p className="adm-lede">
        Drafts stay private until you publish them. Posts are listed newest
        change first.
      </p>
      <nav aria-label="Blog views" className="adm-tabs">
        <Link aria-current="page" href="/admin/blog">
          All posts
        </Link>
        <Link href="/admin/blog/trash">Trash ({trash.length})</Link>
      </nav>
      <ContentFilters filters={filters} kind="post" view="active" />
      <ContentTable
        emptyMessage={
          filtered
            ? "No posts match. Try another search or state."
            : "No posts yet. Write one to start a draft."
        }
        kind="post"
        rows={rows}
        view="active"
      />
    </>
  );
}
