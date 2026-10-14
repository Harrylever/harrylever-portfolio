import type {
  PublicHomepage,
  PublicSiteProfile,
} from "@/server/content/public";

import * as React from "react";

import { Button } from "@/components/design-system/button";
import { Figure } from "@/components/design-system/figure";

export function Intro({
  profile,
  section,
}: {
  profile: PublicSiteProfile;
  section: PublicHomepage["intro"];
}) {
  return (
    <header
      id="top"
      style={{
        maxWidth: "var(--page-max)",
        margin: "0 auto",
        padding: "var(--s-12) var(--gutter) var(--s-11)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--s-4)",
          marginBottom: "var(--s-9)",
        }}
      >
        <span
          style={{
            fontSize: "var(--fs-meta)",
            color: "var(--text-meta)",
            whiteSpace: "nowrap",
          }}
        >
          {profile.name}
        </span>
        <span
          className="in-rule"
          style={{ height: 1, background: "var(--line)", flex: 1 }}
        />
        <span
          style={{
            fontSize: "var(--fs-meta)",
            color: "var(--text-meta)",
            whiteSpace: "nowrap",
          }}
        >
          {profile.location}
        </span>
      </div>

      <div className="in-grid">
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--fw-display-light)",
              fontSize: "clamp(2.5rem,6.4vw,5.25rem)",
              lineHeight: "var(--lh-display)",
              letterSpacing: "var(--tr-display)",
              maxWidth: "20ch",
              margin: "0 0 var(--s-8)",
            }}
          >
            {section.statement.map((part, i) => (
              <React.Fragment key={i}>
                <span
                  style={{
                    display: "inline-block",
                    overflow: "hidden",
                    verticalAlign: "bottom",
                  }}
                >
                  <span
                    className="in-word"
                    style={{
                      display: "inline-block",
                      fontWeight: part.emphasis
                        ? "var(--fw-display-emph)"
                        : "inherit",
                      color: part.emphasis ? "var(--sand)" : "inherit",
                    }}
                  >
                    {part.text}
                  </span>
                </span>{" "}
              </React.Fragment>
            ))}
          </h1>

          <div style={{ overflow: "hidden", marginBottom: "var(--s-9)" }}>
            <p
              className="in-lede-inner"
              style={{
                fontSize: "var(--fs-lede)",
                color: "var(--text-secondary)",
                maxWidth: "var(--measure-lede)",
              }}
            >
              {section.lede}
            </p>
          </div>

          <div
            className="in-act"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--s-3)",
              alignItems: "center",
            }}
          >
            <span style={{ display: "inline-flex" }}>
              <Button href="#say" variant="solid">
                Say hello
              </Button>
            </span>
            {profile.socialLinks.map((link) => (
              <Button
                key={link.label}
                href={link.href}
                target="_blank"
                variant="outline"
              >
                {link.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="in-portrait">
          <Figure
            aspect={section.portraitPlaceholder?.aspectRatio ?? "4 / 5"}
            asset={section.portraitAsset}
            caption={
              section.portraitAsset?.caption ??
              section.portraitPlaceholder?.caption
            }
            placeholder="Drop a portrait"
            slotId={section.portraitPlaceholder?.slotId ?? "intro-portrait"}
          />
        </div>
      </div>
    </header>
  );
}
