"use client";

import type { FeaturedProjectRow } from "@/server/content/projects/admin";

import { useState } from "react";

import {
  reorderFeaturedProjectsAction,
  setProjectFeaturedAction,
} from "@/app/admin/_actions/projects";
import { moveBy, positionAnnouncement } from "@/lib/admin/reorder";

/* Orders the projects shown on the homepage. Like the "Feature on the
   homepage" checkbox, this is a live setting: each move is saved and applied
   at once, with no Save button. */
export function FeaturedProjectsOrder({
  initial,
}: {
  initial: FeaturedProjectRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  async function move(index: number, delta: number) {
    const next = moveBy(rows, index, delta);

    setBusy(true);
    setMessage(null);
    const result = await reorderFeaturedProjectsAction({
      orderedIds: next.map((row) => row.id),
    });

    setBusy(false);
    if (result.ok) {
      setRows(next);
      setMessage({
        tone: "ok",
        text: positionAnnouncement(
          rows[index].name,
          index + delta,
          rows.length,
        ),
      });
    } else {
      setMessage({ tone: "error", text: result.error.message });
    }
  }

  async function remove(index: number) {
    const row = rows[index];

    setBusy(true);
    setMessage(null);
    const result = await setProjectFeaturedAction({
      id: row.id,
      featured: false,
    });

    setBusy(false);
    if (result.ok) {
      setRows(rows.filter((_, i) => i !== index));
      setMessage({
        tone: "ok",
        text: `${row.name} removed from the homepage.`,
      });
    } else {
      setMessage({ tone: "error", text: result.error.message });
    }
  }

  return (
    <fieldset className="adm-fieldset">
      <legend className="adm-h2">Featured projects order</legend>
      <p className="adm-hint">
        The order of the project cards on the homepage. Changes apply
        immediately and do not need Save or a homepage publish. To add a
        project, tick &ldquo;Feature on the homepage&rdquo; in its editor.
      </p>
      {rows.length ? (
        <ol className="adm-repeat-list">
          {rows.map((row, index) => (
            <li key={row.id} className="adm-repeat-row">
              <span aria-hidden="true" className="adm-repeat-index">
                {index + 1}
              </span>
              <div className="adm-repeat-fields">
                <strong>{row.name}</strong>{" "}
                <span className="adm-row-slug">
                  /projects/{row.slug}
                  {row.status === "published" ? "" : " (not published yet)"}
                </span>
              </div>
              <div className="adm-repeat-controls">
                <button
                  aria-label={`Move ${row.name} up`}
                  className="adm-btn adm-btn-small"
                  disabled={busy || index === 0}
                  type="button"
                  onClick={() => void move(index, -1)}
                >
                  Up
                </button>
                <button
                  aria-label={`Move ${row.name} down`}
                  className="adm-btn adm-btn-small"
                  disabled={busy || index === rows.length - 1}
                  type="button"
                  onClick={() => void move(index, 1)}
                >
                  Down
                </button>
                <button
                  aria-label={`Remove ${row.name} from the homepage`}
                  className="adm-btn adm-btn-small"
                  data-variant="danger-quiet"
                  disabled={busy}
                  type="button"
                  onClick={() => void remove(index)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="adm-empty">No project is featured yet.</p>
      )}
      {message ? (
        <p
          className="adm-hint"
          data-tone={message.tone}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
    </fieldset>
  );
}
