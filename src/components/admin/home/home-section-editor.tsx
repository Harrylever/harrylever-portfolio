"use client";

import type { MediaPickerAsset } from "@/components/admin/media/media-picker";
import type { HomeFormFor, HomeFormValues } from "@/lib/admin/home-forms";
import type { HomeSectionEditorState } from "@/server/content/home/admin";

import Link from "next/link";

import { FormErrors, SaveBar } from "@/components/admin/content-fields";
import { BuiltForm } from "@/components/admin/home/forms/built-form";
import { CommitsForm } from "@/components/admin/home/forms/commits-form";
import { FramesForm } from "@/components/admin/home/forms/frames-form";
import { IntroForm } from "@/components/admin/home/forms/intro-form";
import { LoopForm } from "@/components/admin/home/forms/loop-form";
import { NowForm } from "@/components/admin/home/forms/now-form";
import { ReachForm } from "@/components/admin/home/forms/reach-form";
import { SayForm } from "@/components/admin/home/forms/say-form";
import { useHomeSectionEditor } from "@/components/admin/home/use-home-section-editor";
import {
  type MediaLibrary,
  useMediaLibrary,
} from "@/components/admin/media/media-picker";
import { useUnsavedChangesWarning } from "@/components/admin/unsaved-changes";
import { homeSectionNames } from "@/lib/admin/home-forms";

function SectionForm({
  values,
  onChange,
  errors,
  library,
}: {
  values: HomeFormValues;
  onChange: (next: HomeFormValues) => void;
  errors: Record<string, string[]>;
  library: MediaLibrary;
}) {
  const shared = { errors, library };
  // Each branch narrows `values`; onChange keeps the same section type.
  const bind = <T extends HomeFormValues["type"]>(v: HomeFormFor<T>) => ({
    ...shared,
    values: v,
    onChange: (next: HomeFormFor<T>) => onChange(next),
  });

  switch (values.type) {
    case "intro":
      return <IntroForm {...bind<"intro">(values)} />;
    case "now":
      return <NowForm {...bind<"now">(values)} />;
    case "built":
      return <BuiltForm {...bind<"built">(values)} />;
    case "commits":
      return <CommitsForm {...bind<"commits">(values)} />;
    case "frames":
      return <FramesForm {...bind<"frames">(values)} />;
    case "reach":
      return <ReachForm {...bind<"reach">(values)} />;
    case "loop":
      return <LoopForm {...bind<"loop">(values)} />;
    case "say":
      return <SayForm {...bind<"say">(values)} />;
  }
}

/** Keys rendered next to an input; the rest are listed above the save bar. */
function isInline(key: string) {
  return key !== "form";
}

export function HomeSectionEditor({
  initial,
  media,
}: {
  initial: HomeSectionEditorState;
  media: MediaPickerAsset[];
}) {
  const editor = useHomeSectionEditor(initial);
  const library = useMediaLibrary(media);
  const name = homeSectionNames[initial.type];
  const { state } = editor;

  useUnsavedChangesWarning(editor.dirty);

  const formErrors = Object.fromEntries(
    Object.entries(editor.fieldErrors).filter(([key]) => !isInline(key)),
  );

  return (
    <>
      <section aria-label="Publication" className="adm-publish">
        <div className="adm-publish-state">
          <span
            className="adm-state"
            data-state={
              !state.published
                ? "unpublished"
                : state.hasUnpublishedChanges
                  ? "draft"
                  : "published"
            }
          >
            <span aria-hidden="true" className="adm-state-dot" />
            <span>
              {!editor.exists
                ? "Not created yet"
                : !state.published
                  ? "Not published"
                  : state.hasUnpublishedChanges
                    ? "Changes not published"
                    : "Published"}
            </span>
          </span>
          <p className="adm-hint">
            Sections publish together, from the{" "}
            <Link href="/admin/home">homepage overview</Link>.
          </p>
        </div>
        {editor.exists ? (
          <div className="adm-publish-actions">
            <a
              className="adm-btn"
              data-variant="quiet"
              href="/api/admin/preview?type=home"
              rel="noopener noreferrer"
              target="_blank"
              title="Opens the saved homepage draft in a new tab"
            >
              Preview draft
            </a>
          </div>
        ) : null}
      </section>

      <form
        noValidate
        aria-busy={editor.busy}
        aria-label={`${name} section`}
        className="adm-form adm-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void editor.save();
        }}
      >
        <SectionForm
          errors={editor.fieldErrors}
          library={library}
          values={editor.values}
          onChange={editor.change}
        />

        <fieldset className="adm-fieldset">
          <legend className="adm-h2">On the homepage</legend>
          <label className="adm-check">
            <input
              checked={editor.visible}
              type="checkbox"
              onChange={(event) => editor.changeVisible(event.target.checked)}
            />
            Show on the homepage
          </label>
          <p className="adm-hint">
            A hidden section keeps its content and its place in the order.
          </p>
        </fieldset>

        <FormErrors errors={formErrors} inlineKeys={new Set()} labels={{}} />
        <SaveBar
          busy={editor.busy}
          canSave={editor.canSave}
          conflict={editor.conflict}
          label="Save draft"
          saving={editor.busy}
          statusView={editor.statusView}
        />
      </form>
    </>
  );
}
