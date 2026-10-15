import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  kindLabel,
  statusToneStyle,
} from "@/page-sections/projects/project-meta";
import { Say } from "@/page-sections/personal/say";

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
const base = {
  type: "say" as const,
  heading: "Talk to me",
  email: "hi@example.com",
};

describe("public rendering of the repositioning fields", () => {
  test("Say renders availability and investor note when present", () => {
    const html = renderToStaticMarkup(
      <Say
        profile={profile}
        section={{
          ...base,
          availability: "Open to remote contract work",
          investorNote: "Happy to talk about Shelta",
        }}
      />,
    );

    expect(html).toContain("Open to remote contract work");
    expect(html).toContain("Happy to talk about Shelta");
  });

  test("the resumeUrl prop overrides the content field, which is the fallback", () => {
    const withField = { ...base, resumeUrl: "https://cms.example/cv" };
    const fromEnv = renderToStaticMarkup(
      <Say
        profile={profile}
        resumeUrl="https://env.example/cv"
        section={withField}
      />,
    );
    const fallback = renderToStaticMarkup(
      <Say profile={profile} section={withField} />,
    );
    const none = renderToStaticMarkup(<Say profile={profile} section={base} />);

    expect(fromEnv).toContain('href="https://env.example/cv"');
    expect(fromEnv).not.toContain("cms.example");
    expect(fallback).toContain('href="https://cms.example/cv"');
    expect(none).not.toContain("sumé");
  });

  test("Say renders neither line when both are absent", () => {
    const html = renderToStaticMarkup(<Say profile={profile} section={base} />);

    expect(html).not.toContain("Open to");
    expect(html).not.toContain("investor");
  });

  test("statusToneStyle separates paused and ended from live, and unset is live", () => {
    expect(statusToneStyle("paused")).not.toEqual(statusToneStyle("live"));
    expect(statusToneStyle("ended")).toEqual(statusToneStyle("paused"));
    expect(statusToneStyle(undefined)).toEqual(statusToneStyle("live"));
  });

  test("kindLabel names every kind", () => {
    expect(kindLabel("product")).toBe("Product");
    expect(kindLabel("client")).toBe("Client work");
    expect(kindLabel("experiment")).toBe("Exploring");
  });
});
