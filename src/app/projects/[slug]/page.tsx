import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectDetail } from "@/page-sections/projects/project-detail";
import {
  getPublishedProject,
  getPublishedSiteProfile,
  listPublishedProjects,
} from "@/server/content/public";

export async function generateStaticParams() {
  return (await listPublishedProjects()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);

  if (!project) return {};

  return { title: project.seo.title, description: project.seo.description };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, profile, projects] = await Promise.all([
    getPublishedProject(slug),
    getPublishedSiteProfile(),
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
