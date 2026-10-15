import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Intro } from "@/page-sections/personal/intro";

const profile = {
  name: "Dean Ukanah",
  location: "Abuja, Nigeria",
  tagline: "t",
  description: "d",
  email: "hi@example.com",
  githubUsername: "harrylever",
  socialLinks: [],
  publishedAt: new Date("2026-10-15T00:00:00Z"),
};

function render(statement: { text: string; emphasis?: boolean }[]) {
  return renderToStaticMarkup(
    <Intro
      profile={profile}
      section={{
        type: "intro",
        statement,
        lede: "Lede",
        portraitAsset: null,
      }}
    />,
  );
}

describe("Intro headline", () => {
  test("splits each fragment into words so the lines wrap across fragments", () => {
    const html = render([
      { text: "I speak to the people" },
      { text: "then build it.", emphasis: true },
    ]);
    const words = html.match(/class="in-word"/g) ?? [];

    expect(words).toHaveLength(8);
    expect(html).toContain(">people</span>");
    expect(html).toContain(">build</span>");
  });

  test("only the emphasised fragment's words are emphasised", () => {
    const html = render([
      { text: "plain words" },
      { text: "bold words", emphasis: true },
    ]);
    const emphasised = html.match(/color:var\(--sand\)/g) ?? [];

    expect(emphasised).toHaveLength(2);
  });

  test("ignores extra spaces inside a fragment", () => {
    const html = render([{ text: "  one   two " }]);

    expect(html.match(/class="in-word"/g)).toHaveLength(2);
  });
});
