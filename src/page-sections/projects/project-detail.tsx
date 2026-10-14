import type { PublicProject, PublicSiteProfile } from "@/server/content/public";

import * as React from "react";
import Link from "next/link";

import { SiteNav } from "@/components/design-system/site-nav";
import { Figure } from "@/components/design-system/figure";
import { Prose } from "@/components/design-system/prose";
import { RichText } from "@/components/content/rich-text";
import { Tag } from "@/components/design-system/tag";
import { Button } from "@/components/design-system/button";

export function ProjectDetail({
  profile,
  project,
  projects,
}: {
  profile: PublicSiteProfile;
  project: PublicProject;
  projects: PublicProject[];
}) {
  const words = project.name.split(" ");
  const currentIndex = projects.findIndex(({ slug }) => slug === project.slug);
  const next =
    projects[(Math.max(0, currentIndex) + 1) % projects.length] ?? project;

  const facts: [string, string][] = [
    ["Year", project.year],
    ["Role", project.role],
    ["State", project.displayStatus],
  ];

  return (
    <React.Fragment>
      <SiteNav
        contactHref="/#say"
        current="projects"
        socials={profile.socialLinks}
      />
      <div>
        <article
          id="top"
          style={{
            maxWidth: "var(--page-max)",
            margin: "0 auto",
            padding: "var(--s-12) var(--gutter) 0",
          }}
        >
          <Link
            className="pd-back"
            href="/projects"
            style={{
              fontSize: "var(--fs-meta)",
              display: "inline-block",
              marginBottom: "var(--s-8)",
            }}
          >
            All projects
          </Link>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--fw-display-light)",
              fontSize: "clamp(2.5rem,7vw,5.25rem)",
              lineHeight: 1.02,
              letterSpacing: "var(--tr-display)",
              maxWidth: "18ch",
              margin: "0 0 var(--s-6)",
            }}
          >
            {words.map((w, i) => (
              <React.Fragment key={i}>
                <span
                  style={{
                    display: "inline-block",
                    overflow: "hidden",
                    verticalAlign: "bottom",
                  }}
                >
                  <span className="pd-word" style={{ display: "inline-block" }}>
                    {w}
                  </span>
                </span>{" "}
              </React.Fragment>
            ))}
          </h1>

          <div style={{ overflow: "hidden", marginBottom: "var(--s-9)" }}>
            <p
              className="pd-hook-inner"
              style={{
                fontSize: "var(--fs-lede)",
                color: "var(--text-secondary)",
                maxWidth: "48ch",
              }}
            >
              {project.hook}
            </p>
          </div>

          <div
            className="pd-facts"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "var(--s-6)",
              paddingBottom: "var(--s-6)",
              borderBottom: "1px solid var(--line)",
              marginBottom: "var(--s-9)",
            }}
          >
            {facts.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-1)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--fs-micro)",
                    color: "var(--text-meta)",
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-primary)",
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-1)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--fs-micro)",
                  color: "var(--text-meta)",
                }}
              >
                Live at
              </span>
              {project.externalUrl ? (
                <a
                  href={project.externalUrl}
                  rel="noopener noreferrer"
                  style={{ fontSize: "var(--fs-sm)" }}
                  target="_blank"
                >
                  {project.externalUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-meta)",
                  }}
                >
                  Not public
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-2)",
                gridColumn: "1 / -1",
              }}
            >
              <span
                style={{
                  fontSize: "var(--fs-micro)",
                  color: "var(--text-meta)",
                }}
              >
                Built with
              </span>
              <span
                style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}
              >
                {project.stack.map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </span>
            </div>
          </div>

          <div className="pd-lead" style={{ marginBottom: "var(--s-11)" }}>
            <Figure
              aspect={project.coverPlaceholder?.aspectRatio ?? "16 / 9"}
              asset={project.coverAsset}
              placeholder={`Drop the main ${project.name} image`}
              slotId={
                project.coverPlaceholder?.slotId ?? `project-${project.slug}`
              }
            />
          </div>

          <div className="pd-body">
            <Prose>
              <RichText
                document={project.caseStudy}
                media={project.richTextMedia}
              />
            </Prose>
          </div>

          {project.galleryAssets.length ||
          project.galleryPlaceholders?.length ? (
            <div
              className="pd-gal"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "var(--s-6)",
                marginTop: "var(--s-11)",
              }}
            >
              {project.galleryAssets.map((asset, index) => (
                <div key={asset.id}>
                  <Figure
                    aspect={
                      project.galleryPlaceholders?.[index]?.aspectRatio ??
                      "4 / 3"
                    }
                    asset={asset}
                    placeholder="Drop a screen"
                    slotId={
                      project.galleryPlaceholders?.[index]?.slotId ?? asset.id
                    }
                  />
                </div>
              ))}
              {project.galleryAssets.length === 0
                ? project.galleryPlaceholders?.map((placeholder) => (
                    <div key={placeholder.slotId}>
                      <Figure
                        aspect={placeholder.aspectRatio}
                        caption={placeholder.caption}
                        placeholder="Drop a screen"
                        slotId={placeholder.slotId}
                      />
                    </div>
                  ))
                : null}
            </div>
          ) : null}

          <div style={{ height: "var(--s-11)" }} />
        </article>

        <section
          style={{
            background: "var(--bg-sunken)",
            borderTop: "1px solid var(--line)",
            padding: "var(--s-11) 0",
          }}
        >
          <div
            style={{
              maxWidth: "var(--page-max)",
              margin: "0 auto",
              padding: "0 var(--gutter)",
            }}
          >
            <span
              style={{ fontSize: "var(--fs-meta)", color: "var(--text-meta)" }}
            >
              Next
            </span>
            <Link
              href={`/projects/${next.slug}`}
              style={{
                display: "block",
                marginTop: "var(--s-4)",
                fontFamily: "var(--font-display)",
                fontWeight: "var(--fw-display-light)",
                fontSize: "clamp(1.75rem,4.4vw,3.25rem)",
                letterSpacing: "var(--tr-display)",
                lineHeight: 1.08,
                color: "var(--text-primary)",
                maxWidth: "22ch",
              }}
            >
              {next.name}
            </Link>
            <p
              style={{
                marginTop: "var(--s-4)",
                fontSize: "var(--fs-sm)",
                color: "var(--text-secondary)",
                maxWidth: "48ch",
              }}
            >
              {next.hook}
            </p>
            <div
              style={{
                marginTop: "var(--s-8)",
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--s-3)",
              }}
            >
              <Button href="/projects" variant="outline">
                All projects
              </Button>
              <Button href="/#say" variant="quiet">
                Say hello
              </Button>
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
}
