import { SectionHeading } from "@/components/design-system/section-heading";
import { ME } from "@/data/me";

export function Now() {
  return (
    <section
      id="now"
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
        <SectionHeading note="Updated whenever it stops being true.">
          Right now
        </SectionHeading>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ME.now.map((n) => (
            <div
              key={n.label}
              className="now-item"
              style={{
                display: "grid",
                gridTemplateColumns: "150px minmax(0,1fr)",
                gap: "var(--s-8)",
                padding: "var(--s-6) 0",
                borderBottom: "1px solid var(--line)",
                alignItems: "baseline",
              }}
            >
              <span
                className="now-label"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--fw-display-emph)",
                  fontSize: "var(--fs-body)",
                  color: "var(--sand)",
                }}
              >
                {n.label}
              </span>
              <p
                className="now-body"
                style={{
                  fontSize: "var(--fs-sm)",
                  color: "var(--text-primary)",
                  maxWidth: "66ch",
                }}
              >
                {n.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
