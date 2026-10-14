"use client";

import type { MediaPickerAsset } from "@/components/admin/media/media-picker";
import type { ProjectContent } from "@/domain/content/project";
import type { ProjectEditorState } from "@/server/content/projects/admin";

import { useState } from "react";

import {
  createProjectAction,
  duplicateProjectAction,
  saveProjectAction,
  transitionProjectAction,
} from "@/app/admin/_actions/projects";
import {
  FormErrors,
  SaveBar,
  SlugField,
  TextField,
} from "@/components/admin/content-fields";
import {
  MediaField,
  MediaListField,
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
  type ProjectFormValues,
  emptyProjectForm,
  projectDraftFromForm,
  projectFormFromContent,
} from "@/lib/admin/content-forms";

const labels: Record<string, string> = {
  slug: "URL slug",
  name: "Name",
  hook: "Hook",
  homepageStory: "Homepage story",
  year: "Year",
  role: "Role",
  displayStatus: "Status label",
  externalUrl: "External link",
  stack: "Stack",
  coverAssetId: "Cover image",
  galleryAssetIds: "Gallery",
  galleryPlaceholders: "Gallery",
  coverPlaceholder: "Cover image",
  homepagePlaceholder: "Homepage image",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  caseStudy: "Case study",
};

const inlineKeys = new Set([
  "slug",
  "name",
  "hook",
  "homepageStory",
  "year",
  "role",
  "displayStatus",
  "externalUrl",
  "stack",
  "coverAssetId",
  "galleryAssetIds",
  "seoTitle",
  "seoDescription",
  "caseStudy",
]);

const fromState = (state: ProjectEditorState) =>
  projectFormFromContent(state.slug, state.draft);

export function ProjectForm({
  initial,
  media,
}: {
  initial: ProjectEditorState | null;
  media: MediaPickerAsset[];
}) {
  const editor = useContentEditor<
    ProjectFormValues,
    ProjectContent,
    ProjectEditorState
  >({
    noun: "project",
    segment: "projects",
    initial,
    initialValues: initial ? fromState(initial) : emptyProjectForm(),
    toDraft: projectDraftFromForm,
    fromState,
    slugOf: (values) => values.slug,
    actions: {
      create: createProjectAction,
      save: saveProjectAction,
      transition: transitionProjectAction,
      duplicate: duplicateProjectAction,
    },
  });
  const library = useMediaLibrary(media);
  const [confirmDialog, confirm] = useConfirm();
  // New projects derive the slug from the name until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const { values, update, fieldErrors: errors, state } = editor;
  const itemName = state?.draft.name ?? (values.name || "Untitled project");

  useUnsavedChangesWarning(editor.dirty);

  const text = (
    key: keyof ProjectFormValues & string,
    props: Partial<Parameters<typeof TextField>[0]> = {},
  ) => (
    <TextField
      errors={errors[key]}
      id={`project-${key}`}
      label={labels[key]}
      value={values[key] as string}
      onChange={(value) => update(key, value as never)}
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
          <p>The saved draft replaces what&apos;s on the public site now.</p>
        ) : (
          <p>
            It will appear on the public site at{" "}
            <code>/projects/{state?.slug}</code>. That URL can&apos;t change
            afterwards.
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
          It comes off the public site and its page returns “not found”. The
          draft and its URL are kept, so you can publish it again.
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
          It leaves the project list
          {state?.status === "published" ? " and the public site" : ""}. You can
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
        kind="project"
        previewHref={
          state ? `/api/admin/preview?type=project&slug=${state.slug}` : null
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
          {text("name", {
            max: 140,
            onChange: (value) => {
              update("name", value);
              if (!slugTouched && !state?.slugLocked) {
                update("slug", normalizeSlug(value));
              }
            },
          })}
          <SlugField
            errors={errors.slug}
            id="project-slug"
            locked={Boolean(state?.slugLocked)}
            prefix="/projects/"
            value={state?.slugLocked ? state.slug : values.slug}
            onChange={(value) => {
              setSlugTouched(true);
              update("slug", value);
            }}
          />
          {text("hook", {
            max: 300,
            multiline: true,
            hint: "One or two sentences for the project list.",
          })}
          {text("homepageStory", {
            max: 800,
            multiline: true,
            hint: "Shown when the project is featured on the homepage.",
          })}
          <div className="adm-form-row">
            {text("year", { max: 40 })}
            {text("role", { max: 160 })}
          </div>
          <div className="adm-form-row">
            {text("displayStatus", {
              max: 80,
              hint: "E.g. Live, Shipped, In progress.",
            })}
            {text("externalUrl", {
              type: "url",
              placeholder: "https://",
              hint: "Optional.",
            })}
          </div>
          {text("stack", {
            multiline: true,
            hint: "One technology per line.",
          })}
        </fieldset>

        <fieldset className="adm-fieldset">
          <legend className="adm-h2">Images</legend>
          <MediaField
            error={errors.coverAssetId}
            label="Cover image"
            library={library}
            value={values.coverAssetId}
            onChange={(id) => update("coverAssetId", id)}
          />
          <MediaListField
            error={errors.galleryAssetIds}
            label="Gallery"
            library={library}
            value={values.galleryAssetIds}
            onChange={(ids) => update("galleryAssetIds", ids)}
          />
        </fieldset>

        <fieldset className="adm-fieldset">
          <legend className="adm-h2">Case study</legend>
          <RichTextEditor
            error={errors.caseStudy}
            hint="Headings, lists, quotes, code, links and images from the media library."
            label="Case study"
            library={library}
            value={values.caseStudy}
            onChange={(document) => update("caseStudy", document)}
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
