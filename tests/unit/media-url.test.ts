import { describe, expect, test } from "bun:test";

import { imageSrcSet, optimizedImageUrl } from "@/lib/media-url";

const original =
  "https://res.cloudinary.com/demo/image/upload/v1700000000/portfolio/desk.png";

describe("optimizedImageUrl", () => {
  test("asks Cloudinary for automatic format and quality", () => {
    expect(optimizedImageUrl(original)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1700000000/portfolio/desk.png",
    );
  });

  test("adds a width that never upscales", () => {
    expect(optimizedImageUrl(original, 800)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800,c_limit/v1700000000/portfolio/desk.png",
    );
  });

  test("leaves other hosts, http URLs and already-transformed URLs alone", () => {
    expect(optimizedImageUrl("https://example.com/a.png", 800)).toBe(
      "https://example.com/a.png",
    );
    expect(
      optimizedImageUrl("http://res.cloudinary.com/demo/image/upload/v1/a.png"),
    ).toBe("http://res.cloudinary.com/demo/image/upload/v1/a.png");

    const done = optimizedImageUrl(original, 800);

    expect(optimizedImageUrl(done, 400)).toBe(done);
    expect(
      optimizedImageUrl(
        "https://res.cloudinary.com/demo/image/upload/w_300/v1/a.png",
      ),
    ).toBe("https://res.cloudinary.com/demo/image/upload/w_300/v1/a.png");
  });

  test("leaves a URL without an /image/upload/ segment alone", () => {
    expect(
      optimizedImageUrl("https://res.cloudinary.com/demo/raw/upload/v1/a.pdf"),
    ).toBe("https://res.cloudinary.com/demo/raw/upload/v1/a.pdf");
    expect(optimizedImageUrl("not a url")).toBe("not a url");
  });
});

describe("imageSrcSet", () => {
  test("lists widths below the intrinsic width plus the intrinsic width", () => {
    const set = imageSrcSet(original, 1000)!;

    expect(set.split(", ").map((entry) => entry.split(" ")[1])).toEqual([
      "480w",
      "800w",
      "1000w",
    ]);
    expect(set).toContain("w_480,c_limit");
    expect(set).toContain("w_1000,c_limit");
  });

  test("never offers a width above the largest step", () => {
    const widths = imageSrcSet(original, 6000)!
      .split(", ")
      .map((entry) => entry.split(" ")[1]);

    expect(widths.at(-1)).toBe("2000w");
  });

  test("is undefined for URLs that are not Cloudinary images", () => {
    expect(imageSrcSet("https://example.com/a.png", 1000)).toBeUndefined();
  });
});
