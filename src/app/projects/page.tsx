import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectsIndex } from "@/page-sections/projects/projects-index";
import {
  getPublishedSiteProfile,
  listPublishedProjects,
} from "@/server/content/public";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  const [profile, projects] = await Promise.all([
    getPublishedSiteProfile(),
    listPublishedProjects(),
  ]);

  if (!profile) notFound();

  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <ProjectsIndex profile={profile} projects={projects} />
    </>
  );
}
