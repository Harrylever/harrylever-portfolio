"use client";

import type { LifecycleStatus } from "@/server/content/admin-actions";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

/* Named confirmations --------------------------------------------------- */

export type ConfirmRequest = {
  /** Verb phrase for the heading, e.g. "Publish". The item name follows. */
  action: string;
  /** The item being acted on, quoted in the heading. */
  itemName: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
};

type Pending = ConfirmRequest & { resolve: (confirmed: boolean) => void };

/**
 * Native modal <dialog>: the browser traps focus and Escape cancels. Focus
 * starts on Cancel (the safe choice) and returns to whatever opened it.
 */
function ConfirmDialog({
  pending,
  onDone,
}: {
  pending: Pending | null;
  onDone: (confirmed: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;

    if (!dialog || !pending) return;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) dialog.showModal();
    cancelRef.current?.focus();
  }, [pending]);

  function close(confirmed: boolean) {
    ref.current?.close();
    onDone(confirmed);
    const target = opener.current;

    opener.current = null;
    // Return focus after React has re-rendered the opener (it may re-enable).
    requestAnimationFrame(() => target?.focus());
  }

  return (
    <dialog
      ref={ref}
      aria-describedby={bodyId}
      aria-labelledby={headingId}
      className="adm-dialog"
      onCancel={(event) => {
        event.preventDefault();
        close(false);
      }}
    >
      {pending ? (
        <>
          <h2 className="adm-dialog-title" id={headingId}>
            {pending.action} “{pending.itemName}”?
          </h2>
          <div className="adm-dialog-body" id={bodyId}>
            {pending.body}
          </div>
          <div className="adm-dialog-actions">
            <button
              ref={cancelRef}
              className="adm-btn"
              type="button"
              onClick={() => close(false)}
            >
              Cancel
            </button>
            <button
              className="adm-btn"
              data-variant={pending.tone === "danger" ? "danger" : "solid"}
              type="button"
              onClick={() => close(true)}
            >
              {pending.confirmLabel}
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

/** Returns the dialog element to render and an async `confirm()`. */
export function useConfirm(): [
  ReactNode,
  (request: ConfirmRequest) => Promise<boolean>,
] {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirm = useCallback(
    (request: ConfirmRequest) =>
      new Promise<boolean>((resolve) => setPending({ ...request, resolve })),
    [],
  );
  const element = (
    <ConfirmDialog
      pending={pending}
      onDone={(confirmed) => {
        pending?.resolve(confirmed);
        setPending(null);
      }}
    />
  );

  return [element, confirm];
}

/* Lifecycle state -------------------------------------------------------- */

const stateLabels: Record<LifecycleStatus, string> = {
  draft: "Draft",
  published: "Published",
  unpublished: "Unpublished",
};

/** Dot + label used in lists and the editor. Sage = live, sand = attention. */
export function LifecycleState({
  status,
  hasUnpublishedChanges,
  trashed = false,
}: {
  status: LifecycleStatus;
  hasUnpublishedChanges: boolean;
  trashed?: boolean;
}) {
  const pendingChanges = status === "published" && hasUnpublishedChanges;

  return (
    <span className="adm-state" data-state={trashed ? "trashed" : status}>
      <span aria-hidden="true" className="adm-state-dot" />
      <span>{trashed ? "In trash" : stateLabels[status]}</span>
      {pendingChanges && !trashed ? (
        <span className="adm-state-note">Draft changes not published</span>
      ) : null}
    </span>
  );
}

/* Editor publication strip ---------------------------------------------- */

export type PublishControlsProps = {
  kind: "project" | "post";
  itemName: string;
  status: LifecycleStatus;
  hasUnpublishedChanges: boolean;
  /** Has the item been saved at least once? */
  saved: boolean;
  dirty: boolean;
  busy: boolean;
  previewHref: string | null;
  onPublish: () => void;
  onUnpublish: () => void;
  onTrash: () => void;
  onDuplicate?: () => void;
};

export function PublishControls(props: PublishControlsProps) {
  const { status, hasUnpublishedChanges, saved, dirty, busy, previewHref } =
    props;
  const canPublish =
    saved && !dirty && (status !== "published" || hasUnpublishedChanges);
  const hintId = useId();
  let hint = "Publishing makes the saved draft public.";

  if (!saved) hint = "Create the draft first. It stays private.";
  else if (dirty) {
    hint = "Save your changes before publishing or duplicating.";
  } else if (!canPublish) hint = "The public page matches the saved draft.";

  return (
    <section aria-label="Publication" className="adm-publish">
      <div className="adm-publish-state">
        <LifecycleState
          hasUnpublishedChanges={hasUnpublishedChanges}
          status={status}
        />
        <p className="adm-hint" id={hintId}>
          {hint}
        </p>
      </div>
      {saved ? (
        <div className="adm-publish-actions">
          {previewHref ? (
            <a
              className="adm-btn"
              data-variant="quiet"
              href={previewHref}
              rel="noopener noreferrer"
              target="_blank"
              title="Opens the last saved draft in a new tab"
            >
              Preview draft
            </a>
          ) : null}
          <button
            aria-describedby={hintId}
            className="adm-btn"
            data-variant="solid"
            disabled={busy || !canPublish}
            type="button"
            onClick={props.onPublish}
          >
            Publish changes
          </button>
          {status === "published" ? (
            <button
              className="adm-btn"
              disabled={busy}
              type="button"
              onClick={props.onUnpublish}
            >
              Unpublish
            </button>
          ) : null}
          {props.onDuplicate ? (
            <button
              aria-describedby={dirty ? hintId : undefined}
              className="adm-btn"
              disabled={busy || dirty}
              title={dirty ? "Save your changes before duplicating" : undefined}
              type="button"
              onClick={props.onDuplicate}
            >
              Duplicate
            </button>
          ) : null}
          <button
            className="adm-btn"
            data-variant="danger-quiet"
            disabled={busy}
            type="button"
            onClick={props.onTrash}
          >
            Move to trash
          </button>
        </div>
      ) : null}
    </section>
  );
}
