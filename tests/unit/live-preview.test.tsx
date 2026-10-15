import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { LivePreview } from "@/components/design-system/live-preview";
import {
  embedUrl,
  previewScale,
} from "@/components/design-system/live-preview-utils";

describe("embedUrl", () => {
  test("returns the https link only when livePreview is on", () => {
    expect(
      embedUrl({ livePreview: true, externalUrl: "https://karrigo.app" }),
    ).toBe("https://karrigo.app");
    expect(
      embedUrl({ livePreview: false, externalUrl: "https://karrigo.app" }),
    ).toBeNull();
    expect(embedUrl({ externalUrl: "https://karrigo.app" })).toBeNull();
  });

  test("returns null without a link or for non-https links", () => {
    expect(embedUrl({ livePreview: true })).toBeNull();
    expect(embedUrl({ livePreview: true, externalUrl: null })).toBeNull();
    expect(
      embedUrl({ livePreview: true, externalUrl: "http://example.com" }),
    ).toBeNull();
    expect(
      embedUrl({ livePreview: true, externalUrl: "mailto:a@b.co" }),
    ).toBeNull();
  });
});

describe("previewScale", () => {
  test("scales the 1280px desktop viewport to the frame width", () => {
    expect(previewScale(640)).toBe(0.5);
    expect(previewScale(1280)).toBe(1);
  });

  test("never scales up and treats an unmeasured frame as zero", () => {
    expect(previewScale(2000)).toBe(1);
    expect(previewScale(0)).toBe(0);
  });
});

describe("LivePreview server render", () => {
  const props = {
    url: "https://karrigo.app",
    name: "Karrigo",
    aspect: "3 / 2",
  };

  test("renders the fallback and a new-tab link, but no iframe", () => {
    const html = renderToStaticMarkup(
      <LivePreview {...props} openLabel="Open Karrigo in a new tab">
        <span>fallback image</span>
      </LivePreview>,
    );

    expect(html).toContain("fallback image");
    expect(html).toContain('data-live-preview="https://karrigo.app"');
    expect(html).toContain('href="https://karrigo.app"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener");
    expect(html).toContain("Open Karrigo in a new tab");
    expect(html).not.toContain("<iframe");
  });

  test("omits the link when openLabel is null", () => {
    const html = renderToStaticMarkup(
      <LivePreview {...props} openLabel={null}>
        <span>fallback image</span>
      </LivePreview>,
    );

    expect(html).not.toContain("<a ");
  });
});
