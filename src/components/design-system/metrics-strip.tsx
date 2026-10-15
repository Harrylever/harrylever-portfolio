import type { ProjectMetric } from "@/domain/content/project";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function asOfLabel(asOf: string): string {
  return dateFormat.format(new Date(`${asOf}T00:00:00Z`));
}

export function MetricsStrip({ metrics }: { metrics?: ProjectMetric[] }) {
  if (!metrics?.length) return null;

  return (
    <dl
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--s-6)",
        margin: 0,
      }}
    >
      {metrics.map((metric) => (
        <div
          key={metric.label}
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <dd
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: "var(--fw-display-emph)",
              fontSize: "var(--fs-lede)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {metric.value}
          </dd>
          <dt
            style={{ fontSize: "var(--fs-micro)", color: "var(--text-meta)" }}
          >
            {metric.label}
            <span style={{ display: "block" }}>
              as of {asOfLabel(metric.asOf)}
            </span>
          </dt>
        </div>
      ))}
    </dl>
  );
}
