import type { PublicProject, PublicSiteProfile } from "@/server/content/public";

import * as React from "react";
import Link from "next/link";

import { kindLabel, statusToneStyle } from "./project-meta";
import { ProjectVisual } from "./project-visual";

import { SiteNav } from "@/components/design-system/site-nav";
import { Tag } from "@/components/design-system/tag";
import { MetricsStrip } from "@/components/design-system/metrics-strip";
import { projectKindOf } from "@/domain/content/project";

const TITLE = "Everything I've built, and why.".split(" ");

export function ProjectsIndex({
  profile,
  projects,
}: {
  profile: PublicSiteProfile;
  projects: PublicProject[];
}) {
  return (
    <React.Fragment>
      <SiteNav
        contactHref="/#say"
        current="projects"
        socials={profile.socialLinks}
      />
      <div>
        <header
          id="top"
          style={{
            maxWidth: "var(--page-max)",
            margin: "0 auto",
            padding: "var(--s-12) var(--gutter) var(--s-11)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s-4)",
              marginBottom: "var(--s-9)",
            }}
          >
            <span
              style={{ fontSize: "var(--fs-meta)", color: "var(--text-meta)" }}
            >
              Projects
            </span>
            <span
              className="px-rule"
              style={{ height: 1, background: "var(--line)", flex: 1 }}
            />
            <span
              style={{ fontSize: "var(--fs-meta)", color: "var(--text-meta)" }}
            >
              {projects.length} of them
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--fw-display-light)",
              fontSize: "clamp(2.25rem,6vw,4.5rem)",
              lineHeight: "var(--lh-display)",
              letterSpacing: "var(--tr-display)",
              maxWidth: "20ch",
              margin: "0 0 var(--s-8)",
            }}
          >
            {TITLE.map((w, i) => (
              <React.Fragment key={i}>
                <span
                  style={{
                    display: "inline-block",
                    overflow: "hidden",
                    verticalAlign: "bottom",
                  }}
                >
                  <span
                    className="px-word"
                    style={{
                      display: "inline-block",
                      fontWeight:
                        i === TITLE.length - 1
                          ? "var(--fw-display-emph)"
                          : "inherit",
                      color: i === TITLE.length - 1 ? "var(--sand)" : "inherit",
                    }}
                  >
                    {w}
                  </span>
                </span>{" "}
              </React.Fragment>
            ))}
          </h1>
          <div style={{ overflow: "hidden" }}>
            <p
              className="px-lede-inner"
              style={{
                fontSize: "var(--fs-lede)",
                color: "var(--text-secondary)",
                maxWidth: "var(--measure-lede)",
              }}
            >
              Products, client work and a capstone. Each one has a write-up:
              what the problem actually was, what I got wrong, and what I would
              do differently.
            </p>
          </div>
        </header>

        <main
          style={{
            maxWidth: "var(--page-max)",
            margin: "0 auto",
            padding: "0 var(--gutter) var(--s-12)",
          }}
        >
          {projects.map((project) => (
            <article
              key={project.id}
              className="px-row"
              style={{
                display: "grid",
                gap: "var(--s-8)",
                padding: "var(--s-9) 0",
                borderTop: "1px solid var(--line)",
                alignItems: "start",
              }}
            >
              <div className="px-thumb" style={{ minWidth: 0 }}>
                <Link
                  aria-label={`Read the ${project.name} write-up`}
                  href={`/projects/${project.slug}`}
                  style={{ display: "block", borderRadius: "var(--r-card)" }}
                >
                  <ProjectVisual
                    aspect={project.coverPlaceholder?.aspectRatio ?? "3 / 2"}
                    asset={project.coverAsset}
                    placeholder={`Drop a ${project.name} image`}
                    project={project}
                    slotId={
                      project.coverPlaceholder?.slotId ??
                      `project-${project.slug}`
                    }
                  />
                </Link>
              </div>

              <div
                className="px-side"
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-4)",
                }}
              >
                <span style={{ overflow: "hidden", display: "block" }}>
                  <Link
                    className="px-name"
                    href={`/projects/${project.slug}`}
                    style={{
                      display: "inline-block",
                      fontFamily: "var(--font-display)",
                      fontWeight: "var(--fw-display-emph)",
                      fontSize: "clamp(1.75rem,3.6vw,2.75rem)",
                      letterSpacing: "var(--tr-title)",
                      lineHeight: 1.1,
                      color: "var(--text-primary)",
                    }}
                  >
                    {project.name}
                  </Link>
                </span>
                <p
                  style={{
                    fontSize: "var(--fs-lede)",
                    color: "var(--text-primary)",
                    maxWidth: "42ch",
                  }}
                >
                  {project.hook}
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
                  {project.stack.slice(0, 4).map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "var(--s-5)",
                    fontSize: "var(--fs-micro)",
                    color: "var(--text-meta)",
                    paddingTop: "var(--s-2)",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {project.year}
                  </span>
                  <span style={statusToneStyle(project.statusTone)}>
                    {project.displayStatus}
                  </span>
                  <Link
                    href={`/projects/${project.slug}`}
                    style={{ boxShadow: "inset 0 -1px 0 0 currentColor" }}
                  >
                    Read the write-up
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </main>
      </div>
    </React.Fragment>
  );
}
