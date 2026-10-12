import type { Metadata } from "next";

import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { HomeSectionList } from "@/components/admin/home/home-section-list";
import { readHomeForAdmin } from "@/server/content/home/admin";

export const metadata: Metadata = { title: "Homepage" };
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdminPage();
  const overview = await readHomeForAdmin();

  return (
    <>
      <h1 className="adm-title">Homepage</h1>
      <p className="adm-lede">
        Eight fixed sections, top to bottom. Edit, hide or reorder them here;
        nothing reaches the public homepage until you publish, and then every
        section goes live together.
      </p>
      <HomeSectionList initial={overview} />
    </>
  );
}
