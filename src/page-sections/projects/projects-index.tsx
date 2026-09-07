"use client";

import * as React from "react";
import Link from "next/link";

import { SiteNav } from "@/components/design-system/site-nav";
import { Figure } from "@/components/design-system/figure";
import { Tag } from "@/components/design-system/tag";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { ME } from "@/data/me";
import { PROJECTS } from "@/data/projects";

const TITLE = "Everything I've built, and why.".split(" ");

export function ProjectsIndex() {
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.from(".px-rule", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.7,
      })
        .from(
          ".px-word",
          { yPercent: 110, scaleY: 1.06, duration: 0.85, stagger: 0.05 },
          0.1,
        )
        .from(".px-lede-inner", { yPercent: 110, duration: 0.8 }, "-=0.55");

      gsap.utils.toArray<HTMLElement>(".px-row").forEach((row) => {
        gsap.from(row.querySelector(".px-name"), {
          yPercent: 110,
          duration: 0.8,
          ease: "expo.out",
          scrollTrigger: { trigger: row, start: "top 88%" },
        });
        gsap.from(row.querySelectorAll(".px-side > *"), {
          opacity: 0,
          y: 14,
          duration: 0.6,
          ease: "expo.out",
          stagger: 0.05,
          scrollTrigger: { trigger: row, start: "top 86%" },
        });
        gsap.from(row.querySelector(".px-thumb"), {
          clipPath: "inset(0 0 100% 0)",
          duration: 0.8,
          ease: "expo.out",
          scrollTrigger: { trigger: row, start: "top 84%" },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <React.Fragment>
      <SiteNav contactHref="/#say" current="projects" socials={ME.links} />
      <div ref={root}>
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
              {PROJECTS.length} of them
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
          {PROJECTS.map((p) => (
            <article
              key={p.slug}
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
                  aria-label={`Read the ${p.name} write-up`}
                  href={`/projects/${p.slug}`}
                  style={{ display: "block", borderRadius: "var(--r-card)" }}
                >
                  <Figure
                    aspect="3 / 2"
                    placeholder={`Drop a ${p.name} image`}
                    slotId={p.slot}
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
                    href={`/projects/${p.slug}`}
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
                    {p.name}
                  </Link>
                </span>
                <p
                  style={{
                    fontSize: "var(--fs-lede)",
                    color: "var(--text-primary)",
                    maxWidth: "42ch",
                  }}
                >
                  {p.hook}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--s-2)",
                  }}
                >
                  {p.stack.slice(0, 4).map((s) => (
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
                    {p.year}
                  </span>
                  <span style={{ color: "var(--sand)" }}>{p.status}</span>
                  <Link
                    href={`/projects/${p.slug}`}
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
