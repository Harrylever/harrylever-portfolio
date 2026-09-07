"use client";

import * as React from "react";

import { ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/* Enables smooth scroll-behavior and gives GSAP one refresh once every
   section has mounted and laid out its scroll-triggered animations. */
export function ScrollRefresh() {
  React.useEffect(() => {
    if (!prefersReducedMotion()) {
      document.documentElement.style.scrollBehavior = "smooth";
    }
    const t = setTimeout(() => ScrollTrigger.refresh(), 500);

    return () => clearTimeout(t);
  }, []);

  return null;
}
