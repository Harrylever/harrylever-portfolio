import { describe, expect, test } from "bun:test";

import { calculateScrollProgress } from "@/lib/scroll-progress";

describe("calculateScrollProgress", () => {
  test("returns a clamped reading position for the scrollable document", () => {
    expect(calculateScrollProgress(0, 2000, 1000)).toBe(0);
    expect(calculateScrollProgress(500, 2000, 1000)).toBe(0.5);
    expect(calculateScrollProgress(1200, 2000, 1000)).toBe(1);
  });

  test("returns zero when the document does not scroll", () => {
    expect(calculateScrollProgress(0, 800, 1000)).toBe(0);
  });
});
