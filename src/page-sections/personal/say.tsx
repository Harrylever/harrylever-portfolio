"use client";

import * as React from "react";

import { Button } from "@/components/design-system/button";
import { useMagnetic } from "@/hooks/use-magnetic";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { ME } from "@/data/me";

const LINE =
  "If you're building something odd, or you just want to compare notes — I'd like to hear about it.".split(
    " ",
  );

export function Say() {
  const root = React.useRef<HTMLElement>(null);
  const cta = React.useRef<HTMLSpanElement>(null);

  useMagnetic(cta, 8);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".sy-word", {
          yPercent: 110,
          scaleY: 1.06,
          duration: 0.85,
          ease: "expo.out",
          stagger: 0.05,
          scrollTrigger: { trigger: root.current, start: "top 70%" },
        });
        gsap.from(".sy-act", {
          opacity: 0,
          y: 18,
          duration: 0.7,
          ease: "expo.out",
          scrollTrigger: { trigger: root.current, start: "top 64%" },
        });
      }, root);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      id="say"
      style={{
        background: "var(--bg-sunken)",
        borderTop: "1px solid var(--line)",
        padding: "var(--s-12) 0",
      }}
    >
      <div
        style={{
          maxWidth: "var(--page-max)",
          margin: "0 auto",
          padding: "0 var(--gutter)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--fw-display-light)",
            fontSize: "clamp(1.75rem,3.6vw,2.75rem)",
            lineHeight: 1.18,
            letterSpacing: "var(--tr-section)",
            maxWidth: "30ch",
            margin: "0 0 var(--s-8)",
          }}
        >
          {LINE.map((w, i) => (
            <React.Fragment key={i}>
              <span
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  verticalAlign: "bottom",
                }}
              >
                <span
                  className="sy-word"
                  style={{
                    display: "inline-block",
                    fontWeight:
                      i >= LINE.length - 5
                        ? "var(--fw-display-emph)"
                        : "inherit",
                    color: i >= LINE.length - 5 ? "var(--sand)" : "inherit",
                  }}
                >
                  {w}
                </span>
              </span>{" "}
            </React.Fragment>
          ))}
        </h2>
        <div
          className="sy-act"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--s-4)",
            alignItems: "center",
          }}
        >
          <span ref={cta} style={{ display: "inline-flex" }}>
            <Button
              href="https://wa.link/hemaxw"
              target="_blank"
              variant="solid"
            >
              Message me on WhatsApp
            </Button>
          </span>
          <Button href="mailto:devdean315user@gmail.com" variant="quiet">
            devdean315user@gmail.com
          </Button>
          {process.env.NEXT_PUBLIC_RESUME_URL ? (
            <Button
              href={process.env.NEXT_PUBLIC_RESUME_URL}
              target="_blank"
              variant="quiet"
            >
              Résumé, if you need it
            </Button>
          ) : null}
        </div>
        <p
          style={{
            marginTop: "var(--s-10)",
            fontSize: "var(--fs-meta)",
            color: "var(--text-meta)",
          }}
        >
          {ME.name} · {ME.location}
        </p>
      </div>
    </section>
  );
}
