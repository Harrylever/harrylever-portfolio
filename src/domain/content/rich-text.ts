import { z } from "zod";

import {
  mediaAssetIdSchema,
  nonEmptyTextSchema,
  safeExternalUrlSchema,
} from "@/domain/content/shared";

export type RichTextMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "code" }
  | {
      type: "link";
      attrs: { href: string; target?: "_blank" };
    };

export type RichTextTextNode = {
  type: "text";
  text: string;
  marks?: RichTextMark[];
};

export type RichTextHardBreakNode = { type: "hardBreak" };
export type RichTextInlineNode = RichTextTextNode | RichTextHardBreakNode;

export type RichTextParagraphNode = {
  type: "paragraph";
  content?: RichTextInlineNode[];
};

export type RichTextHeadingNode = {
  type: "heading";
  attrs: { level: 2 | 3 };
  content?: RichTextInlineNode[];
};

export type RichTextListItemNode = {
  type: "listItem";
  content: Array<
    RichTextParagraphNode | RichTextBulletListNode | RichTextOrderedListNode
  >;
};

export type RichTextBulletListNode = {
  type: "bulletList";
  content: RichTextListItemNode[];
};

export type RichTextOrderedListNode = {
  type: "orderedList";
  attrs?: { start: number };
  content: RichTextListItemNode[];
};

export type RichTextBlockquoteNode = {
  type: "blockquote";
  content: RichTextParagraphNode[];
};

export type RichTextCodeBlockNode = {
  type: "codeBlock";
  attrs?: { language?: string | null };
  content?: RichTextTextNode[];
};

export type RichTextImageNode = {
  type: "image";
  attrs: { mediaAssetId: string };
};

export type RichTextBlockNode =
  | RichTextParagraphNode
  | RichTextHeadingNode
  | RichTextBulletListNode
  | RichTextOrderedListNode
  | RichTextBlockquoteNode
  | RichTextCodeBlockNode
  | RichTextImageNode;

export type RichTextDocument = {
  type: "doc";
  content: RichTextBlockNode[];
};

const simpleMarkSchema = z.union([
  z.strictObject({ type: z.literal("bold") }),
  z.strictObject({ type: z.literal("italic") }),
  z.strictObject({ type: z.literal("code") }),
]);

const linkMarkSchema = z.strictObject({
  type: z.literal("link"),
  attrs: z.strictObject({
    href: safeExternalUrlSchema,
    target: z.literal("_blank").optional(),
  }),
});

const markSchema: z.ZodType<RichTextMark> = z.union([
  simpleMarkSchema,
  linkMarkSchema,
]);

const textNodeSchema: z.ZodType<RichTextTextNode> = z.strictObject({
  type: z.literal("text"),
  text: z.string(),
  marks: z.array(markSchema).optional(),
});

const hardBreakNodeSchema: z.ZodType<RichTextHardBreakNode> = z.strictObject({
  type: z.literal("hardBreak"),
});

const inlineNodeSchema: z.ZodType<RichTextInlineNode> = z.union([
  textNodeSchema,
  hardBreakNodeSchema,
]);

const paragraphNodeSchema: z.ZodType<RichTextParagraphNode> = z.strictObject({
  type: z.literal("paragraph"),
  content: z.array(inlineNodeSchema).optional(),
});

const headingNodeSchema: z.ZodType<RichTextHeadingNode> = z.strictObject({
  type: z.literal("heading"),
  attrs: z.strictObject({ level: z.union([z.literal(2), z.literal(3)]) }),
  content: z.array(inlineNodeSchema).optional(),
});

const listItemNodeSchema: z.ZodType<RichTextListItemNode> = z.lazy(() =>
  z.strictObject({
    type: z.literal("listItem"),
    content: z
      .array(
        z.union([
          paragraphNodeSchema,
          bulletListNodeSchema,
          orderedListNodeSchema,
        ]),
      )
      .min(1),
  }),
);

const bulletListNodeSchema: z.ZodType<RichTextBulletListNode> = z.lazy(() =>
  z.strictObject({
    type: z.literal("bulletList"),
    content: z.array(listItemNodeSchema).min(1),
  }),
);

const orderedListNodeSchema: z.ZodType<RichTextOrderedListNode> = z.lazy(() =>
  z.strictObject({
    type: z.literal("orderedList"),
    attrs: z.strictObject({ start: z.number().int().positive() }).optional(),
    content: z.array(listItemNodeSchema).min(1),
  }),
);

const blockquoteNodeSchema: z.ZodType<RichTextBlockquoteNode> = z.strictObject({
  type: z.literal("blockquote"),
  content: z.array(paragraphNodeSchema).min(1),
});

const codeBlockNodeSchema: z.ZodType<RichTextCodeBlockNode> = z.strictObject({
  type: z.literal("codeBlock"),
  attrs: z
    .strictObject({ language: nonEmptyTextSchema.nullable().optional() })
    .optional(),
  content: z.array(textNodeSchema).optional(),
});

const imageNodeSchema: z.ZodType<RichTextImageNode> = z.strictObject({
  type: z.literal("image"),
  attrs: z.strictObject({ mediaAssetId: mediaAssetIdSchema }),
});

export const richTextBlockSchema: z.ZodType<RichTextBlockNode> = z.lazy(() =>
  z.union([
    paragraphNodeSchema,
    headingNodeSchema,
    bulletListNodeSchema,
    orderedListNodeSchema,
    blockquoteNodeSchema,
    codeBlockNodeSchema,
    imageNodeSchema,
  ]),
);

export const richTextSchema: z.ZodType<RichTextDocument> = z.strictObject({
  type: z.literal("doc"),
  content: z.array(richTextBlockSchema),
});

function textFromNode(
  node: RichTextBlockNode | RichTextInlineNode | RichTextListItemNode,
): string {
  if (node.type === "text") return node.text;
  if (node.type === "hardBreak" || node.type === "image") return "";

  return (node.content ?? []).map(textFromNode).join(" ");
}

export function deriveReadingTime(document: RichTextDocument): string {
  const wordCount = document.content
    .map(textFromNode)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return `${Math.max(1, Math.ceil(wordCount / 200))} min`;
}
