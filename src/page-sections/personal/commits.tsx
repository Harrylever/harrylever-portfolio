"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { SectionHeading } from "@/components/design-system/section-heading";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const GITHUB_USERNAME = "harrylever";

/* The calendar fetches contribution data client-side and has no SSR mode
   (see the library's own README) — rendering it during SSR produces a
   different first paint than the client's pre-fetch render and triggers a
   hydration mismatch. Load it only in the browser instead. */
const GitHubCalendar = dynamic(
  () => import("react-github-calendar").then((mod) => mod.GitHubCalendar),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 130,
          borderRadius: "var(--r-card)",
          background: "var(--bg-surface)",
        }}
      />
    ),
  },
);

/* A five-stop sage scale (dim -> peak) instead of GitHub's default green, so
   the calendar reads as part of the room rather than an embedded widget. */
const CALENDAR_THEME = {
  dark: ["var(--bg-surface)", "#4b5c4f", "#6b8567", "#8fb187", "var(--sage)"],
};

export function Commits() {
  const root = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".cm-cal", {
          y: 24,
          opacity: 0,
          duration: 0.8,
          ease: "expo.out",
          scrollTrigger: { trigger: root.current, start: "top 82%" },
        });
      }, root);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      id="ship"
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
        <SectionHeading note="Pulled live from GitHub — a rolling year, not a highlight reel.">
          Commits
        </SectionHeading>
        <div className="cm-cal" style={{ overflowX: "auto" }}>
          <GitHubCalendar
            blockMargin={4}
            blockRadius={2}
            blockSize={11}
            colorScheme="dark"
            fontSize={13}
            labels={{ totalCount: "{{count}} contributions in the last year" }}
            theme={CALENDAR_THEME}
            username={GITHUB_USERNAME}
          />
        </div>
      </div>
    </section>
  );
}
