import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { RichText } from "@/components/content/rich-text";
import { deriveReadingTime, richTextSchema } from "@/domain/content/rich-text";
import { createId } from "@/server/db/id";

const mediaAssetId = createId();

const validDocument = {
  type: "doc" as const,
  content: [
    {
      type: "heading" as const,
      attrs: { level: 2 as const },
      content: [{ type: "text" as const, text: "A safe case study" }],
    },
    {
      type: "paragraph" as const,
      content: [
        { type: "text" as const, text: "Bold", marks: [{ type: "bold" }] },
        { type: "text" as const, text: " and " },
        {
          type: "text" as const,
          text: "linked",
          marks: [
            {
              type: "link" as const,
              attrs: { href: "https://example.com", target: "_blank" as const },
            },
          ],
        },
        { type: "hardBreak" as const },
        { type: "text" as const, text: "<script>alert('nope')</script>" },
      ],
    },
    {
      type: "bulletList" as const,
      content: [
        {
          type: "listItem" as const,
          content: [
            {
              type: "paragraph" as const,
              content: [{ type: "text" as const, text: "One item" }],
            },
          ],
        },
      ],
    },
    {
      type: "orderedList" as const,
      attrs: { start: 2 },
      content: [
        {
          type: "listItem" as const,
          content: [
            {
              type: "paragraph" as const,
              content: [{ type: "text" as const, text: "Second item" }],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote" as const,
      content: [
        {
          type: "paragraph" as const,
          content: [{ type: "text" as const, text: "Trust, then verify." }],
        },
      ],
    },
    {
      type: "codeBlock" as const,
      attrs: { language: "typescript" },
      content: [
        {
          type: "text" as const,
          text: "const safe = true;",
          marks: [{ type: "code" }],
        },
      ],
    },
    { type: "image" as const, attrs: { mediaAssetId } },
  ],
};

describe("rich text", () => {
  test("accepts the constrained Tiptap node and mark set", () => {
    expect(richTextSchema.safeParse(validDocument).success).toBe(true);

    for (const href of [
      "http://example.com",
      "https://example.com",
      "mailto:hello@example.com",
    ]) {
      const document = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "link",
                marks: [{ type: "link", attrs: { href } }],
              },
            ],
          },
        ],
      };

      expect(richTextSchema.safeParse(document).success).toBe(true);
    }
  });

  test("rejects nodes and attributes outside the editor allowlist", () => {
    const invalidDocuments = [
      {
        type: "doc",
        content: [{ type: "heading", attrs: { level: 1 }, content: [] }],
      },
      {
        type: "doc",
        content: [{ type: "iframe", attrs: { src: "https://example.com" } }],
      },
      { type: "doc", content: [{ type: "script", content: [] }] },
      {
        type: "doc",
        content: [
          { type: "image", attrs: { src: "https://example.com/image.jpg" } },
        ],
      },
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "bad",
                marks: [
                  { type: "link", attrs: { href: "javascript:alert(1)" } },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "bad",
                marks: [
                  { type: "link", attrs: { href: "data:text/html,boom" } },
                ],
              },
            ],
          },
        ],
      },
    ];

    for (const document of invalidDocuments) {
      expect(richTextSchema.safeParse(document).success).toBe(false);
    }
  });

  test("renders validated JSON without executable HTML", () => {
    const document = richTextSchema.parse(validDocument);
    const html = renderToStaticMarkup(
      <RichText
        document={document}
        media={{
          [mediaAssetId]: {
            secureUrl:
              "https://res.cloudinary.com/demo/image/upload/v1/aizen-cover.jpg",
            altText: "AIZEN report screen",
            width: 1600,
            height: 900,
          },
        }}
      />,
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).toContain(
      "&lt;script&gt;alert(&#x27;nope&#x27;)&lt;/script&gt;",
    );
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("AIZEN report screen");
  });

  test("derives reading time from text content at 200 words per minute", () => {
    const words = Array.from(
      { length: 201 },
      (_, index) => `word${index}`,
    ).join(" ");
    const document = richTextSchema.parse({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: words }] },
      ],
    });

    expect(deriveReadingTime(document)).toBe("2 min");
    expect(deriveReadingTime({ type: "doc", content: [] })).toBe("1 min");
  });
});
