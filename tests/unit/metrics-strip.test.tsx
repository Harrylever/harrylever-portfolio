import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MetricsStrip } from "@/components/design-system/metrics-strip";

describe("MetricsStrip", () => {
  test("renders nothing for undefined and for an empty list", () => {
    expect(renderToStaticMarkup(<MetricsStrip metrics={undefined} />)).toBe("");
    expect(renderToStaticMarkup(<MetricsStrip metrics={[]} />)).toBe("");
  });

  test("renders value, label and a formatted as-of date", () => {
    const html = renderToStaticMarkup(
      <MetricsStrip
        metrics={[
          { label: "Registered users", value: "227", asOf: "2026-10-15" },
        ]}
      />,
    );

    expect(html).toContain("227");
    expect(html).toContain("Registered users");
    expect(html).toContain("15 Oct 2026");
  });
});
