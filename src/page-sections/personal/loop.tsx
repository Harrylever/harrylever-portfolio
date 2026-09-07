"use client";

import * as React from "react";

import { SectionHeading } from "@/components/design-system/section-heading";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { ME } from "@/data/me";

/* "AI in the loop" — a frequency-ordered list of the tools genuinely in the
   daily loop. The bar is a real signal (every day / sometimes / rarely), not
   a decorative proficiency meter. */
const FREQ: Record<string, number> = {
  "Every day": 1,
  Sometimes: 0.45,
  Rarely: 0.18,
};

export function Loop() {
  const root = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".lp-note-inner", {
          yPercent: 110,
          duration: 0.8,
          ease: "expo.out",
          scrollTrigger: { trigger: ".lp-note", start: "top 88%" },
        });
        gsap.utils.toArray<HTMLElement>(".lp-item").forEach((item) => {
          gsap.from(item.querySelectorAll(".lp-copy > *"), {
            yPercent: 40,
            opacity: 0,
            duration: 0.65,
            ease: "expo.out",
            stagger: 0.05,
            scrollTrigger: { trigger: item, start: "top 88%" },
          });
          gsap.from(item.querySelector(".lp-bar-fill"), {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 0.9,
            ease: "expo.out",
            scrollTrigger: { trigger: item, start: "top 88%" },
          });
        });
      }, root);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      id="loop"
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
        <SectionHeading note="Ordered by how often it is actually open, not by how impressive it sounds.">
          AI in the loop
        </SectionHeading>

        <div
          className="lp-note"
          style={{ overflow: "hidden", marginBottom: "var(--s-10)" }}
        >
          <p
            className="lp-note-inner"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--fw-display-light)",
              fontSize: "clamp(1.25rem,2.4vw,1.75rem)",
              lineHeight: 1.35,
              letterSpacing: "var(--tr-section)",
              color: "var(--text-primary)",
              maxWidth: "34ch",
            }}
          >
            {ME.aiNote}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {ME.ai.map((a) => (
            <div
              key={a.tool}
              className="lp-item"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 180px",
                gap: "var(--s-8)",
                padding: "var(--s-6) 0",
                borderBottom: "1px solid var(--line)",
                alignItems: "start",
              }}
            >
              <div
                className="lp-copy"
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--fw-display-emph)",
                    fontSize: "var(--fs-subtitle)",
                    letterSpacing: "var(--tr-section)",
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  {a.tool}
                </h3>
                <p
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-secondary)",
                    maxWidth: "62ch",
                  }}
                >
                  {a.use}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                  paddingTop: 6,
                }}
              >
                <span
                  aria-hidden="true"
                  className="lp-bar"
                  style={{
                    display: "block",
                    height: 2,
                    background: "var(--line)",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <span
                    className="lp-bar-fill"
                    style={{
                      display: "block",
                      height: "100%",
                      width: (FREQ[a.freq] || 0.2) * 100 + "%",
                      background:
                        a.freq === "Every day"
                          ? "var(--sage)"
                          : "var(--haze-mute)",
                    }}
                  />
                </span>
                <span
                  style={{
                    fontSize: "var(--fs-micro)",
                    color:
                      a.freq === "Every day"
                        ? "var(--sage)"
                        : "var(--text-meta)",
                  }}
                >
                  {a.freq}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: "var(--s-8)",
            fontSize: "var(--fs-meta)",
            color: "var(--text-meta)",
            maxWidth: "66ch",
          }}
        >
          The security work cuts the other way: AIZEN exists because a model
          will happily write you something that runs and is quietly exploitable.
        </p>
      </div>
    </section>
  );
}
