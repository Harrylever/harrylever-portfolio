"use client";

import type { ActionResult } from "@/domain/content/action-result";
import type { LifecycleStatus } from "@/server/content/admin-actions";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { formSnapshot } from "@/lib/admin/content-forms";

/** The serializable state both project and post editors receive. */
export type EditorStateBase<Draft> = {
  id: string;
  slug: string;
  draft: Draft;
  status: LifecycleStatus;
  slugLocked: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
  deletedAt: string | null;
};

export type EditorStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "publishing" }
  | { kind: "unpublishing" }
  | { kind: "trashing" }
  | { kind: "duplicating" }
  | { kind: "saved" }
  | { kind: "published" }
  | { kind: "unpublished" }
  | { kind: "error"; message: string; conflict: boolean };

type Transition = "publish" | "unpublish" | "trash";

export type ContentEditorConfig<
  Values,
  Draft,
  State extends EditorStateBase<Draft>,
> = {
  /** "project" | "post" — used in copy. */
  noun: string;
  /** Admin route segment, e.g. "projects" or "blog". */
  segment: string;
  initial: State | null;
  initialValues: Values;
  toDraft: (values: Values, base: Draft | null) => unknown;
  fromState: (state: State) => Values;
  slugOf: (values: Values) => string;
  actions: {
    create: (input: {
      slug: unknown;
      draft: unknown;
    }) => Promise<ActionResult<State>>;
    save: (input: {
      id: unknown;
      slug: unknown;
      draft: unknown;
      expectedUpdatedAt: unknown;
    }) => Promise<ActionResult<State>>;
    transition: (
      event: Transition,
      input: { id: unknown; expectedUpdatedAt: unknown },
    ) => Promise<ActionResult<State>>;
    duplicate: (input: { id: unknown }) => Promise<ActionResult<State>>;
  };
};

function errorMessage(noun: string, code: string, message: string) {
  switch (code) {
    case "CONFLICT":
      return `This ${noun} changed in another tab or session. Reload to get the latest version; your edits here aren't saved.`;
    case "UNAUTHORIZED":
      return "Your session has ended. Sign in again to save.";
    case "INFRASTRUCTURE_ERROR":
      return "The server couldn't save right now. Your changes are still here; try again shortly.";
    case "NOT_FOUND":
      return `This ${noun} no longer exists. It may have been deleted in another tab.`;
    default:
      return message;
  }
}

/**
 * Save/publish state machine shared by the project and post editors. Mirrors
 * the settings form: explicit statuses, edits typed during a save are kept,
 * and a stale version is reported as a conflict, never overwritten.
 */
export function useContentEditor<
  Values,
  Draft,
  State extends EditorStateBase<Draft>,
>(config: ContentEditorConfig<Values, Draft, State>) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(config.initialValues);
  const [saved, setSaved] = useState(() => formSnapshot(config.initialValues));
  const [state, setState] = useState<State | null>(config.initial);
  const [status, setStatus] = useState<EditorStatus>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const dirty = useMemo(() => formSnapshot(values) !== saved, [values, saved]);
  const busy = [
    "saving",
    "publishing",
    "unpublishing",
    "trashing",
    "duplicating",
  ].includes(status.kind);
  const conflict = status.kind === "error" && status.conflict;

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setStatus((current) =>
      [
        "saving",
        "publishing",
        "unpublishing",
        "trashing",
        "duplicating",
      ].includes(current.kind) ||
      (current.kind === "error" && current.conflict)
        ? current
        : { kind: "idle" },
    );
  }

  function fail(result: Extract<ActionResult<unknown>, { ok: false }>) {
    setFieldErrors(result.error.fieldErrors ?? {});
    const isConflict =
      result.error.code === "CONFLICT" && !result.error.fieldErrors?.slug;

    setStatus({
      kind: "error",
      conflict: isConflict,
      message: isConflict
        ? errorMessage(config.noun, "CONFLICT", result.error.message)
        : errorMessage(config.noun, result.error.code, result.error.message),
    });
  }

  function offline() {
    setStatus({
      kind: "error",
      conflict: false,
      message: "Couldn't reach the server. Your changes aren't saved yet.",
    });
  }

  async function save() {
    if (busy || conflict) return;
    if (state && !dirty) return;
    const submitted = formSnapshot(values);
    const draft = config.toDraft(values, state?.draft ?? null);
    const slug = config.slugOf(values);

    setStatus({ kind: "saving" });
    try {
      const result = state
        ? await config.actions.save({
            id: state.id,
            slug,
            draft,
            expectedUpdatedAt: state.updatedAt,
          })
        : await config.actions.create({ slug, draft });

      if (!result.ok) return fail(result);
      setFieldErrors({});
      if (!state) {
        // The editor route loads the created record fresh.
        setSaved(submitted);
        router.replace(`/admin/${config.segment}/${result.data.id}`);

        return;
      }
      const serverValues = config.fromState(result.data);

      setValues((current) =>
        formSnapshot(current) === submitted ? serverValues : current,
      );
      setSaved(formSnapshot(serverValues));
      setState(result.data);
      setStatus({ kind: "saved" });
    } catch {
      offline();
    }
  }

  async function transition(event: Transition) {
    if (!state || busy) return;
    const pending = {
      publish: "publishing",
      unpublish: "unpublishing",
      trash: "trashing",
    } as const;

    setStatus({ kind: pending[event] });
    try {
      const result = await config.actions.transition(event, {
        id: state.id,
        expectedUpdatedAt: state.updatedAt,
      });

      if (!result.ok) return fail(result);
      setFieldErrors({});
      if (event === "trash") {
        setSaved(formSnapshot(values));
        router.push(`/admin/${config.segment}/trash`);

        return;
      }
      setState(result.data);
      setStatus({ kind: event === "publish" ? "published" : "unpublished" });
      router.refresh();
    } catch {
      offline();
    }
  }

  async function duplicate() {
    if (!state || busy) return;
    setStatus({ kind: "duplicating" });
    try {
      const result = await config.actions.duplicate({ id: state.id });

      if (!result.ok) return fail(result);
      setStatus({ kind: "idle" });
      router.push(`/admin/${config.segment}/${result.data.id}`);
    } catch {
      offline();
    }
  }

  const statusView: { tone: string; text: string } = (() => {
    switch (status.kind) {
      case "saving":
        return { tone: "meta", text: "Saving…" };
      case "publishing":
        return { tone: "meta", text: "Publishing…" };
      case "unpublishing":
        return { tone: "meta", text: "Unpublishing…" };
      case "trashing":
        return { tone: "meta", text: "Moving to trash…" };
      case "duplicating":
        return { tone: "meta", text: "Duplicating…" };
      case "error":
        return { tone: "error", text: status.message };
      default:
        break;
    }
    if (dirty) return { tone: "attention", text: "Unsaved changes" };
    if (!state) return { tone: "meta", text: "Not saved yet" };
    if (status.kind === "published") {
      return { tone: "ok", text: "Published. The public site is updated." };
    }
    if (status.kind === "unpublished") {
      return {
        tone: "ok",
        text: "Unpublished. It's no longer on the public site.",
      };
    }
    if (status.kind === "saved") {
      return state.status === "published"
        ? { tone: "ok", text: "Saved. Publish to update the public site." }
        : { tone: "ok", text: "Saved. It stays private until you publish." };
    }
    if (state.status === "draft") {
      return { tone: "meta", text: "Saved as a private draft" };
    }
    if (state.status === "unpublished") {
      return { tone: "meta", text: "Saved. Not on the public site" };
    }

    return state.hasUnpublishedChanges
      ? { tone: "attention", text: "Saved draft isn't published yet" }
      : { tone: "meta", text: "Published and up to date" };
  })();

  return {
    values,
    update,
    setValues,
    state,
    status,
    statusView,
    fieldErrors,
    dirty,
    busy,
    conflict,
    save,
    transition,
    duplicate,
  };
}
