"use client";

import type { ActionResult } from "@/domain/content/action-result";
import type { HomeOverview, HomeSectionRow } from "@/server/content/home/admin";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";

import {
  publishHomepageAction,
  reorderHomeAction,
  setHomeSectionVisibilityAction,
} from "@/app/admin/_actions/home";
import { useConfirm } from "@/components/admin/publish-controls";
import { moveItem, positionAnnouncement } from "@/lib/admin/reorder";

type Note = { tone: "ok" | "meta"; text: string } | null;
type Problem = { text: string; reload: boolean } | null;

function failureText(result: Extract<ActionResult<unknown>, { ok: false }>) {
  switch (result.error.code) {
    case "CONFLICT":
      return {
        text:
          result.error.message.startsWith("The homepage") ||
          result.error.message.includes("Nothing was published")
            ? result.error.message
            : "The homepage changed in another tab or session. Reload to get the latest version.",
        reload: true,
      };
    case "UNAUTHORIZED":
      return { text: "Your session has ended. Sign in again.", reload: false };
    case "INFRASTRUCTURE_ERROR":
      return {
        text: "The server couldn't complete that. Nothing changed; try again shortly.",
        reload: false,
      };
    default:
      return { text: result.error.message, reload: false };
  }
}

function rowState(row: HomeSectionRow) {
  if (!row.exists) return { state: "unpublished", text: "Not created yet" };
  if (!row.published) return { state: "unpublished", text: "Not published" };
  if (row.hasUnpublishedChanges) {
    return { state: "draft", text: "Changes not published" };
  }

  return { state: "published", text: "Published" };
}

/**
 * The homepage running order: drag rows, or use the move buttons, to
 * reorder; toggle visibility; publish every section together.
 */
export function HomeSectionList({ initial }: { initial: HomeOverview }) {
  const [overview, setOverview] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  // Drag events fire faster than re-renders; read the source from a ref.
  const dragSource = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [focusAfter, setFocusAfter] = useState<string | null>(null);
  const controls = useRef(new Map<string, HTMLButtonElement | null>());
  const [confirmDialog, confirm] = useConfirm();
  // Dragging needs the client handlers; until then rows aren't draggable.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  const { sections, complete } = overview;
  const canPublish = complete && overview.hasUnpublishedChanges && !busy;

  // After a move, keep focus on the moved section's control.
  useEffect(() => {
    if (busy || !focusAfter) return;
    const [type] = focusAfter.split(":");
    const target = controls.current.get(focusAfter);
    const fallback =
      controls.current.get(`${type}:up`) ??
      controls.current.get(`${type}:down`);

    (target && !target.disabled ? target : fallback)?.focus();
    setFocusAfter(null);
  }, [busy, focusAfter]);

  async function run<T>(
    operation: () => Promise<ActionResult<T>>,
    onSuccess: (data: T) => void,
  ) {
    setBusy(true);
    setProblem(null);
    try {
      const result = await operation();

      if (result.ok) onSuccess(result.data);
      else {
        setNote(null);
        setProblem(failureText(result));
      }

      return result.ok;
    } catch {
      setProblem({
        text: "Couldn't reach the server. Nothing changed; try again.",
        reload: false,
      });

      return false;
    } finally {
      setBusy(false);
    }
  }

  async function move(from: number, to: number, control?: string) {
    if (busy || !complete || from === to) return;
    const next = moveItem(sections, from, to);
    const moved = sections[from];
    const previous = overview;

    // Show the new order straight away; roll back if the server refuses.
    setOverview({ ...overview, sections: next });
    const ok = await run(
      () =>
        reorderHomeAction({
          order: next.map((row) => ({
            type: row.type,
            expectedUpdatedAt: row.updatedAt,
          })),
        }),
      (data: HomeOverview) => {
        setOverview(data);
        setNote({
          tone: "meta",
          text: `${positionAnnouncement(moved.name, to, next.length)} Publish to update the homepage.`,
        });
      },
    );

    if (!ok) setOverview(previous);
    if (control) setFocusAfter(control);
  }

  async function toggle(row: HomeSectionRow, visible: boolean) {
    const previous = overview;

    // Reflect the click straight away; roll back if the server refuses.
    setOverview({
      ...overview,
      sections: sections.map((item) =>
        item.type === row.type ? { ...item, visible } : item,
      ),
    });
    const ok = await run(
      () =>
        setHomeSectionVisibilityAction({
          type: row.type,
          visible,
          expectedUpdatedAt: row.updatedAt,
        }),
      (data: HomeOverview) => {
        setOverview(data);
        setNote({
          tone: "meta",
          text: `${row.name} is ${visible ? "shown" : "hidden"} in the draft. Publish to update the homepage.`,
        });
      },
    );

    if (!ok) setOverview(previous);
  }

  async function publish() {
    const changed = sections.filter((row) => row.hasUnpublishedChanges);
    const ok = await confirm({
      action: "Publish",
      itemName: "the homepage",
      confirmLabel: "Publish homepage",
      body: (
        <>
          <p>
            Every section&apos;s saved draft, its visibility and the order here
            go live together. If any section can&apos;t be published, nothing
            is.
          </p>
          {changed.length ? (
            <p>Changed: {changed.map((row) => row.name).join(", ")}.</p>
          ) : null}
        </>
      ),
    });

    if (!ok) return;
    await run(
      () =>
        publishHomepageAction({
          expected: sections.map((row) => ({
            type: row.type,
            updatedAt: row.updatedAt,
          })),
        }),
      (data: HomeOverview) => {
        setOverview(data);
        setNote({
          tone: "ok",
          text: "Published. The public homepage is updated.",
        });
      },
    );
  }

  let publishHint =
    "Publishing makes every saved section draft public at once.";

  if (!complete) publishHint = "Create all eight sections before publishing.";
  else if (!overview.hasUnpublishedChanges) {
    publishHint = "The public homepage matches the saved drafts.";
  }

  return (
    <>
      {confirmDialog}
      <section aria-label="Publication" className="adm-publish">
        <div className="adm-publish-state">
          <span
            className="adm-state"
            data-state={
              !overview.publishedAt
                ? "unpublished"
                : overview.hasUnpublishedChanges
                  ? "draft"
                  : "published"
            }
          >
            <span aria-hidden="true" className="adm-state-dot" />
            <span>
              {overview.publishedAt
                ? `Published ${formatDistanceToNow(new Date(overview.publishedAt), { addSuffix: true })}`
                : "Never published"}
            </span>
            {overview.publishedAt && overview.hasUnpublishedChanges ? (
              <span className="adm-state-note">
                Draft changes not published
              </span>
            ) : null}
          </span>
          <p className="adm-hint" id="home-publish-hint">
            {publishHint}
          </p>
        </div>
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
          <button
            aria-describedby="home-publish-hint"
            className="adm-btn"
            data-variant="solid"
            disabled={!canPublish}
            type="button"
            onClick={() => void publish()}
          >
            Publish homepage
          </button>
        </div>
      </section>

      <p
        aria-live="polite"
        className="adm-status adm-order-status"
        data-tone={note?.tone ?? "meta"}
        role="status"
      >
        {busy ? "Saving…" : (note?.text ?? "")}
      </p>
      {problem ? (
        <div className="adm-alert adm-order-alert" role="alert">
          <p>{problem.text}</p>
          {problem.reload ? (
            <button
              className="adm-btn"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload latest
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="adm-hint adm-order-help">
        Drag a section to reorder it, or use its Up and Down buttons. Changes
        here save to the draft straight away.
      </p>
      <ol
        aria-label="Homepage running order"
        className="adm-order"
        data-ready={hydrated ? "true" : undefined}
      >
        {sections.map((row, index) => {
          const { state, text } = rowState(row);
          const canMove = hydrated && complete && !busy;

          return (
            <li
              key={row.type}
              className="adm-order-row"
              data-dragging={dragging === index ? "true" : undefined}
              data-drop={
                dropTarget === index && dragging !== index ? "true" : undefined
              }
              data-hidden={row.visible ? undefined : "true"}
              draggable={canMove}
              onDragEnd={() => {
                dragSource.current = null;
                setDragging(null);
                setDropTarget(null);
              }}
              onDragOver={(event) => {
                if (dragSource.current === null) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dropTarget !== index) setDropTarget(index);
              }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", row.type);
                dragSource.current = index;
                // Changing the DOM inside dragstart can cancel the drag in
                // Chromium; style the dragged row on the next frame.
                requestAnimationFrame(() => setDragging(index));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const from = dragSource.current;

                dragSource.current = null;

                setDragging(null);
                setDropTarget(null);
                if (from !== null) void move(from, index);
              }}
            >
              <span aria-hidden="true" className="adm-order-handle">
                {index + 1}
              </span>
              <div className="adm-order-main">
                <h2 className="adm-order-name">{row.name}</h2>
                <p className="adm-order-summary">{row.summary}</p>
                <p className="adm-order-meta">
                  <span className="adm-state" data-state={state}>
                    <span aria-hidden="true" className="adm-state-dot" />
                    <span>{text}</span>
                  </span>
                  {row.exists ? (
                    <span className="adm-order-visibility">
                      {row.visible ? "Shown" : "Hidden"}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="adm-order-controls">
                <label className="adm-check">
                  <input
                    aria-label={`Show ${row.name} on the homepage`}
                    checked={row.visible}
                    disabled={!row.exists || busy}
                    type="checkbox"
                    onChange={(event) => void toggle(row, event.target.checked)}
                  />
                  <span aria-hidden="true">Show</span>
                </label>
                <button
                  ref={(element) => {
                    controls.current.set(`${row.type}:up`, element);
                  }}
                  aria-label={`Move ${row.name} up`}
                  className="adm-btn adm-btn-small"
                  disabled={!canMove || index === 0}
                  type="button"
                  onClick={() => void move(index, index - 1, `${row.type}:up`)}
                >
                  Up
                </button>
                <button
                  ref={(element) => {
                    controls.current.set(`${row.type}:down`, element);
                  }}
                  aria-label={`Move ${row.name} down`}
                  className="adm-btn adm-btn-small"
                  disabled={!canMove || index === sections.length - 1}
                  type="button"
                  onClick={() =>
                    void move(index, index + 1, `${row.type}:down`)
                  }
                >
                  Down
                </button>
                <Link
                  aria-label={`${row.exists ? "Edit" : "Create"} ${row.name}`}
                  className="adm-btn adm-btn-small"
                  href={`/admin/home/${row.type}`}
                >
                  {row.exists ? "Edit" : "Create"}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
      {!complete ? (
        <p className="adm-hint">
          Reordering and publishing unlock once all eight sections exist.
        </p>
      ) : null}
    </>
  );
}
