"use client";

import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";

import { PREVIEW_VIEWPORT_WIDTH, previewScale } from "./live-preview-utils";

/* A scaled, non-interactive iframe of a live site inside the image frame.
   The server renders only the fallback (the project's image or placeholder);
   the iframe mounts on the client once the frame is near the viewport, on a
   wide screen, for visitors who have not asked for reduced motion. */
export function LivePreview({
  url,
  name,
  aspect,
  openLabel,
  children,
}: {
  url: string;
  name: string;
  aspect: string;
  /** Accessible name for the link that opens the site; null for no link. */
  openLabel: string | null;
  children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [eligible, setEligible] = useState(false);
  const [near, setNear] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEligible(wide.matches && !reduced.matches);

    update();
    wide.addEventListener("change", update);
    reduced.addEventListener("change", update);

    return () => {
      wide.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const element = frame.current;

    if (!element || !eligible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin: "200px" },
    );
    const resize = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(element);
    resize.observe(element);

    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, [eligible]);

  const scale = previewScale(size.width);
  const active = eligible && near && scale > 0;

  return (
    <div
      ref={frame}
      data-live-preview={url}
      style={{
        position: "relative",
        aspectRatio: aspect,
        width: "100%",
        overflow: "hidden",
        borderRadius: "var(--r-card)",
        background: "var(--bg-surface)",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
      {active ? (
        <iframe
          aria-hidden="true"
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
          src={url}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: PREVIEW_VIEWPORT_WIDTH,
            height: size.height / scale,
            border: 0,
            background: "#fff",
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            pointerEvents: "none",
            opacity: loaded ? 1 : 0,
            transition: "opacity .3s ease",
          }}
          tabIndex={-1}
          title={`${name} live preview`}
          onLoad={() => setLoaded(true)}
        />
      ) : null}
      {openLabel ? (
        <a
          aria-label={openLabel}
          href={url}
          rel="noopener noreferrer"
          style={{ position: "absolute", inset: 0 }}
          target="_blank"
        />
      ) : null}
    </div>
  );
}
