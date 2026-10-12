import type { Metadata } from "next";

import Link from "next/link";

import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { ContentFilters, ContentTable } from "@/components/admin/content-table";
import { parseListFilters } from "@/lib/admin/content-forms";
import { listPostsForAdmin } from "@/server/content/posts/admin";

export const metadata: Metadata = { title: "Blog trash" };
export const dynamic = "force-dynamic";

export default async function AdminBlogTrashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const filters = parseListFilters(await searchParams);
  const rows = await listPostsForAdmin({ view: "trash", q: filters.q });

  return (
    <>
      <h1 className="adm-title">Blog</h1>
      <p className="adm-lede">
        Trashed posts are off the blog. Restore one to bring it back as it was,
        or delete it permanently.
      </p>
      <nav aria-label="Blog views" className="adm-tabs">
        <Link href="/admin/blog">All posts</Link>
        <Link aria-current="page" href="/admin/blog/trash">
          Trash ({rows.length})
        </Link>
      </nav>
      <ContentFilters
        filters={{ ...filters, status: "all" }}
        kind="post"
        view="trash"
      />
      <ContentTable
        emptyMessage={
          filters.q ? "Nothing in the trash matches." : "The trash is empty."
        }
        kind="post"
        rows={rows}
        view="trash"
      />
    </>
  );
}
