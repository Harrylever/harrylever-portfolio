import type { Metadata } from "next";

import Link from "next/link";

import { listPickerMedia } from "@/app/admin/_lib/media";
import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { ProjectForm } from "@/components/admin/project-form";
import { readProjectForEditing } from "@/server/content/projects/admin";

export const metadata: Metadata = { title: "Edit project" };
export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const [project, media] = await Promise.all([
    readProjectForEditing(id),
    listPickerMedia(),
  ]);

  if (!project) {
    return (
      <>
        <Link className="adm-back" href="/admin/projects">
          All projects
        </Link>
        <h1 className="adm-title">Project not found</h1>
        <p className="adm-lede">
          We couldn&apos;t find that project. It may have been deleted
          permanently.
        </p>
      </>
    );
  }

  if (project.deletedAt) {
    return (
      <>
        <Link className="adm-back" href="/admin/projects/trash">
          Trash
        </Link>
        <h1 className="adm-title">{project.draft.name}</h1>
        <p className="adm-lede">
          This project is in the trash. Restore it from the trash to edit it
          again.
        </p>
      </>
    );
  }

  return (
    <>
      <Link className="adm-back" href="/admin/projects">
        All projects
      </Link>
      <h1 className="adm-title">{project.draft.name}</h1>
      <ProjectForm key={project.id} initial={project} media={media} />
    </>
  );
}
