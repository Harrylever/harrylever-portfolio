"use client";

import { SiteNav } from "@/components/design-system/site-nav";
import { ME } from "@/data/me";

export function PersonalNav() {
  return (
    <SiteNav
      contactHref="#say"
      current="home"
      sections={[
        { id: "top", label: "Intro" },
        { id: "now", label: "Right now" },
        { id: "built", label: "Built" },
        { id: "ship", label: "Commits" },
        { id: "frames", label: "Off the screen" },
        { id: "reach", label: "Toolkit" },
        { id: "loop", label: "AI in the loop" },
        { id: "say", label: "Say hello" },
      ]}
      socials={ME.links}
    />
  );
}
