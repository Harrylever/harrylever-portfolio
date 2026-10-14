import type { Metadata } from "next";

import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { MediaLibrary } from "@/components/admin/media/media-library";
import { listMediaForAdmin } from "@/server/content/media/admin";

export const metadata: Metadata = { title: "Media" };
export const dynamic = "force-dynamic";

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [assets, params] = await Promise.all([
    listMediaForAdmin(),
    searchParams,
  ]);
  const asset = typeof params.asset === "string" ? params.asset : null;

  return (
    <>
      <h1 className="adm-title">Media</h1>
      <p className="adm-lede">
        Images go straight to Cloudinary and appear in every editor&apos;s image
        picker. An image can&apos;t be deleted while a project, post or homepage
        section still uses it.
      </p>
      <MediaLibrary initial={assets} selectedId={asset} />
    </>
  );
}
