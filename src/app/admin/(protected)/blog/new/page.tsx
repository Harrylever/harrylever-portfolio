import type { Metadata } from "next";

import Link from "next/link";

import { listPickerMedia } from "@/app/admin/_lib/media";
import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { PostForm } from "@/components/admin/post-form";

export const metadata: Metadata = { title: "New post" };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  await requireAdminPage();
  const media = await listPickerMedia();

  return (
    <>
      <Link className="adm-back" href="/admin/blog">
        All posts
      </Link>
      <h1 className="adm-title">New post</h1>
      <p className="adm-lede">
        Creating it saves a private draft. Nothing is public until you publish.
      </p>
      <PostForm initial={null} media={media} />
    </>
  );
}
