import * as React from "react";
import Link from "next/link";

import { SiteNav } from "@/components/design-system/site-nav";
import { Figure } from "@/components/design-system/figure";
import { Prose } from "@/components/design-system/prose";
import { Tag } from "@/components/design-system/tag";
import { Button } from "@/components/design-system/button";
import { ME } from "@/data/me";
import { PROJECTS } from "@/data/projects";
import { PostBlock, ProjectDetail as ProjectDetailData } from "@/types";

function node(b: PostBlock, i: number) {
  if (b.t === "ul" || b.t === "ol") {
    const List = b.t === "ul" ? "ul" : "ol";

    return (
      <List key={i}>
        {b.c.map((li) => (
          <li key={li}>{li}</li>
        ))}
      </List>
    );
  }
  if (b.t === "h2") return <h2 key={i}>{b.c}</h2>;
  if (b.t === "h3") return <h3 key={i}>{b.c}</h3>;
  if (b.t === "blockquote") return <blockquote key={i}>{b.c}</blockquote>;
  if (b.t === "pre")
    return (
      <pre key={i}>
        <code>{b.c}</code>
      </pre>
    );

  return <p key={i}>{b.c}</p>;
}

export function ProjectDetail({ project }: { project: ProjectDetailData }) {
  const words = project.name.split(" ");
  const next =
    PROJECTS[
      (PROJECTS.findIndex((p) => p.slug === project.slug) + 1) % PROJECTS.length
    ];

  const facts: [string, string][] = [
    ["Year", project.year],
    ["Role", project.role],
    ["State", project.status],
  ];

  return (
    <React.Fragment>
      <SiteNav contactHref="/#say" current="projects" socials={ME.links} />
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
              {project.href ? (
                <a
                  href={project.href}
                  rel="noopener noreferrer"
                  style={{ fontSize: "var(--fs-sm)" }}
                  target="_blank"
                >
                  {project.href.replace(/^https?:\/\//, "")}
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
              aspect="16 / 9"
              placeholder={`Drop the main ${project.name} image`}
              slotId={project.slot}
            />
          </div>

          <div className="pd-body">
            <Prose>{project.body.map(node)}</Prose>
          </div>

          {project.gallery?.length ? (
            <div
              className="pd-gal"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "var(--s-6)",
                marginTop: "var(--s-11)",
              }}
            >
              {project.gallery.map((slot) => (
                <div key={slot}>
                  <Figure
                    aspect="4 / 3"
                    placeholder="Drop a screen"
                    slotId={slot}
                  />
                </div>
              ))}
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
