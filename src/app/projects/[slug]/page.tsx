import { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/server/auth/require-admin";
import {
  getPreviewProject,
  getPreviewSiteProfile,
  previewRobots,
  resolveContentReadMode,
} from "@/server/content/preview";
import { ProjectDetail } from "@/page-sections/projects/project-detail";
import {
  getPublishedProject,
  getPublishedSiteProfile,
  listPublishedProjects,
} from "@/server/content/public";

async function loadMode() {
  try {
    return await resolveContentReadMode();
  } catch {
    notFound();
  }
}

export async function generateStaticParams() {
  return (await listPublishedProjects()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mode = await loadMode();
  const project =
    mode === "draft"
      ? await getPreviewProject(slug, await requireAdmin())
      : await getPublishedProject(slug);

  if (!project) return {};

  return {
    title: project.seo.title,
    description: project.seo.description,
    ...(mode === "draft" ? { robots: previewRobots } : {}),
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mode = await loadMode();
  const admin = mode === "draft" ? await requireAdmin() : null;
  const [project, profile, projects] = await Promise.all([
    admin ? getPreviewProject(slug, admin) : getPublishedProject(slug),
    admin ? getPreviewSiteProfile(admin) : getPublishedSiteProfile(),
    listPublishedProjects(),
  ]);

  if (!project || !profile) notFound();

  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <ProjectDetail profile={profile} project={project} projects={projects} />
    </>
  );
}
