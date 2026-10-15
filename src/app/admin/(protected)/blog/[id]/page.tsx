import type { Metadata } from "next";

import Link from "next/link";

import { listPickerMedia } from "@/app/admin/_lib/media";
import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { PostForm } from "@/components/admin/post-form";
import { readPostForEditing } from "@/server/content/posts/admin";

export const metadata: Metadata = { title: "Edit post" };
export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const [post, media] = await Promise.all([
    readPostForEditing(id),
    listPickerMedia(),
  ]);

  if (!post) {
    return (
      <>
        <Link className="adm-back" href="/admin/blog">
          All posts
        </Link>
        <h1 className="adm-title">Post not found</h1>
        <p className="adm-lede">
          We couldn&apos;t find that post. It may have been deleted permanently.
        </p>
      </>
    );
  }

  if (post.deletedAt) {
    return (
      <>
        <Link className="adm-back" href="/admin/blog/trash">
          Trash
        </Link>
        <h1 className="adm-title">{post.draft.title}</h1>
        <p className="adm-lede">
          This post is in the trash. Restore it from the trash to edit it again.
        </p>
      </>
    );
  }

  return (
    <>
      <Link className="adm-back" href="/admin/blog">
        All posts
      </Link>
      <h1 className="adm-title">{post.draft.title}</h1>
      <PostForm key={post.id} initial={post} media={media} />
    </>
  );
}
