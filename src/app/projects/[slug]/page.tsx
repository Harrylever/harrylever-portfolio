import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectDetail } from "@/page-sections/projects/project-detail";
import { getProject, PROJECTS } from "@/data/projects";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) return {};

  return { title: project.name, description: project.hook };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) notFound();

  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <ProjectDetail project={project} />
    </>
  );
}
