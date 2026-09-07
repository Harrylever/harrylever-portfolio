"use client";

import * as React from "react";

import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

export function ReadingProgress() {
  const bar = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = bar.current;
    const st = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => gsap.set(el, { scaleX: self.progress }),
    });

    return () => st.kill();
  }, []);

  return (
    <span
      ref={bar}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "var(--sand)",
        transform: "scaleX(0)",
        transformOrigin: "left center",
        zIndex: 25,
      }}
    />
  );
}
