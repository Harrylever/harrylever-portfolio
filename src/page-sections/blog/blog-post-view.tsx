"use client";

import * as React from "react";
import Link from "next/link";

import { SiteNav } from "@/components/design-system/site-nav";
import { Prose } from "@/components/design-system/prose";
import { Button } from "@/components/design-system/button";
import { PostRow } from "@/components/design-system/post-row";
import { ReadingProgress } from "@/components/design-system/reading-progress";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { ME } from "@/data/me";
import { POSTS } from "@/data/posts";
import { Post, PostBlock } from "@/types";

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
  if (b.t === "pre")
    return (
      <pre key={i}>
        <code>{b.c}</code>
      </pre>
    );
  if (b.t === "h2") return <h2 key={i}>{b.c}</h2>;
  if (b.t === "h3") return <h3 key={i}>{b.c}</h3>;
  if (b.t === "blockquote") return <blockquote key={i}>{b.c}</blockquote>;

  return <p key={i}>{b.c}</p>;
}

export function BlogPostView({ post }: { post: Post }) {
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.from(".bp-meta", { opacity: 0, duration: 0.5 })
        .from(
          ".bp-word",
          { yPercent: 110, scaleY: 1.06, duration: 0.85, stagger: 0.04 },
          0.05,
        )
        .from(
          ".bp-rule",
          { scaleX: 0, transformOrigin: "left center", duration: 0.7 },
          "-=0.5",
        )
        .from(
          ".bp-body > div > *",
          { yPercent: 30, opacity: 0, duration: 0.6, stagger: 0.03 },
          "-=0.45",
        );
    }, root);

    return () => ctx.revert();
  }, [post.slug]);

  const words = post.title.split(" ");
  const more = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <React.Fragment>
      <ReadingProgress />
      <SiteNav contactHref="/#say" current="blog" socials={ME.links} />
      <div ref={root}>
        <article
          id="top"
          style={{
            maxWidth: "var(--page-max)",
            margin: "0 auto",
            padding: "var(--s-12) var(--gutter) var(--s-11)",
          }}
        >
          <div
            className="bp-meta"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "var(--s-5)",
              marginBottom: "var(--s-8)",
              fontSize: "var(--fs-meta)",
              color: "var(--text-meta)",
            }}
          >
            <Link href="/blog" style={{ fontSize: "var(--fs-meta)" }}>
              Back to blog
            </Link>
            <span>{post.date}</span>
            <span>{post.readingTime}</span>
            <span style={{ color: "var(--sand)" }}>{post.tag}</span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--fw-display-light)",
              fontSize: "clamp(2rem,5vw,3.75rem)",
              lineHeight: 1.05,
              letterSpacing: "var(--tr-display)",
              maxWidth: "26ch",
              margin: "0 0 var(--s-8)",
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
                  <span className="bp-word" style={{ display: "inline-block" }}>
                    {w}
                  </span>
                </span>{" "}
              </React.Fragment>
            ))}
          </h1>

          <span
            className="bp-rule"
            style={{
              display: "block",
              height: 1,
              background: "var(--line)",
              marginBottom: "var(--s-9)",
            }}
          />

          <div className="bp-body">
            <Prose>{post.body?.map(node)}</Prose>
          </div>
        </article>

        <section
          style={{
            borderTop: "1px solid var(--line)",
            background: "var(--bg-sunken)",
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
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--fw-display-regular)",
                fontSize: "var(--fs-section)",
                letterSpacing: "var(--tr-section)",
                margin: "0 0 var(--s-8)",
              }}
            >
              Keep reading
            </h2>
            {more.map((p) => (
              <PostRow
                key={p.slug}
                date={p.date}
                href={p.body ? `/blog/${p.slug}` : "/blog"}
                readingTime={p.readingTime}
                summary={p.summary}
                tag={p.tag}
                title={p.title}
              />
            ))}
            <div
              style={{
                marginTop: "var(--s-8)",
                display: "flex",
                gap: "var(--s-3)",
                flexWrap: "wrap",
              }}
            >
              <Button href="/blog" variant="outline">
                All posts
              </Button>
              <Button href="/#say" variant="quiet">
                Get in touch
              </Button>
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
}
