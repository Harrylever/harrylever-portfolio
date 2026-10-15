import type { CSSProperties } from "react";
import type { ProjectKind, StatusTone } from "@/domain/content/project";

const kindLabels: Record<ProjectKind, string> = {
  product: "Product",
  client: "Client work",
  experiment: "Exploring",
};

export function kindLabel(kind: ProjectKind): string {
  return kindLabels[kind];
}

/** Live (or unset) keeps the accent colour; paused and ended are muted. */
export function statusToneStyle(tone?: StatusTone): CSSProperties {
  return {
    color:
      tone === "paused" || tone === "ended"
        ? "var(--text-meta)"
        : "var(--sand)",
  };
}
