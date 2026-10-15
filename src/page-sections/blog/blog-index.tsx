import type { PublicPost, PublicSiteProfile } from "@/server/content/public";

import * as React from "react";

import { SiteNav } from "@/components/design-system/site-nav";
import { PostRow } from "@/components/design-system/post-row";

const TITLE = "Notes on building things that have to work.".split(" ");

export function BlogIndex({
  posts,
  profile,
}: {
  posts: PublicPost[];
  profile: PublicSiteProfile;
}) {
  const years: { year: string; posts: PublicPost[] }[] = [];

  posts.forEach((post) => {
    const year = years.find((group) => group.year === post.year);

    if (year) year.posts.push(post);
    else years.push({ year: post.year, posts: [post] });
  });

  return (
    <React.Fragment>
      <SiteNav
        contactHref="/#say"
        current="blog"
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
              {posts.length} {posts.length === 1 ? "post" : "posts"}
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
                      href={`/blog/${p.slug}`}
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
        </main>
      </div>
    </React.Fragment>
  );
}
