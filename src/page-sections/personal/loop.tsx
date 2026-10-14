import type { PublicHomepage } from "@/server/content/public";

import { SectionHeading } from "@/components/design-system/section-heading";

/* "AI in the loop" — a frequency-ordered list of the tools genuinely in the
   daily loop. The bar is a real signal (every day / sometimes / rarely), not
   a decorative proficiency meter. */
const FREQ: Record<string, number> = {
  "Every day": 1,
  Sometimes: 0.45,
  Rarely: 0.18,
};

export function Loop({ section }: { section: PublicHomepage["loop"] }) {
  return (
    <section
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
        <SectionHeading note={section.note}>{section.heading}</SectionHeading>

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
            {section.intro}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {section.items.map((item) => (
            <div
              key={item.tool}
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
                  {item.tool}
                </h3>
                <p
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-secondary)",
                    maxWidth: "62ch",
                  }}
                >
                  {item.use}
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
                      width: (FREQ[item.frequency] || 0.2) * 100 + "%",
                      background:
                        item.frequency === "Every day"
                          ? "var(--sage)"
                          : "var(--haze-mute)",
                    }}
                  />
                </span>
                <span
                  style={{
                    fontSize: "var(--fs-micro)",
                    color:
                      item.frequency === "Every day"
                        ? "var(--sage)"
                        : "var(--text-meta)",
                  }}
                >
                  {item.frequency}
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
          {section.footer}
        </p>
      </div>
    </section>
  );
}
