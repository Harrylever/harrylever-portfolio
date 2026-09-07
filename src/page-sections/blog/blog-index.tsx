"use client";

import * as React from "react";

import { SiteNav } from "@/components/design-system/site-nav";
import { PostRow } from "@/components/design-system/post-row";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { ME } from "@/data/me";
import { POSTS } from "@/data/posts";

const TITLE = "Notes on building things that have to work.".split(" ");

export function BlogIndex() {
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".bi-word", {
          yPercent: 110,
          scaleY: 1.06,
          duration: 0.85,
          ease: "expo.out",
          stagger: 0.055,
        });
        gsap.from(".bi-lede", {
          yPercent: 110,
          duration: 0.8,
          ease: "expo.out",
          delay: 0.25,
        });
        gsap.utils.toArray<HTMLElement>(".bi-year").forEach((y) => {
          gsap.from(y.querySelector(".bi-year-label"), {
            opacity: 0,
            duration: 0.5,
            scrollTrigger: { trigger: y, start: "top 88%" },
          });
          gsap.from(y.querySelectorAll(".bi-row"), {
            yPercent: 40,
            opacity: 0,
            duration: 0.7,
            ease: "expo.out",
            stagger: 0.07,
            scrollTrigger: { trigger: y, start: "top 84%" },
          });
        });
      }, root);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  const years: { year: string; posts: typeof POSTS }[] = [];

  POSTS.forEach((p) => {
    const y = years.find((x) => x.year === p.year);

    if (y) y.posts.push(p);
    else years.push({ year: p.year, posts: [p] });
  });

  return (
    <React.Fragment>
      <SiteNav contactHref="/#say" current="blog" socials={ME.links} />
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
              marginBottom: "var(--s-8)",
            }}
          >
            <span
              style={{ fontSize: "var(--fs-meta)", color: "var(--text-meta)" }}
            >
              Blog
            </span>
            <span style={{ height: 1, background: "var(--line)", flex: 1 }} />
            <span
              style={{ fontSize: "var(--fs-meta)", color: "var(--text-meta)" }}
            >
              {POSTS.length} posts
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
                    className="bi-word"
                    style={{
                      display: "inline-block",
                      fontWeight:
                        i >= TITLE.length - 3
                          ? "var(--fw-display-emph)"
                          : "inherit",
                      color: i >= TITLE.length - 3 ? "var(--sand)" : "inherit",
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
              className="bi-lede"
              style={{
                fontSize: "var(--fs-lede)",
                color: "var(--text-secondary)",
                maxWidth: "var(--measure-lede)",
              }}
            >
              Working notes from the projects — security tooling, payments in
              low-bandwidth places, and whatever I am currently learning the
              hard way.
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
          {years.map((group) => (
            <section
              key={group.year}
              className="bi-year"
              style={{
                display: "grid",
                gridTemplateColumns: "110px minmax(0,1fr)",
                gap: "var(--s-8)",
                paddingTop: "var(--s-9)",
              }}
            >
              <span
                className="bi-year-label"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--fw-display-light)",
                  fontSize: "var(--fs-subtitle)",
                  color: "var(--text-meta)",
                  fontVariantNumeric: "tabular-nums",
                  position: "sticky",
                  top: "var(--s-8)",
                  alignSelf: "start",
                }}
              >
                {group.year}
              </span>
              <div>
                {group.posts.map((p) => (
                  <div key={p.slug} className="bi-row">
                    <PostRow
                      date={p.date}
                      href={p.body ? `/blog/${p.slug}` : "#"}
                      readingTime={p.readingTime}
                      summary={p.summary}
                      tag={p.tag}
                      title={p.title}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
          <p
            style={{
              marginTop: "var(--s-9)",
              fontSize: "var(--fs-meta)",
              color: "var(--text-meta)",
              maxWidth: "62ch",
            }}
          >
            Only the first post has a body in this prototype — open “What
            Tree-sitter taught me…” to see the reading view.
          </p>
        </main>
      </div>
    </React.Fragment>
  );
}
