import { describe, expect, test } from "bun:test";

import { canEmbed, frameBlocked } from "@/server/content/embeddable";

const own = ["https://www.deanukanah.dev", "https://deanukanah.dev"];
const h = (init: Record<string, string>) => new Headers(init);

describe("frameBlocked", () => {
  test("blocks X-Frame-Options DENY and SAMEORIGIN", () => {
    expect(frameBlocked(h({ "x-frame-options": "DENY" }), own)).toBe(true);
    expect(frameBlocked(h({ "x-frame-options": "sameorigin" }), own)).toBe(
      true,
    );
  });

  test("allows a site with no framing headers", () => {
    expect(frameBlocked(h({}), own)).toBe(false);
    expect(
      frameBlocked(h({ "content-security-policy": "default-src 'self'" }), own),
    ).toBe(false);
  });

  test("allows frame-ancestors that lists the portfolio or a wildcard", () => {
    expect(
      frameBlocked(
        h({
          "content-security-policy":
            "frame-ancestors 'self' https://www.deanukanah.dev",
        }),
        own,
      ),
    ).toBe(false);
    expect(
      frameBlocked(h({ "content-security-policy": "frame-ancestors *" }), own),
    ).toBe(false);
  });

  test("blocks frame-ancestors 'none', 'self' and other origins", () => {
    for (const value of [
      "frame-ancestors 'none'",
      "frame-ancestors 'self'",
      "frame-ancestors https://example.com",
    ]) {
      expect(frameBlocked(h({ "content-security-policy": value }), own)).toBe(
        true,
      );
    }
  });

  test("frame-ancestors overrides X-Frame-Options when both are present", () => {
    expect(
      frameBlocked(
        h({
          "x-frame-options": "DENY",
          "content-security-policy": "frame-ancestors https://deanukanah.dev",
        }),
        own,
      ),
    ).toBe(false);
  });
});

describe("canEmbed", () => {
  test("is true when the response allows framing", async () => {
    const fetcher = async () => new Response("", { headers: {} });

    expect(await canEmbed("https://karrigo.app", { fetcher, own })).toBe(true);
  });

  test("is false when the site blocks framing", async () => {
    const fetcher = async () =>
      new Response("", { headers: { "x-frame-options": "DENY" } });

    expect(await canEmbed("https://sheltahomes.com", { fetcher, own })).toBe(
      false,
    );
  });

  test("is false when the request fails or answers with an error status", async () => {
    const failing = async () => {
      throw new Error("offline");
    };
    const notFound = async () => new Response("", { status: 404 });

    expect(await canEmbed("https://x.example", { fetcher: failing, own })).toBe(
      false,
    );
    expect(
      await canEmbed("https://x.example", { fetcher: notFound, own }),
    ).toBe(false);
  });
});
