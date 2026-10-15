import type { PublicHomepage } from "@/server/content/public";

import { SectionHeading } from "@/components/design-system/section-heading";
import { Figure } from "@/components/design-system/figure";
import { SkillGroup } from "@/components/design-system/skill-group";

export function Frames({ section }: { section: PublicHomepage["frames"] }) {
  return (
    <section
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
        <SectionHeading note={section.note}>{section.heading}</SectionHeading>
      </div>
      <div className="fr-viewport">
        <div className="fr-track">
          {section.items.map((item, i) => (
            <div
              key={
                "mediaAssetId" in item
                  ? item.mediaAssetId
                  : item.placeholderSlot
              }
              className="fr-item"
              style={{
                flex: "0 0 auto",
                width: "clamp(220px, 34vw, 380px)",
                marginTop: i % 2 ? "var(--s-9)" : 0,
              }}
            >
              <Figure
                aspect={item.aspectRatio}
                asset={"mediaAssetId" in item ? item.mediaAsset : null}
                caption={item.caption}
                slotId={
                  "placeholderSlot" in item
                    ? item.placeholderSlot
                    : item.mediaAssetId
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Reach({ section }: { section: PublicHomepage["reach"] }) {
  return (
    <section
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
        <SectionHeading note={section.note}>{section.heading}</SectionHeading>
        <div
          className="rc-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--s-9) var(--s-8)",
          }}
        >
          {section.groups.map((group) => (
            <div key={group.label} className="rc-cell">
              <SkillGroup {...group} />
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
            {section.experienceIntro}
          </p>
          <div
            className="wk-list"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {section.experiences.map((experience) => (
              <div
                key={`${experience.company}-${experience.period}`}
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
                  {experience.period}
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
                    {experience.company}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--fs-sm)",
                      color: "var(--sage)",
                      marginLeft: "var(--s-3)",
                    }}
                  >
                    {experience.role}
                  </span>
                </span>
                <span
                  className="wk-stack"
                  style={{
                    fontSize: "var(--fs-micro)",
                    color: "var(--text-meta)",
                  }}
                >
                  {experience.stack.join("  ·  ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
