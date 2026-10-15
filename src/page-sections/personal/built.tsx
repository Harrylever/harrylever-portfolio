import type { PublicHomepage } from "@/server/content/public";

import { SectionHeading } from "@/components/design-system/section-heading";
import { Tag } from "@/components/design-system/tag";
import { Button } from "@/components/design-system/button";
import { MetricsStrip } from "@/components/design-system/metrics-strip";
import { projectKindOf } from "@/domain/content/project";
import {
  kindLabel,
  statusToneStyle,
} from "@/page-sections/projects/project-meta";
import { ProjectVisual } from "@/page-sections/projects/project-visual";

export function Built({ section }: { section: PublicHomepage["built"] }) {
  return (
    <section
      id="built"
      style={{
        borderTop: "1px solid var(--line)",
        padding: "var(--section-y) 0",
      }}
    >
      <div
        style={{
          maxWidth: "var(--page-max)",
          margin: "0 auto",
          padding: "0 var(--gutter)",
        }}
      >
        <SectionHeading note={section.note}>{section.heading}</SectionHeading>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-11)",
          }}
        >
          {section.projects.map((project, i) => (
            <article
              key={project.id}
              className={"bt-item" + (i % 2 ? " bt-flip" : "")}
              style={{
                display: "grid",
                gap: "var(--s-9)",
                alignItems: "center",
              }}
            >
              <div
                className="bt-shot"
                style={{ order: i % 2 ? 2 : 1, minWidth: 0 }}
              >
                <ProjectVisual
                  link
                  aspect={
                    project.homepagePlaceholder?.aspectRatio ??
                    project.coverPlaceholder?.aspectRatio ??
                    "3 / 2"
                  }
                  asset={project.coverAsset}
                  placeholder={`Drop a ${project.name} screenshot`}
                  project={project}
                  slotId={
                    project.homepagePlaceholder?.slotId ??
                    project.coverPlaceholder?.slotId ??
                    `build-${project.slug}`
                  }
                />
              </div>
              <div
                className="bt-copy"
                style={{
                  order: i % 2 ? 1 : 2,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-4)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--fw-display-emph)",
                    fontSize: "clamp(1.5rem,3vw,2.125rem)",
                    letterSpacing: "var(--tr-title)",
                    lineHeight: 1.15,
                    margin: 0,
                  }}
                >
                  {project.name}
                </h3>
                <p
                  style={{
                    fontSize: "var(--fs-lede)",
                    color: "var(--text-primary)",
                    maxWidth: "44ch",
                  }}
                >
                  {project.hook}
                </p>
                <p
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-secondary)",
                    maxWidth: "56ch",
                  }}
                >
                  {project.homepageStory}
                </p>
                <MetricsStrip metrics={project.metrics} />
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--s-2)",
                  }}
                >
                  <Tag>{kindLabel(projectKindOf(project))}</Tag>
                  {project.stack.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--s-4)",
                    fontSize: "var(--fs-micro)",
                  }}
                >
                  <span style={statusToneStyle(project.statusTone)}>
                    {project.displayStatus}
                  </span>
                  {project.externalUrl ? (
                    <a
                      href={project.externalUrl}
                      rel="noopener noreferrer"
                      style={{ boxShadow: "inset 0 -1px 0 0 currentColor" }}
                      target="_blank"
                    >
                      {project.externalUrl.replace(/^https?:\/\//, "")}
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
        <div style={{ marginTop: "var(--s-10)" }}>
          <Button href="/projects" variant="outline">
            {section.ctaLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
