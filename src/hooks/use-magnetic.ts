"use client";

import * as React from "react";

import { gsap, prefersReducedMotion } from "@/lib/gsap";

export function useMagnetic(ref: React.RefObject<HTMLElement | null>, max = 6) {
  React.useEffect(() => {
    const el = ref.current;

    if (!el || prefersReducedMotion()) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });

    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();

      xTo(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * max);
      yTo(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * max);
    };
    const out = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", out);

    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", out);
    };
  }, [ref, max]);
}
