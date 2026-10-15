import type { ComponentProps } from "react";
import type { PublicProject } from "@/server/content/public";

import { Figure } from "@/components/design-system/figure";
import { LivePreview } from "@/components/design-system/live-preview";
import { embedUrl } from "@/components/design-system/live-preview-utils";
import { canEmbed } from "@/server/content/embeddable";

/** The project's image frame, or a live preview of its site when enabled
    and the site allows being framed. */
export async function ProjectVisual({
  project,
  link = false,
  ...figure
}: ComponentProps<typeof Figure> & {
  project: PublicProject;
  /** Overlay a link that opens the live site; off inside another link. */
  link?: boolean;
}) {
  const url = embedUrl(project);
  const image = <Figure {...figure} />;

  // A site that forbids framing keeps its image instead of a broken box.
  if (!url || !(await canEmbed(url))) return image;

  return (
    <LivePreview
      aspect={figure.aspect ?? "3 / 2"}
      name={project.name}
      openLabel={link ? `Open ${project.name} in a new tab` : null}
      url={url}
    >
      {image}
    </LivePreview>
  );
}
