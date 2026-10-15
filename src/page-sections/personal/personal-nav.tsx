"use client";

import { SiteNav } from "@/components/design-system/site-nav";

const sectionLabels = {
  intro: { id: "top", label: "Intro" },
  now: { id: "now", label: "Right now" },
  built: { id: "built", label: "Built" },
  commits: { id: "ship", label: "Commits" },
  frames: { id: "frames", label: "Off the screen" },
  reach: { id: "reach", label: "Toolkit" },
  loop: { id: "loop", label: "AI in the loop" },
  say: { id: "say", label: "Say hello" },
} as const;

export function PersonalNav({
  sections,
  socials,
}: {
  sections: Array<{
    type: keyof typeof sectionLabels;
    visible: boolean;
  }>;
  socials: Array<{ label: string; href: string }>;
}) {
  return (
    <SiteNav
      contactHref="#say"
      current="home"
      sections={sections
        .filter(({ visible }) => visible)
        .map(({ type }) => sectionLabels[type])}
      socials={socials}
    />
  );
}
