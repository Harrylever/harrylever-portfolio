import { Metadata } from "next";

import { ProjectsIndex } from "@/page-sections/projects/projects-index";

export const metadata: Metadata = {
  title: "Projects",
};

export default function ProjectsPage() {
  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <ProjectsIndex />
    </>
  );
}
