"use client";

import type { HomeSectionEditorState } from "@/server/content/home/admin";

import { useMemo, useState } from "react";

import { saveHomeSectionAction } from "@/app/admin/_actions/home";
import { formSnapshot } from "@/lib/admin/content-forms";
import {
  type HomeFormValues,
  emptyHomeForm,
  homeDraftFromForm,
  homeFieldErrors,
  homeFormFromContent,
} from "@/lib/admin/home-forms";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string; conflict: boolean };

function valuesOf(state: HomeSectionEditorState): HomeFormValues {
  return state.draft
    ? homeFormFromContent(state.draft)
    : emptyHomeForm(state.type);
}

/** Compares what would be saved, so row keys and whitespace don't count. */
function snapshotOf(values: HomeFormValues, visible: boolean) {
  return formSnapshot({ draft: homeDraftFromForm(values), visible });
}

/**
 * Save state machine for one homepage section. Same contract as the project
 * editor: edits typed during a save are kept, and a stale version is a
 * conflict that blocks saving until reload, never an overwrite.
 */
export function useHomeSectionEditor(initial: HomeSectionEditorState) {
  const [state, setState] = useState(initial);
  const [values, setValues] = useState<HomeFormValues>(() => valuesOf(initial));
  const [visible, setVisible] = useState(initial.visible);
  const [saved, setSaved] = useState(() =>
    snapshotOf(valuesOf(initial), initial.visible),
  );
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const current = useMemo(() => snapshotOf(values, visible), [values, visible]);
  const exists = state.updatedAt !== null;
  const dirty = current !== saved;
  const canSave = !exists || dirty;
  const busy = status.kind === "saving";
  const conflict = status.kind === "error" && status.conflict;

  function touch() {
    setStatus((now) =>
      now.kind === "saving" || (now.kind === "error" && now.conflict)
        ? now
        : { kind: "idle" },
    );
  }

  function change(next: HomeFormValues) {
    setValues(next);
    touch();
  }

  function changeVisible(next: boolean) {
    setVisible(next);
    touch();
  }

  async function save() {
    if (busy || conflict || !canSave) return;
    const draft = homeDraftFromForm(values);
    const localErrors = homeFieldErrors(draft);

    if (localErrors) {
      setFieldErrors(localErrors);
      setStatus({
        kind: "error",
        conflict: false,
        message: "Fix the highlighted fields, then save again.",
      });

      return;
    }
    const submitted = snapshotOf(values, visible);

    setStatus({ kind: "saving" });
    try {
      const result = await saveHomeSectionAction({
        type: state.type,
        draft,
        visible,
        expectedUpdatedAt: state.updatedAt,
      });

      if (!result.ok) {
        setFieldErrors(result.error.fieldErrors ?? {});
        const isConflict = result.error.code === "CONFLICT";

        setStatus({
          kind: "error",
          conflict: isConflict,
          message: isConflict
            ? "This section changed in another tab or session. Reload to get the latest version; your edits here aren't saved."
            : result.error.code === "UNAUTHORIZED"
              ? "Your session has ended. Sign in again to save."
              : result.error.code === "INFRASTRUCTURE_ERROR"
                ? "The server couldn't save right now. Your changes are still here; try again shortly."
                : result.error.message,
        });

        return;
      }
      const serverValues = valuesOf(result.data);

      setFieldErrors({});
      // Keep anything typed while the save was in flight.
      setValues((now) =>
        snapshotOf(now, visible) === submitted ? serverValues : now,
      );
      setSaved(snapshotOf(serverValues, result.data.visible));
      setState(result.data);
      setStatus({ kind: "saved" });
    } catch {
      setStatus({
        kind: "error",
        conflict: false,
        message: "Couldn't reach the server. Your changes aren't saved yet.",
      });
    }
  }

  const statusView: { tone: string; text: string } = (() => {
    if (status.kind === "saving") return { tone: "meta", text: "Saving…" };
    if (status.kind === "error") return { tone: "error", text: status.message };
    if (dirty) return { tone: "attention", text: "Unsaved changes" };
    if (!exists) return { tone: "attention", text: "Not created yet" };
    if (status.kind === "saved") {
      return {
        tone: "ok",
        text: "Saved. It stays private until you publish the homepage.",
      };
    }
    if (!state.published)
      return { tone: "meta", text: "Draft, not published yet" };

    return state.hasUnpublishedChanges
      ? { tone: "attention", text: "Draft has changes that aren't published" }
      : { tone: "meta", text: "Draft matches the public homepage" };
  })();

  return {
    state,
    values,
    visible,
    change,
    changeVisible,
    save,
    status,
    statusView,
    fieldErrors,
    dirty,
    canSave,
    busy,
    conflict,
    exists,
  };
}
