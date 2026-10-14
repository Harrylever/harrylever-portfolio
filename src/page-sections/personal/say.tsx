import type {
  PublicHomepage,
  PublicSiteProfile,
} from "@/server/content/public";

import * as React from "react";

import { Button } from "@/components/design-system/button";

export function Say({
  profile,
  section,
}: {
  profile: PublicSiteProfile;
  section: PublicHomepage["say"];
}) {
  const words = section.heading.split(" ");

  return (
    <section
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
          {words.map((word, i) => (
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
                      i >= words.length - 5
                        ? "var(--fw-display-emph)"
                        : "inherit",
                    color: i >= words.length - 5 ? "var(--sand)" : "inherit",
                  }}
                >
                  {word}
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
          {section.whatsappUrl ? (
            <span style={{ display: "inline-flex" }}>
              <Button
                href={section.whatsappUrl}
                target="_blank"
                variant="solid"
              >
                Message me on WhatsApp
              </Button>
            </span>
          ) : null}
          <Button href={`mailto:${section.email}`} variant="quiet">
            {section.email}
          </Button>
          {section.resumeUrl ? (
            <Button href={section.resumeUrl} target="_blank" variant="quiet">
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
          {profile.name} · {profile.location}
        </p>
      </div>
    </section>
  );
}
