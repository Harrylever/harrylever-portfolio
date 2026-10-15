import type { Metadata } from "next";

import Link from "next/link";

import { listPickerMedia } from "@/app/admin/_lib/media";
import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { ProjectForm } from "@/components/admin/project-form";

export const metadata: Metadata = { title: "New project" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requireAdminPage();
  const media = await listPickerMedia();

  return (
    <>
      <Link className="adm-back" href="/admin/projects">
        All projects
      </Link>
      <h1 className="adm-title">New project</h1>
      <p className="adm-lede">
        Creating it saves a private draft. Nothing is public until you publish.
      </p>
      <ProjectForm initial={null} media={media} />
    </>
  );
}
