"use client";

import * as React from "react";

import { SectionHeading } from "@/components/design-system/section-heading";
import { Figure } from "@/components/design-system/figure";
import { SkillGroup } from "@/components/design-system/skill-group";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { ME } from "@/data/me";

export function Frames() {
  const root = React.useRef<HTMLElement>(null);
  const viewport = React.useRef<HTMLDivElement>(null);
  const track = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".fr-item", {
          y: 24,
          opacity: 0,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: root.current, start: "top 82%" },
        });

        const trackEl = track.current;
        const viewportEl = viewport.current;

        if (!trackEl || !viewportEl) return;

        const initialDistance = trackEl.scrollWidth - viewportEl.clientWidth;

        if (initialDistance <= 0) return;

        viewportEl.style.overflow = "hidden";

        gsap.to(trackEl, {
          x: () => -(trackEl.scrollWidth - viewportEl.clientWidth),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => "+=" + (trackEl.scrollWidth - viewportEl.clientWidth),
            scrub: true,
            pin: true,
            invalidateOnRefresh: true,
          },
        });
      }, root);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      id="frames"
      style={{
        borderTop: "1px solid var(--line)",
        padding: "var(--section-y) 0",
      }}
    >
      <div
        style={{
          maxWidth: "var(--page-max)",
          margin: "0 auto",
          padding: "0 var(--gutter)",
          marginBottom: "var(--s-9)",
        }}
      >
        <SectionHeading note="Abuja, the desk, and the occasional 3am screenshot. Scroll — it moves sideways.">
          Off the screen
        </SectionHeading>
      </div>
      <div ref={viewport} className="fr-viewport">
        <div ref={track} className="fr-track">
          {ME.frames.map((f, i) => (
            <div
              key={f.slot}
              className="fr-item"
              style={{
                flex: "0 0 auto",
                width: "clamp(220px, 34vw, 380px)",
                marginTop: i % 2 ? "var(--s-9)" : 0,
              }}
            >
              <Figure
                aspect={f.aspect}
                caption={f.caption}
                placeholder="Drop a photo"
                slotId={f.slot}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Reach() {
  const root = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".rc-cell", {
          yPercent: 60,
          opacity: 0,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: ".rc-grid", start: "top 80%" },
        });
        gsap.from(".wk-row", {
          x: -18,
          opacity: 0,
          duration: 0.7,
          ease: "expo.out",
          stagger: 0.06,
          scrollTrigger: { trigger: ".wk-list", start: "top 84%" },
        });
      }, root);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      id="reach"
      style={{
        borderTop: "1px solid var(--line)",
        padding: "var(--section-y) 0",
      }}
    >
      <div
        style={{
          maxWidth: "var(--page-max)",
          margin: "0 auto",
          padding: "0 var(--gutter)",
        }}
      >
        <SectionHeading note="Grouped by how often I actually open it.">
          What I reach for
        </SectionHeading>
        <div
          className="rc-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--s-9) var(--s-8)",
          }}
        >
          {ME.reach.map((g) => (
            <div key={g.label} className="rc-cell">
              <SkillGroup {...g} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: "var(--s-11)" }}>
          <p
            style={{
              fontSize: "var(--fs-meta)",
              color: "var(--text-meta)",
              marginBottom: "var(--s-6)",
              maxWidth: "62ch",
            }}
          >
            I have also done this for other people — four years of it, if the
            résumé is the thing you came for.
          </p>
          <div
            className="wk-list"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {ME.worked.map((w) => (
              <div
                key={w.company}
                className="wk-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px minmax(0,1fr) auto",
                  gap: "var(--s-6)",
                  padding: "var(--s-4) 0",
                  borderBottom: "1px solid var(--line)",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--fs-meta)",
                    color: "var(--text-meta)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {w.period}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: "var(--fw-display-emph)",
                      fontSize: "var(--fs-body)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {w.company}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--fs-sm)",
                      color: "var(--sage)",
                      marginLeft: "var(--s-3)",
                    }}
                  >
                    {w.role}
                  </span>
                </span>
                <span
                  className="wk-stack"
                  style={{
                    fontSize: "var(--fs-micro)",
                    color: "var(--text-meta)",
                  }}
                >
                  {w.stack.join("  ·  ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
