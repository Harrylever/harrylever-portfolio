"use client";

import * as React from "react";

import { calculateScrollProgress } from "@/lib/scroll-progress";

export function ReadingProgress() {
  const bar = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const update = () => {
      const progress = calculateScrollProgress(
        window.scrollY,
        document.documentElement.scrollHeight,
        window.innerHeight,
      );

      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
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
