"use client";

import * as React from "react";

import { Button } from "@/components/design-system/button";
import { Figure } from "@/components/design-system/figure";
import { useMagnetic } from "@/hooks/use-magnetic";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { ME } from "@/data/me";

export function Intro() {
  const root = React.useRef<HTMLElement>(null);
  const cta = React.useRef<HTMLSpanElement>(null);

  useMagnetic(cta);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.from(".in-rule", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.7,
      })
        .from(
          ".in-word",
          { yPercent: 110, scaleY: 1.06, duration: 0.85, stagger: 0.05 },
          0.1,
        )
        .from(
          ".in-portrait",
          { yPercent: 8, opacity: 0, duration: 1, ease: "power3.out" },
          0.35,
        )
        .from(".in-lede-inner", { yPercent: 110, duration: 0.8 }, "-=0.6")
        .from(
          ".in-act > *",
          { yPercent: 120, opacity: 0, duration: 0.7, stagger: 0.06 },
          "-=0.5",
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <header
      ref={root}
      id="top"
      style={{
        maxWidth: "var(--page-max)",
        margin: "0 auto",
        padding: "var(--s-12) var(--gutter) var(--s-11)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--s-4)",
          marginBottom: "var(--s-9)",
        }}
      >
        <span
          style={{
            fontSize: "var(--fs-meta)",
            color: "var(--text-meta)",
            whiteSpace: "nowrap",
          }}
        >
          {ME.name}
        </span>
        <span
          className="in-rule"
          style={{ height: 1, background: "var(--line)", flex: 1 }}
        />
        <span
          style={{
            fontSize: "var(--fs-meta)",
            color: "var(--text-meta)",
            whiteSpace: "nowrap",
          }}
        >
          {ME.location}
        </span>
      </div>

      <div className="in-grid">
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--fw-display-light)",
              fontSize: "clamp(2.5rem,6.4vw,5.25rem)",
              lineHeight: "var(--lh-display)",
              letterSpacing: "var(--tr-display)",
              maxWidth: "20ch",
              margin: "0 0 var(--s-8)",
            }}
          >
            {ME.intro.map((t, i) => (
              <React.Fragment key={i}>
                <span
                  style={{
                    display: "inline-block",
                    overflow: "hidden",
                    verticalAlign: "bottom",
                  }}
                >
                  <span
                    className="in-word"
                    style={{
                      display: "inline-block",
                      fontWeight: t.e ? "var(--fw-display-emph)" : "inherit",
                      color: t.e ? "var(--sand)" : "inherit",
                    }}
                  >
                    {t.w}
                  </span>
                </span>{" "}
              </React.Fragment>
            ))}
          </h1>

          <div style={{ overflow: "hidden", marginBottom: "var(--s-9)" }}>
            <p
              className="in-lede-inner"
              style={{
                fontSize: "var(--fs-lede)",
                color: "var(--text-secondary)",
                maxWidth: "var(--measure-lede)",
              }}
            >
              {ME.lede}
            </p>
          </div>

          <div
            className="in-act"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--s-3)",
              alignItems: "center",
            }}
          >
            <span ref={cta} style={{ display: "inline-flex" }}>
              <Button href="#say" variant="solid">
                Say hello
              </Button>
            </span>
            {ME.links.map((l) => (
              <Button
                key={l.label}
                href={l.href}
                target="_blank"
                variant="outline"
              >
                {l.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="in-portrait">
          <Figure
            aspect="4 / 5"
            caption="A photo of you goes here — drag one in."
            placeholder="Drop a portrait"
            slotId="intro-portrait"
          />
        </div>
      </div>
    </header>
  );
}
