"use client";

import Lenis from "lenis";
import { useEffect } from "react";

import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

export const SmoothScroll = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    if (prefersReducedMotion()) return;

    const lenis = new Lenis();
    const onScroll = () => ScrollTrigger.update();
    const raf = (time: number) => lenis.raf(time * 1000);

    lenis.on("scroll", onScroll);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return children;
};
