"use client";

import type { MediaPickerAsset } from "@/components/admin/media/media-picker";
import type { PostContent } from "@/domain/content/post";
import type { PostEditorState } from "@/server/content/posts/admin";

import { useState } from "react";

import {
  createPostAction,
  duplicatePostAction,
  savePostAction,
  transitionPostAction,
} from "@/app/admin/_actions/posts";
import {
  FormErrors,
  SaveBar,
  SlugField,
  TextField,
} from "@/components/admin/content-fields";
import {
  MediaField,
  useMediaLibrary,
} from "@/components/admin/media/media-picker";
import {
  PublishControls,
  useConfirm,
} from "@/components/admin/publish-controls";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { useUnsavedChangesWarning } from "@/components/admin/unsaved-changes";
import { useContentEditor } from "@/components/admin/use-content-editor";
import { normalizeSlug } from "@/domain/content/shared";
import {
  type PostFormValues,
  emptyPostForm,
  postDraftFromForm,
  postFormFromContent,
} from "@/lib/admin/content-forms";

const labels: Record<string, string> = {
  slug: "URL slug",
  title: "Title",
  summary: "Summary",
  tag: "Tag",
  coverAssetId: "Cover image",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  document: "Post body",
};

const inlineKeys = new Set(Object.keys(labels));

const fromState = (state: PostEditorState) =>
  postFormFromContent(state.slug, state.draft);

export function PostForm({
  initial,
  media,
}: {
  initial: PostEditorState | null;
  media: MediaPickerAsset[];
}) {
  const editor = useContentEditor<PostFormValues, PostContent, PostEditorState>(
    {
      noun: "post",
      segment: "blog",
      initial,
      initialValues: initial ? fromState(initial) : emptyPostForm(),
      toDraft: (values) => postDraftFromForm(values),
      fromState,
      slugOf: (values) => values.slug,
      actions: {
        create: createPostAction,
        save: savePostAction,
        transition: transitionPostAction,
        duplicate: duplicatePostAction,
      },
    },
  );
  const library = useMediaLibrary(media);
  const [confirmDialog, confirm] = useConfirm();
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const { values, update, fieldErrors: errors, state } = editor;
  const itemName = state?.draft.title ?? (values.title || "Untitled post");

  useUnsavedChangesWarning(editor.dirty);

  const text = (
    key: Exclude<keyof PostFormValues, "coverAssetId" | "document">,
    props: Partial<Parameters<typeof TextField>[0]> = {},
  ) => (
    <TextField
      errors={errors[key]}
      id={`post-${key}`}
      label={labels[key]}
      value={values[key]}
      onChange={(value) => update(key, value)}
      {...props}
    />
  );

  async function publish() {
    const ok = await confirm({
      action: "Publish",
      itemName,
      confirmLabel: "Publish",
      body:
        state?.status === "published" ? (
          <p>The saved draft replaces the live post.</p>
        ) : (
          <p>
            It will appear on the blog at <code>/blog/{state?.slug}</code>. That
            URL can&apos;t change afterwards.
          </p>
        ),
    });

    if (ok) await editor.transition("publish");
  }

  async function unpublish() {
    const ok = await confirm({
      action: "Unpublish",
      itemName,
      confirmLabel: "Unpublish",
      body: (
        <p>
          It comes off the blog and its page returns “not found”. The draft and
          its URL are kept, so you can publish it again.
        </p>
      ),
    });

    if (ok) await editor.transition("unpublish");
  }

  async function trash() {
    const ok = await confirm({
      action: "Move to trash",
      itemName,
      confirmLabel: "Move to trash",
      tone: "danger",
      body: (
        <p>
          It leaves the post list
          {state?.status === "published" ? " and the blog" : ""}. You can
          restore it from the trash.
          {editor.dirty ? " Unsaved edits on this page will be lost." : ""}
        </p>
      ),
    });

    if (ok) await editor.transition("trash");
  }

  return (
    <>
      {confirmDialog}
      <PublishControls
        busy={editor.busy}
        dirty={editor.dirty}
        hasUnpublishedChanges={state?.hasUnpublishedChanges ?? true}
        itemName={itemName}
        kind="post"
        previewHref={
          state ? `/api/admin/preview?type=post&slug=${state.slug}` : null
        }
        saved={Boolean(state)}
        status={state?.status ?? "draft"}
        onDuplicate={() => void editor.duplicate()}
        onPublish={() => void publish()}
        onTrash={() => void trash()}
        onUnpublish={() => void unpublish()}
      />

      <form
        noValidate
        aria-busy={editor.busy}
        className="adm-form adm-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void editor.save();
        }}
      >
        <fieldset className="adm-fieldset">
          <legend className="adm-h2">Basics</legend>
          {text("title", {
            max: 180,
            onChange: (value) => {
              update("title", value);
              if (!slugTouched && !state?.slugLocked) {
                update("slug", normalizeSlug(value));
              }
            },
          })}
          <SlugField
            errors={errors.slug}
            id="post-slug"
            locked={Boolean(state?.slugLocked)}
            prefix="/blog/"
            value={state?.slugLocked ? state.slug : values.slug}
            onChange={(value) => {
              setSlugTouched(true);
              update("slug", value);
            }}
          />
          {text("summary", {
            max: 400,
            multiline: true,
            hint: "Shown in the post list and at the top of the post.",
          })}
          {text("tag", { max: 80, hint: "One short topic, e.g. Engineering." })}
          <MediaField
            error={errors.coverAssetId}
            label="Cover image"
            library={library}
            value={values.coverAssetId}
            onChange={(id) => update("coverAssetId", id)}
          />
        </fieldset>

        <fieldset className="adm-fieldset">
          <legend className="adm-h2">Post</legend>
          <RichTextEditor
            error={errors.document}
            hint="Headings, lists, quotes, code, links and images from the media library."
            label="Post body"
            library={library}
            value={values.document}
            onChange={(document) => update("document", document)}
          />
        </fieldset>

        <fieldset className="adm-fieldset">
          <legend className="adm-h2">Search and sharing</legend>
          {text("seoTitle", { max: 70 })}
          {text("seoDescription", { max: 180, multiline: true })}
        </fieldset>

        <FormErrors errors={errors} inlineKeys={inlineKeys} labels={labels} />
        <SaveBar
          busy={editor.busy}
          canSave={!state || editor.dirty}
          conflict={editor.conflict}
          label={state ? "Save draft" : "Create draft"}
          saving={editor.status.kind === "saving"}
          statusView={editor.statusView}
        />
      </form>
    </>
  );
}
