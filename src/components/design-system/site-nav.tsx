"use client";

import * as React from "react";
import Link from "next/link";

import { SocialLink } from "@/types";
import { isInternalHref } from "@/lib/utils";

type Route = { id: string; label: string; href: string };
type Section = { id: string; label: string };

const DEFAULT_ROUTES: Route[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "projects", label: "Projects", href: "/projects" },
  { id: "blog", label: "Blog", href: "/blog" },
];

/* Site index. Two presentations of the same content, chosen by available margin:
   - >=1440px: a fixed vertical index living in the left page margin.
   - <1440px: a fixed corner trigger that opens a full-height right panel.
   The same component sits on every page; `current` moves the sage dot. */
export function SiteNav({
  current = "home",
  routes = DEFAULT_ROUTES,
  sections = [],
  contactHref = "/#say",
  socials = [],
}: {
  current?: string;
  routes?: Route[];
  sections?: Section[];
  contactHref?: string;
  socials?: SocialLink[];
}) {
  const [wide, setWide] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<string | null>(
    sections.length ? sections[0].id : null,
  );
  const panel = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1440px)");
    const on = () => setWide(mq.matches);

    on();
    mq.addEventListener("change", on);

    return () => mq.removeEventListener("change", on);
  }, []);

  React.useEffect(() => {
    if (!sections.length) return;
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    if (!nodes.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.01, 0.25, 0.6] },
    );

    nodes.forEach((n) => io.observe(n));

    return () => io.disconnect();
  }, [sections]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const first = panel.current?.querySelector("a");

    (first as HTMLElement | null)?.focus();

    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const activeLabel = sections.find((s) => s.id === active);

  const dot = (on: boolean): React.CSSProperties => ({
    width: 6,
    height: 6,
    borderRadius: "var(--r-pill)",
    background: on ? "var(--sage)" : "transparent",
    border: on ? "none" : "1px solid var(--line-strong)",
    flex: "0 0 auto",
    transition: "background var(--dur-base) var(--ease-inout)",
  });

  const routeLink = (r: Route, big: boolean) => {
    const style: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: big ? "var(--s-4)" : "var(--s-3)",
      fontFamily: big ? "var(--font-display)" : "var(--font-body)",
      fontWeight: big ? "var(--fw-display-light)" : "var(--fw-body)",
      fontSize: big ? "clamp(1.75rem,7vw,2.5rem)" : "var(--fs-meta)",
      letterSpacing: big ? "var(--tr-section)" : 0,
      lineHeight: 1.25,
      color: r.id === current ? "var(--text-primary)" : "var(--text-meta)",
      textDecoration: "none",
    };

    return (
      <Link
        key={r.id}
        aria-current={r.id === current ? "page" : undefined}
        href={r.href}
        style={style}
        onClick={() => setOpen(false)}
      >
        <span aria-hidden="true" style={dot(r.id === current)} />
        {r.label}
      </Link>
    );
  };

  if (wide) {
    return (
      <nav
        aria-label="Site"
        style={{
          position: "fixed",
          left: "var(--s-8)",
          bottom: "var(--s-10)",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-3)",
          maxWidth: 150,
        }}
      >
        {routes.map((r) => routeLink(r, false))}
        {activeLabel && current === "home" ? (
          <span
            style={{
              paddingLeft: 15,
              fontSize: "var(--fs-micro)",
              color: "var(--sand)",
            }}
          >
            {activeLabel.label}
          </span>
        ) : null}
        <span
          style={{
            height: 1,
            background: "var(--line)",
            margin: "var(--s-2) 0",
          }}
        />
        <a
          href={contactHref}
          style={{ paddingLeft: 15, fontSize: "var(--fs-meta)" }}
        >
          Contact
        </a>
      </nav>
    );
  }

  return (
    <React.Fragment>
      <button
        ref={trigger}
        aria-expanded={open}
        style={{
          position: "fixed",
          top: "var(--s-5)",
          right: "var(--s-5)",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: "var(--s-2)",
          minHeight: 44,
          padding: "10px 18px",
          borderRadius: "var(--r-pill)",
          border: "1px solid var(--line-strong)",
          background: "var(--veil)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--fs-meta)",
          cursor: "pointer",
        }}
        type="button"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true" style={dot(true)} />
        Index
      </button>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 28,
          background: "var(--veil)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity var(--dur-slow) var(--ease-inout)",
        }}
        onClick={() => setOpen(false)}
      />

      <div
        ref={panel}
        aria-hidden={!open}
        aria-label="Site index"
        role="dialog"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(420px, 84vw)",
          boxSizing: "border-box",
          zIndex: 29,
          background: "var(--bg-sunken)",
          borderLeft: "1px solid var(--line)",
          padding: "var(--s-11) var(--s-8) var(--s-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-6)",
          transform: open ? "translateX(0)" : "translateX(102%)",
          transition: "transform var(--dur-slow) var(--ease-settle)",
          visibility: open ? "visible" : "hidden",
          boxShadow: "var(--elev-lift)",
          overflowY: "auto",
        }}
      >
        <button
          style={{
            position: "absolute",
            top: "var(--s-5)",
            right: "var(--s-5)",
            minHeight: 44,
            padding: "10px 18px",
            borderRadius: "var(--r-pill)",
            border: "1px solid var(--line-strong)",
            background: "transparent",
            color: "var(--text-meta)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--fs-meta)",
            cursor: "pointer",
          }}
          type="button"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-5)",
          }}
        >
          {routes.map((r) => routeLink(r, true))}
        </div>
        <span style={{ height: 1, background: "var(--line)" }} />
        <a
          href={contactHref}
          style={{ fontSize: "var(--fs-lede)" }}
          onClick={() => setOpen(false)}
        >
          Contact
        </a>
        {socials.length ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--s-4)",
              marginTop: "auto",
            }}
          >
            {socials.map((s) =>
              isInternalHref(s.href) ? (
                <Link
                  key={s.label}
                  href={s.href}
                  style={{
                    fontSize: "var(--fs-meta)",
                    color: "var(--text-meta)",
                  }}
                >
                  {s.label}
                </Link>
              ) : (
                <a
                  key={s.label}
                  href={s.href}
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "var(--fs-meta)",
                    color: "var(--text-meta)",
                  }}
                  target="_blank"
                >
                  {s.label}
                </a>
              ),
            )}
          </div>
        ) : null}
      </div>
    </React.Fragment>
  );
}
