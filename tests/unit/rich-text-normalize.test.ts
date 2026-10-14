import { describe, expect, test } from "bun:test";

import { richTextSchema } from "@/domain/content/rich-text";
import {
  editorAllowedNodes,
  isSafeLinkHref,
  normalizeEditorDocument,
} from "@/lib/admin/rich-text-normalize";
import { createId } from "@/server/db/id";

const assetId = createId();

describe("normalizeEditorDocument", () => {
  test("keeps the Task 2 node set and strips Tiptap-only attributes", () => {
    const result = normalizeEditorDocument({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, textAlign: null },
          content: [{ type: "text", text: "Heading" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "linked",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://example.com",
                    target: "_blank",
                    rel: "noopener noreferrer nofollow",
                    class: null,
                  },
                },
                { type: "bold" },
              ],
            },
            { type: "hardBreak" },
          ],
        },
        {
          type: "orderedList",
          attrs: { start: 1, type: null },
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "a" }] },
              ],
            },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: null },
          content: [{ type: "text", text: "const x = 1;" }],
        },
        { type: "image", attrs: { mediaAssetId: assetId, src: "x" } },
      ],
    });

    expect(richTextSchema.safeParse(result).success).toBe(true);
    expect(result.content[0]).toEqual({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Heading" }],
    });
    expect(result.content[1]).toEqual({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "linked",
          marks: [
            {
              type: "link",
              attrs: { href: "https://example.com", target: "_blank" },
            },
            { type: "bold" },
          ],
        },
        { type: "hardBreak" },
      ],
    });
    expect(result.content[2]).toEqual({
      type: "orderedList",
      content: [
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "a" }] },
          ],
        },
      ],
    });
    expect(result.content[4]).toEqual({
      type: "image",
      attrs: { mediaAssetId: assetId },
    });
  });

  test("drops executable or unknown nodes and unsafe links", () => {
    const result = normalizeEditorDocument({
      type: "doc",
      content: [
        { type: "iframe", attrs: { src: "https://evil.example" } },
        { type: "script", content: [{ type: "text", text: "alert(1)" }] },
        { type: "horizontalRule" },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "bad link",
              marks: [
                { type: "link", attrs: { href: "javascript:alert(1)" } },
                { type: "strike" },
                { type: "underline" },
              ],
            },
            {
              type: "text",
              text: " data",
              marks: [
                {
                  type: "link",
                  attrs: { href: "data:text/html,<script>1</script>" },
                },
              ],
            },
          ],
        },
        { type: "image", attrs: { src: "https://evil.example/x.png" } },
        { type: "image", attrs: { mediaAssetId: "not a cuid" } },
      ],
    });

    expect(richTextSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bad link" },
            { type: "text", text: " data" },
          ],
        },
      ],
    });
  });

  test("coerces headings and nested content into the strict schema", () => {
    const result = normalizeEditorDocument({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "h1" }],
        },
        {
          type: "heading",
          attrs: { level: 5 },
          content: [{ type: "text", text: "h5" }],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "q" }],
            },
            { type: "codeBlock", content: [{ type: "text", text: "x" }] },
          ],
        },
        { type: "bulletList", content: [] },
        { type: "listItem", content: [] },
      ],
    });

    expect(richTextSchema.safeParse(result).success).toBe(true);
    expect(result.content).toEqual([
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "h1" }],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "h5" }],
      },
      {
        type: "blockquote",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "q" }] },
        ],
      },
    ]);
  });

  test("returns an empty document for garbage input", () => {
    expect(normalizeEditorDocument(null)).toEqual({ type: "doc", content: [] });
    expect(
      normalizeEditorDocument({ type: "html", content: "<p>x</p>" }),
    ).toEqual({
      type: "doc",
      content: [],
    });
  });

  test("exposes only the Task 2 node names", () => {
    expect(Array.from(editorAllowedNodes).sort()).toEqual(
      [
        "blockquote",
        "bulletList",
        "codeBlock",
        "doc",
        "hardBreak",
        "heading",
        "image",
        "listItem",
        "orderedList",
        "paragraph",
        "text",
      ].sort(),
    );
  });
});

describe("isSafeLinkHref", () => {
  test("allows http, https and mailto only", () => {
    expect(isSafeLinkHref("https://example.com")).toBe(true);
    expect(isSafeLinkHref("http://example.com/a?b=1")).toBe(true);
    expect(isSafeLinkHref("mailto:me@example.com")).toBe(true);
    expect(isSafeLinkHref("javascript:alert(1)")).toBe(false);
    expect(isSafeLinkHref(" JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeLinkHref("data:text/html,x")).toBe(false);
    expect(isSafeLinkHref("vbscript:x")).toBe(false);
    expect(isSafeLinkHref("/relative")).toBe(false);
    expect(isSafeLinkHref("")).toBe(false);
  });
});
