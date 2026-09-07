"use client";

import * as React from "react";

import { SectionHeading } from "@/components/design-system/section-heading";
import { Figure } from "@/components/design-system/figure";
import { Tag } from "@/components/design-system/tag";
import { Button } from "@/components/design-system/button";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { ME } from "@/data/me";

export function Built() {
  const root = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".bt-item").forEach((item) => {
          const flip = item.classList.contains("bt-flip");

          gsap.from(item.querySelector(".bt-shot"), {
            x: flip ? 40 : -40,
            opacity: 0,
            duration: 0.9,
            ease: "expo.out",
            scrollTrigger: { trigger: item, start: "top 82%" },
          });
          gsap.from(item.querySelectorAll(".bt-copy > *"), {
            yPercent: 40,
            opacity: 0,
            duration: 0.7,
            ease: "expo.out",
            stagger: 0.06,
            scrollTrigger: { trigger: item, start: "top 80%" },
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
      id="built"
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
        <SectionHeading note="Some are live, some are half-finished. Both count.">
          Things I&apos;ve built
        </SectionHeading>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-11)",
          }}
        >
          {ME.builds.map((b, i) => (
            <article
              key={b.name}
              className={"bt-item" + (i % 2 ? " bt-flip" : "")}
              style={{
                display: "grid",
                gap: "var(--s-9)",
                alignItems: "center",
              }}
            >
              <div
                className="bt-shot"
                style={{ order: i % 2 ? 2 : 1, minWidth: 0 }}
              >
                <Figure
                  aspect={b.aspect}
                  placeholder={"Drop a " + b.name + " screenshot"}
                  slotId={b.slot}
                />
              </div>
              <div
                className="bt-copy"
                style={{
                  order: i % 2 ? 1 : 2,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-4)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--fw-display-emph)",
                    fontSize: "clamp(1.5rem,3vw,2.125rem)",
                    letterSpacing: "var(--tr-title)",
                    lineHeight: 1.15,
                    margin: 0,
                  }}
                >
                  {b.name}
                </h3>
                <p
                  style={{
                    fontSize: "var(--fs-lede)",
                    color: "var(--text-primary)",
                    maxWidth: "44ch",
                  }}
                >
                  {b.hook}
                </p>
                <p
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-secondary)",
                    maxWidth: "56ch",
                  }}
                >
                  {b.story}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--s-2)",
                  }}
                >
                  {b.stack.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--s-4)",
                    fontSize: "var(--fs-micro)",
                  }}
                >
                  <span style={{ color: "var(--sand)" }}>{b.status}</span>
                  {b.href ? (
                    <a
                      href={b.href}
                      rel="noopener noreferrer"
                      style={{ boxShadow: "inset 0 -1px 0 0 currentColor" }}
                      target="_blank"
                    >
                      {b.href.replace(/^https?:\/\//, "")}
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
        <div style={{ marginTop: "var(--s-10)" }}>
          <Button href="/projects" variant="outline">
            Read the full write-ups
          </Button>
        </div>
      </div>
    </section>
  );
}
