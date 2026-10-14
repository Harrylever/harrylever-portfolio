"use client";

import type { RichTextDocument } from "@/domain/content/rich-text";
import type {
  MediaLibrary,
  MediaUploadSlot,
} from "@/components/admin/media/media-picker";

import { type Editor, Node, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  SquareCode,
  TextQuote,
  Undo2,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { MediaPicker } from "@/components/admin/media/media-picker";
import { mediaAssetIdSchema } from "@/domain/content/shared";
import {
  isSafeLinkHref,
  normalizeEditorDocument,
  pastedHtmlBlockedTags,
} from "@/lib/admin/rich-text-normalize";

/* Schema: exactly the Task 2 contract ------------------------------------ */

/** Blockquotes hold paragraphs only (the stored schema allows nothing else). */
const SafeBlockquote = Node.create({
  name: "blockquote",
  group: "block",
  content: "paragraph+",
  defining: true,
  parseHTML: () => [{ tag: "blockquote" }],
  renderHTML: ({ HTMLAttributes }) => ["blockquote", HTMLAttributes, 0],
});

/** List items open with a paragraph and may nest lists, nothing else. */
const SafeListItem = Node.create({
  name: "listItem",
  content: "paragraph (paragraph | bulletList | orderedList)*",
  defining: true,
  parseHTML: () => [{ tag: "li" }],
  renderHTML: ({ HTMLAttributes }) => ["li", HTMLAttributes, 0],
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
    };
  },
});

type ResolveMedia = (
  id: string,
) => { secureUrl: string; altText: string } | undefined;

/**
 * Images reference registered media by id only; there is no `src`
 * attribute, so pasted <img> tags can't create image nodes.
 */
const MediaImage = Node.create<{ resolve: ResolveMedia }>({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addOptions: () => ({ resolve: () => undefined }),
  addAttributes() {
    return {
      mediaAssetId: {
        default: null,
        parseHTML: (element) => {
          const id = element.getAttribute("data-media-asset-id");

          return mediaAssetIdSchema.safeParse(id).success ? id : null;
        },
        renderHTML: (attributes) => ({
          "data-media-asset-id": attributes.mediaAssetId,
        }),
      },
    };
  },
  parseHTML: () => [{ tag: "figure[data-media-asset-id]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "figure",
    mergeAttributes(HTMLAttributes, { class: "adm-rte-image" }),
  ],
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("figure");
      const id = String(node.attrs.mediaAssetId ?? "");
      const asset = this.options.resolve(id);

      dom.className = "adm-rte-image";
      dom.dataset.mediaAssetId = id;
      dom.contentEditable = "false";
      if (asset) {
        const img = document.createElement("img");

        img.src = asset.secureUrl;
        img.alt = asset.altText;
        dom.append(img);
      } else {
        dom.textContent = "Image not found in the media library";
      }

      return { dom };
    };
  },
});

/**
 * Pasted/dropped HTML is cleaned before ProseMirror parses it: executable
 * and embedded elements are removed with their contents, every attribute
 * except safe link hrefs and media ids is dropped.
 */
export function sanitizePastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc
    .querySelectorAll(pastedHtmlBlockedTags.join(","))
    .forEach((node) => node.remove());
  doc.body.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const keep =
        (element.tagName === "A" &&
          attribute.name === "href" &&
          isSafeLinkHref(attribute.value)) ||
        (element.tagName === "FIGURE" &&
          attribute.name === "data-media-asset-id" &&
          mediaAssetIdSchema.safeParse(attribute.value).success);

      if (!keep) element.removeAttribute(attribute.name);
    }
  });

  return doc.body.innerHTML;
}

function editorExtensions(resolve: ResolveMedia) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      blockquote: false,
      listItem: false,
      strike: false,
      underline: false,
      horizontalRule: false,
      trailingNode: false,
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        isAllowedUri: (url) => isSafeLinkHref(url),
        shouldAutoLink: (url) => isSafeLinkHref(url),
        HTMLAttributes: { rel: "noopener noreferrer", target: null },
      },
    }),
    SafeBlockquote,
    SafeListItem,
    MediaImage.configure({ resolve }),
  ];
}

/* Toolbar ----------------------------------------------------------------- */

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      className="adm-rte-tool"
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  onLink,
  onImage,
}: {
  editor: Editor;
  onLink: () => void;
  onImage: () => void;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      paragraph: e.isActive("paragraph"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const size = 16;

  return (
    <div aria-label="Formatting" className="adm-rte-toolbar" role="toolbar">
      <div className="adm-rte-group">
        <ToolButton
          active={state.paragraph}
          label="Paragraph"
          onClick={() => chain().setParagraph().run()}
        >
          <Pilcrow aria-hidden size={size} />
        </ToolButton>
        <ToolButton
          active={state.h2}
          label="Heading"
          onClick={() => chain().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 aria-hidden size={size} />
        </ToolButton>
        <ToolButton
          active={state.h3}
          label="Subheading"
          onClick={() => chain().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 aria-hidden size={size} />
        </ToolButton>
      </div>
      <div className="adm-rte-group">
        <ToolButton
          active={state.bold}
          label="Bold"
          onClick={() => chain().toggleBold().run()}
        >
          <Bold aria-hidden size={size} />
        </ToolButton>
        <ToolButton
          active={state.italic}
          label="Italic"
          onClick={() => chain().toggleItalic().run()}
        >
          <Italic aria-hidden size={size} />
        </ToolButton>
        <ToolButton
          active={state.code}
          label="Inline code"
          onClick={() => chain().toggleCode().run()}
        >
          <Code aria-hidden size={size} />
        </ToolButton>
        <ToolButton active={state.link} label="Link" onClick={onLink}>
          <Link2 aria-hidden size={size} />
        </ToolButton>
      </div>
      <div className="adm-rte-group">
        <ToolButton
          active={state.bullet}
          label="Bulleted list"
          onClick={() => chain().toggleBulletList().run()}
        >
          <List aria-hidden size={size} />
        </ToolButton>
        <ToolButton
          active={state.ordered}
          label="Numbered list"
          onClick={() => chain().toggleOrderedList().run()}
        >
          <ListOrdered aria-hidden size={size} />
        </ToolButton>
        <ToolButton
          active={state.quote}
          label="Quote"
          onClick={() =>
            (state.quote
              ? chain().lift("blockquote")
              : chain().setParagraph().wrapIn("blockquote")
            ).run()
          }
        >
          <TextQuote aria-hidden size={size} />
        </ToolButton>
        <ToolButton
          active={state.codeBlock}
          label="Code block"
          onClick={() => chain().toggleCodeBlock().run()}
        >
          <SquareCode aria-hidden size={size} />
        </ToolButton>
        <ToolButton label="Insert image" onClick={onImage}>
          <ImagePlus aria-hidden size={size} />
        </ToolButton>
      </div>
      <div className="adm-rte-group">
        <ToolButton
          disabled={!state.canUndo}
          label="Undo"
          onClick={() => chain().undo().run()}
        >
          <Undo2 aria-hidden size={size} />
        </ToolButton>
        <ToolButton
          disabled={!state.canRedo}
          label="Redo"
          onClick={() => chain().redo().run()}
        >
          <Redo2 aria-hidden size={size} />
        </ToolButton>
      </div>
    </div>
  );
}

function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const current = editor.getAttributes("link") as {
    href?: string;
    target?: string | null;
  };
  const [href, setHref] = useState(current.href ?? "");
  const [newTab, setNewTab] = useState(current.target === "_blank");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // The form opens on request, so moving focus to the address is expected.
  useEffect(() => inputRef.current?.focus(), []);

  function apply() {
    const value = href.trim();

    if (!isSafeLinkHref(value)) {
      setError("Use a full https://, http:// or mailto: link.");

      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: value, target: newTab ? "_blank" : null })
      .run();
    onDone();
  }

  return (
    <div className="adm-rte-link">
      <div className="adm-field">
        <label htmlFor={inputId}>Link address</label>
        <input
          ref={inputRef}
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={error ? "true" : undefined}
          id={inputId}
          inputMode="url"
          placeholder="https://"
          type="url"
          value={href}
          onChange={(event) => {
            setHref(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onDone();
              editor.commands.focus();
            }
          }}
        />
        {error ? (
          <p className="adm-field-error" id={`${inputId}-error`}>
            {error}
          </p>
        ) : null}
      </div>
      <label className="adm-check">
        <input
          checked={newTab}
          type="checkbox"
          onChange={(event) => setNewTab(event.target.checked)}
        />
        Open in a new tab
      </label>
      <div className="adm-rte-link-actions">
        <button
          className="adm-btn"
          data-variant="solid"
          type="button"
          onClick={apply}
        >
          Apply link
        </button>
        {current.href ? (
          <button
            className="adm-btn"
            type="button"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              onDone();
            }}
          >
            Remove link
          </button>
        ) : null}
        <button
          className="adm-btn"
          data-variant="quiet"
          type="button"
          onClick={() => {
            onDone();
            editor.commands.focus();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* Editor ------------------------------------------------------------------ */

export function RichTextEditor({
  label,
  hint,
  value,
  onChange,
  library,
  error,
  renderUpload,
}: {
  label: string;
  hint?: string;
  value: RichTextDocument;
  onChange: (document: RichTextDocument) => void;
  library: MediaLibrary;
  error?: string[];
  renderUpload?: MediaUploadSlot;
}) {
  const labelId = useId();
  const hintId = useId();
  const errorId = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const mediaRef = useRef(library.byId);
  const onChangeRef = useRef(onChange);

  mediaRef.current = library.byId;
  onChangeRef.current = onChange;

  const describedBy = [hint ? hintId : null, error?.length ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions((id) => mediaRef.current.get(id)),
    content: value,
    editorProps: {
      attributes: {
        "aria-labelledby": labelId,
        "aria-multiline": "true",
        role: "textbox",
        class: "adm-rte-content",
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error?.length ? { "aria-invalid": "true" } : {}),
      },
      transformPastedHTML: sanitizePastedHtml,
    },
    onUpdate: ({ editor: current }) => {
      onChangeRef.current(normalizeEditorDocument(current.getJSON()));
    },
  });

  // Keep aria attributes in sync with validation state.
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          "aria-labelledby": labelId,
          "aria-multiline": "true",
          role: "textbox",
          class: "adm-rte-content",
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
          ...(error?.length ? { "aria-invalid": "true" } : {}),
        },
      },
    });
  }, [editor, describedBy, error, labelId]);

  return (
    <div className="adm-field adm-rte">
      <span className="adm-label" id={labelId}>
        {label}
      </span>
      {hint ? (
        <p className="adm-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      <div
        className="adm-rte-frame"
        data-invalid={error?.length ? "true" : undefined}
      >
        {editor ? (
          <Toolbar
            editor={editor}
            onImage={() => setPickerOpen(true)}
            onLink={() => setLinkOpen((open) => !open)}
          />
        ) : null}
        {editor && linkOpen ? (
          <LinkForm editor={editor} onDone={() => setLinkOpen(false)} />
        ) : null}
        <EditorContent editor={editor} />
      </div>
      {error?.length ? (
        <p className="adm-field-error" id={errorId}>
          {error.join(" ")}
        </p>
      ) : null}
      <MediaPicker
        library={library}
        open={pickerOpen}
        renderUpload={renderUpload}
        title="Insert an image"
        onClose={() => {
          setPickerOpen(false);
          editor?.commands.focus();
        }}
        onSelect={(asset) =>
          editor
            ?.chain()
            .focus()
            .insertContent({ type: "image", attrs: { mediaAssetId: asset.id } })
            .run()
        }
      />
    </div>
  );
}
