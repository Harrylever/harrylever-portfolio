"use client";

import * as React from "react";
import Link from "next/link";

export function PostRow({
  title,
  summary,
  date,
  readingTime,
  tag,
  href,
}: {
  title: string;
  summary?: string;
  date: string;
  readingTime?: string;
  tag?: string;
  href: string;
}) {
  const [hover, setHover] = React.useState(false);

  return (
    <Link
      href={href}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto",
        gap: "var(--s-6)",
        alignItems: "start",
        padding: "var(--s-7) 0",
        borderBottom: "1px solid var(--line)",
        textDecoration: "none",
        color: "inherit",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--fw-display-regular)",
            fontSize: "clamp(1.375rem,2.6vw,1.875rem)",
            lineHeight: 1.18,
            letterSpacing: "var(--tr-section)",
            color: hover ? "var(--sand)" : "var(--text-primary)",
            transition: "color var(--dur-base) var(--ease-inout)",
            maxWidth: "34ch",
          }}
        >
          {title}
        </span>
        {summary ? (
          <span
            style={{
              display: "block",
              marginTop: "var(--s-3)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--fs-sm)",
              lineHeight: "var(--lh-body)",
              color: "var(--text-secondary)",
              maxWidth: "62ch",
            }}
          >
            {summary}
          </span>
        ) : null}
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "var(--s-1)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--fs-micro)",
          color: "var(--text-meta)",
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{date}</span>
        {readingTime ? <span>{readingTime}</span> : null}
        {tag ? <span style={{ color: "var(--sand)" }}>{tag}</span> : null}
      </span>
    </Link>
  );
}
