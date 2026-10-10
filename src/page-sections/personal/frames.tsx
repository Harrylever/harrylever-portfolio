import { SectionHeading } from "@/components/design-system/section-heading";
import { Figure } from "@/components/design-system/figure";
import { SkillGroup } from "@/components/design-system/skill-group";
import { ME } from "@/data/me";

export function Frames() {
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
        <SectionHeading note="Abuja, the desk, and the occasional 3am screenshot. Scroll — it moves sideways.">
          Off the screen
        </SectionHeading>
      </div>
      <div className="fr-viewport">
        <div className="fr-track">
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
