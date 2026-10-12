import type { PublicPost, PublicSiteProfile } from "@/server/content/public";

import * as React from "react";
import Link from "next/link";

import { SiteNav } from "@/components/design-system/site-nav";
import { Prose } from "@/components/design-system/prose";
import { RichText } from "@/components/content/rich-text";
import { Button } from "@/components/design-system/button";
import { PostRow } from "@/components/design-system/post-row";
import { ReadingProgress } from "@/components/design-system/reading-progress";

export function BlogPostView({
  morePosts,
  post,
  profile,
}: {
  morePosts: PublicPost[];
  post: PublicPost;
  profile: PublicSiteProfile;
}) {
  const words = post.title.split(" ");

  return (
    <React.Fragment>
      <ReadingProgress />
      <SiteNav
        contactHref="/#say"
        current="blog"
        socials={profile.socialLinks}
      />
      <div>
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
            <Prose>
              <RichText document={post.document} media={post.richTextMedia} />
            </Prose>
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
            {morePosts.map((p) => (
              <PostRow
                key={p.slug}
                date={p.date}
                href={`/blog/${p.slug}`}
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
