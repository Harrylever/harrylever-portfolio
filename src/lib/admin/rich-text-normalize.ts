import type {
  RichTextBlockNode,
  RichTextDocument,
  RichTextInlineNode,
  RichTextListItemNode,
  RichTextMark,
  RichTextParagraphNode,
  RichTextTextNode,
} from "@/domain/content/rich-text";

import { mediaAssetIdSchema } from "@/domain/content/shared";

/**
 * The Task 2 rich-text contract (src/domain/content/rich-text.ts). The admin
 * editor registers exactly these nodes plus the bold/italic/code/link marks;
 * anything else in editor JSON is dropped before it is saved.
 */
export const editorAllowedNodes = new Set([
  "doc",
  "paragraph",
  "text",
  "hardBreak",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "image",
]);

export const editorAllowedMarks = new Set(["bold", "italic", "code", "link"]);

const safeProtocols = new Set(["http:", "https:", "mailto:"]);

/** Same rule as safeExternalUrlSchema: absolute http, https or mailto only. */
export function isSafeLinkHref(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();

  if (!trimmed) return false;
  try {
    return safeProtocols.has(new URL(trimmed).protocol);
  } catch {
    return false;
  }
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function children(node: Json): unknown[] {
  return Array.isArray(node.content) ? node.content : [];
}

function attrs(node: Json): Json {
  return isObject(node.attrs) ? node.attrs : {};
}

function normalizeMarks(value: unknown): RichTextMark[] {
  if (!Array.isArray(value)) return [];
  const marks: RichTextMark[] = [];

  for (const mark of value) {
    if (!isObject(mark) || typeof mark.type !== "string") continue;
    if (
      mark.type === "bold" ||
      mark.type === "italic" ||
      mark.type === "code"
    ) {
      marks.push({ type: mark.type });
    } else if (mark.type === "link") {
      const { href, target } = attrs(mark);

      if (!isSafeLinkHref(href)) continue;
      marks.push({
        type: "link",
        attrs:
          target === "_blank"
            ? { href: href.trim(), target: "_blank" }
            : { href: href.trim() },
      });
    }
  }

  return marks;
}

function normalizeText(node: Json): RichTextTextNode | null {
  if (typeof node.text !== "string" || node.text.length === 0) return null;
  const marks = normalizeMarks(node.marks);

  return marks.length
    ? { type: "text", text: node.text, marks }
    : { type: "text", text: node.text };
}

function normalizeInline(content: unknown[]): RichTextInlineNode[] {
  const result: RichTextInlineNode[] = [];

  for (const child of content) {
    if (!isObject(child)) continue;
    if (child.type === "hardBreak") result.push({ type: "hardBreak" });
    else if (child.type === "text") {
      const text = normalizeText(child);

      if (text) result.push(text);
    }
  }

  return result;
}

function paragraph(content: unknown[]): RichTextParagraphNode {
  const inline = normalizeInline(content);

  return inline.length
    ? { type: "paragraph", content: inline }
    : { type: "paragraph" };
}

function normalizeListItem(node: Json): RichTextListItemNode | null {
  const content: RichTextListItemNode["content"] = [];

  for (const child of children(node)) {
    if (!isObject(child)) continue;
    if (child.type === "paragraph" || child.type === "heading") {
      content.push(paragraph(children(child)));
    } else if (child.type === "bulletList" || child.type === "orderedList") {
      const list = normalizeBlock(child);

      if (list && (list.type === "bulletList" || list.type === "orderedList")) {
        content.push(list);
      }
    }
  }

  if (!content.length) return null;
  // The schema allows any order, but a list item must open with text.
  if (content[0].type !== "paragraph") content.unshift({ type: "paragraph" });

  return { type: "listItem", content };
}

function normalizeBlock(node: Json): RichTextBlockNode | null {
  switch (node.type) {
    case "paragraph":
      return paragraph(children(node));
    case "heading": {
      const level = Number(attrs(node).level);
      const inline = normalizeInline(children(node));
      const heading = {
        type: "heading" as const,
        attrs: { level: level <= 2 ? (2 as const) : (3 as const) },
      };

      return inline.length ? { ...heading, content: inline } : heading;
    }
    case "bulletList":
    case "orderedList": {
      const items = children(node)
        .filter(isObject)
        .filter((child) => child.type === "listItem")
        .map(normalizeListItem)
        .filter((item): item is RichTextListItemNode => item !== null);

      if (!items.length) return null;
      if (node.type === "bulletList")
        return { type: "bulletList", content: items };
      const start = Number(attrs(node).start);

      return Number.isInteger(start) && start > 1
        ? { type: "orderedList", attrs: { start }, content: items }
        : { type: "orderedList", content: items };
    }
    case "blockquote": {
      const content = children(node)
        .filter(isObject)
        .filter(
          (child) => child.type === "paragraph" || child.type === "heading",
        )
        .map((child) => paragraph(children(child)));

      return content.length ? { type: "blockquote", content } : null;
    }
    case "codeBlock": {
      const text = children(node)
        .filter(isObject)
        .map((child) => (typeof child.text === "string" ? child.text : ""))
        .join("");
      const language = attrs(node).language;
      const block = {
        type: "codeBlock" as const,
        ...(typeof language === "string" && language.trim()
          ? { attrs: { language: language.trim() } }
          : {}),
      };

      return text ? { ...block, content: [{ type: "text", text }] } : block;
    }
    case "image": {
      const parsed = mediaAssetIdSchema.safeParse(attrs(node).mediaAssetId);

      return parsed.success
        ? { type: "image", attrs: { mediaAssetId: parsed.data } }
        : null;
    }
    default:
      return null;
  }
}

/**
 * Converts editor (Tiptap/ProseMirror) JSON into the strict stored document:
 * unknown nodes and marks are dropped, attributes are reduced to the
 * allowlist, unsafe link protocols lose their link and invalid images go.
 */
export function normalizeEditorDocument(value: unknown): RichTextDocument {
  if (!isObject(value) || value.type !== "doc")
    return { type: "doc", content: [] };

  return {
    type: "doc",
    content: children(value)
      .filter(isObject)
      .map(normalizeBlock)
      .filter((node): node is RichTextBlockNode => node !== null),
  };
}

/** Tags whose whole subtree is removed from pasted HTML. */
export const pastedHtmlBlockedTags = [
  "script",
  "style",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "svg",
  "math",
  "video",
  "audio",
  "source",
  "track",
  "canvas",
  "template",
  "noscript",
  "img",
  "picture",
];
