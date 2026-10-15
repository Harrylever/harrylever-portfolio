import { describe, expect, test } from "bun:test";

import {
  MAX_DIMENSION,
  fitWithin,
  needsCompression,
  webpName,
} from "@/lib/admin/image-compress";

describe("fitWithin", () => {
  test("scales the longest side down to the maximum, keeping the ratio", () => {
    expect(fitWithin(4800, 3200, 2400)).toEqual({ width: 2400, height: 1600 });
    expect(fitWithin(3000, 6000, 2400)).toEqual({ width: 1200, height: 2400 });
  });

  test("never upscales and rounds to whole pixels", () => {
    expect(fitWithin(800, 600, 2400)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(2401, 1000, 2400)).toEqual({ width: 2400, height: 1000 });
  });

  test("never returns a zero side", () => {
    expect(fitWithin(10000, 1, 2400)).toEqual({ width: 2400, height: 1 });
  });
});

describe("needsCompression", () => {
  test("skips small files within the maximum dimension", () => {
    expect(
      needsCompression({ size: 40_000 }, { width: 800, height: 600 }),
    ).toBe(false);
  });

  test("compresses large files or oversized dimensions", () => {
    expect(
      needsCompression({ size: 3_000_000 }, { width: 800, height: 600 }),
    ).toBe(true);
    expect(
      needsCompression(
        { size: 40_000 },
        { width: MAX_DIMENSION + 1, height: 10 },
      ),
    ).toBe(true);
  });
});

describe("webpName", () => {
  test("swaps the extension for .webp", () => {
    expect(webpName("desk photo.PNG")).toBe("desk photo.webp");
    expect(webpName("a.b.jpeg")).toBe("a.b.webp");
    expect(webpName("noext")).toBe("noext.webp");
  });
});
