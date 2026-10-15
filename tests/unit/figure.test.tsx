import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Figure } from "@/components/design-system/figure";

const asset = {
  secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/portfolio/a.png",
  altText: "A desk",
  width: 1600,
  height: 900,
};

describe("Figure images", () => {
  test("requests an automatic format and quality, with a responsive srcset", () => {
    const html = renderToStaticMarkup(
      <Figure
        asset={asset}
        slotId="s"
        sizes="(min-width: 1024px) 560px, 100vw"
      />,
    );

    expect(html).toContain("f_auto,q_auto,w_1200,c_limit");
    expect(html).toContain("srcSet=");
    expect(html).toContain("w_480,c_limit");
    expect(html).toContain("w_1600,c_limit");
    expect(html).toContain("(min-width: 1024px) 560px, 100vw");
    expect(html).toContain('width="1600"');
    expect(html).toContain('loading="lazy"');
  });

  test("leaves an image that is not on Cloudinary exactly as it is", () => {
    const html = renderToStaticMarkup(
      <Figure
        asset={{ ...asset, secureUrl: "https://example.com/a.png" }}
        slotId="s"
      />,
    );

    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).not.toContain("srcSet=");
  });
});
