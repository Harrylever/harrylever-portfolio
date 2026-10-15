import type { ReactNode } from "react";
import type {
  RichTextBlockNode,
  RichTextDocument,
  RichTextInlineNode,
  RichTextMark,
  RichTextTextNode,
} from "@/domain/content/rich-text";

import { imageSrcSet, optimizedImageUrl } from "@/lib/media-url";

export type ResolvedRichTextMedia = Record<
  string,
  {
    secureUrl: string;
    altText: string;
    width: number;
    height: number;
    caption?: string | null;
  }
>;

type RichTextProps = {
  document: RichTextDocument;
  media?: ResolvedRichTextMedia;
};

function isSecureUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function renderMark(content: ReactNode, mark: RichTextMark, key: string) {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{content}</strong>;
    case "italic":
      return <em key={key}>{content}</em>;
    case "code":
      return <code key={key}>{content}</code>;
    case "link":
      return (
        <a
          key={key}
          href={mark.attrs.href}
          rel="noopener noreferrer"
          target={mark.attrs.target}
        >
          {content}
        </a>
      );
  }
}

function renderText(node: RichTextTextNode, key: string): ReactNode {
  return (node.marks ?? []).reduce<ReactNode>(
    (content, mark, index) => renderMark(content, mark, `${key}-mark-${index}`),
    node.text,
  );
}

function renderInline(node: RichTextInlineNode, key: string): ReactNode {
  if (node.type === "hardBreak") return <br key={key} />;

  return <span key={key}>{renderText(node, key)}</span>;
}

function renderInlineContent(
  content: RichTextInlineNode[] | undefined,
  key: string,
): ReactNode[] {
  return (content ?? []).map((node, index) =>
    renderInline(node, `${key}-inline-${index}`),
  );
}

function codeText(node: RichTextTextNode): string {
  return node.text;
}

function renderBlock(
  node: RichTextBlockNode,
  key: string,
  media: ResolvedRichTextMedia,
): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderInlineContent(node.content, key)}</p>;
    case "heading": {
      const content = renderInlineContent(node.content, key);

      return node.attrs.level === 2 ? (
        <h2 key={key}>{content}</h2>
      ) : (
        <h3 key={key}>{content}</h3>
      );
    }
    case "bulletList":
      return (
        <ul key={key}>
          {node.content.map((item, index) => (
            <li key={`${key}-item-${index}`}>
              {item.content.map((child, childIndex) =>
                renderBlock(child, `${key}-item-${index}-${childIndex}`, media),
              )}
            </li>
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} start={node.attrs?.start}>
          {node.content.map((item, index) => (
            <li key={`${key}-item-${index}`}>
              {item.content.map((child, childIndex) =>
                renderBlock(child, `${key}-item-${index}-${childIndex}`, media),
              )}
            </li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote key={key}>
          {node.content.map((child, index) =>
            renderBlock(child, `${key}-quote-${index}`, media),
          )}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{(node.content ?? []).map(codeText).join("")}</code>
        </pre>
      );
    case "image": {
      const asset = media[node.attrs.mediaAssetId];

      if (!asset || !isSecureUrl(asset.secureUrl)) return null;

      return (
        <figure key={key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={asset.altText}
            height={asset.height}
            loading="lazy"
            sizes="(min-width: 760px) 720px, 100vw"
            src={optimizedImageUrl(
              asset.secureUrl,
              Math.min(asset.width, 1200),
            )}
            srcSet={imageSrcSet(asset.secureUrl, asset.width)}
            width={asset.width}
          />
          {asset.caption ? <figcaption>{asset.caption}</figcaption> : null}
        </figure>
      );
    }
  }
}

export function RichText({ document, media = {} }: RichTextProps) {
  return (
    <div className="rich-text">
      {document.content.map((node, index) =>
        renderBlock(node, `block-${index}`, media),
      )}
    </div>
  );
}
