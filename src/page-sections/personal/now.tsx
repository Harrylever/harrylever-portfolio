import type { PublicHomepage } from "@/server/content/public";

import { SectionHeading } from "@/components/design-system/section-heading";

export function Now({ section }: { section: PublicHomepage["now"] }) {
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
        <SectionHeading note={section.note}>{section.heading}</SectionHeading>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {section.items.map((item) => (
            <div
              key={item.label}
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
                {item.label}
              </span>
              <p
                className="now-body"
                style={{
                  fontSize: "var(--fs-sm)",
                  color: "var(--text-primary)",
                  maxWidth: "66ch",
                }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
