"use client";

import * as React from "react";

/* Long-form reading column. Owns the article measure (68ch), the heading
   rhythm inside prose, blockquote, list and code treatments. */
export function Prose({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const cls = "prose-" + id;

  return (
    <div className={cls} style={{ maxWidth: "68ch", ...style }}>
      <style>{`
.${cls}{font-family:var(--font-body);font-size:1.0625rem;line-height:1.75;color:var(--text-secondary)}
.${cls} > * + *{margin-top:var(--s-6)}
.${cls} p{max-width:68ch}
.${cls} strong{color:var(--text-primary);font-weight:var(--fw-body-medium)}
.${cls} a{color:var(--sage);text-decoration:none;box-shadow:inset 0 -1px 0 0 currentColor}
.${cls} a:hover{color:var(--text-primary)}
.${cls} h2{font-family:var(--font-display);font-weight:var(--fw-display-regular);font-size:1.75rem;line-height:1.2;letter-spacing:var(--tr-section);color:var(--text-primary);margin-top:var(--s-10)}
.${cls} h3{font-family:var(--font-display);font-weight:var(--fw-display-emph);font-size:1.25rem;line-height:1.3;color:var(--text-primary);margin-top:var(--s-8)}
.${cls} ul,.${cls} ol{padding-left:1.2em;display:flex;flex-direction:column;gap:var(--s-2)}
.${cls} li{padding-left:.2em}
.${cls} li::marker{color:var(--haze-mute)}
.${cls} blockquote{margin:0;padding-left:var(--s-6);border-left:1px solid var(--sand);font-family:var(--font-display);font-weight:var(--fw-display-light);font-size:1.5rem;line-height:1.35;color:var(--text-primary);max-width:44ch}
.${cls} code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;background:var(--bg-surface);padding:.15em .4em;border-radius:var(--r-inline);color:var(--haze)}
.${cls} pre{background:var(--bg-sunken);border:1px solid var(--line);border-radius:var(--r-card);padding:var(--s-6);overflow-x:auto;font-size:.9375rem;line-height:1.6}
.${cls} pre code{background:none;padding:0}
.${cls} hr{border:0;border-top:1px solid var(--line);margin-top:var(--s-10)}
.${cls} figcaption{font-size:var(--fs-micro);color:var(--text-meta);margin-top:var(--s-2)}
      `}</style>
      {children}
    </div>
  );
}
