"use client";

import type { ActionResult } from "@/domain/content/action-result";
import type { ListFilters } from "@/lib/admin/content-forms";
import type { AdminContentRow } from "@/server/content/admin-actions";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

import {
  deletePostAction,
  duplicatePostAction,
  transitionPostAction,
} from "@/app/admin/_actions/posts";
import {
  deleteProjectAction,
  duplicateProjectAction,
  reorderProjectsAction,
  transitionProjectAction,
} from "@/app/admin/_actions/projects";
import {
  LifecycleState,
  useConfirm,
} from "@/components/admin/publish-controls";

type Kind = "project" | "post";

const config = {
  project: {
    segment: "projects",
    publicPrefix: "/projects/",
    plural: "projects",
    transition: transitionProjectAction,
    remove: deleteProjectAction,
    duplicate: duplicateProjectAction,
  },
  post: {
    segment: "blog",
    publicPrefix: "/blog/",
    plural: "posts",
    transition: transitionPostAction,
    remove: deletePostAction,
    duplicate: duplicatePostAction,
  },
} as const;

const statusOptions: { value: ListFilters["status"]; label: string }[] = [
  { value: "all", label: "Any state" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "changes", label: "Published, with unpublished changes" },
  { value: "unpublished", label: "Unpublished" },
];

function failureMessage(result: Extract<ActionResult<unknown>, { ok: false }>) {
  switch (result.error.code) {
    case "CONFLICT":
      return result.error.fieldErrors?.slug
        ? `${result.error.message}. Rename or trash the active one first, then restore this.`
        : "It changed in another tab. The list has been refreshed; try again.";
    case "UNAUTHORIZED":
      return "Your session has ended. Sign in again.";
    case "INFRASTRUCTURE_ERROR":
      return "The server couldn't complete that. Try again shortly.";
    default:
      return result.error.message;
  }
}

/** Search + lifecycle filter. A plain GET form: works before hydration. */
export function ContentFilters({
  kind,
  view,
  filters,
}: {
  kind: Kind;
  view: "active" | "trash";
  filters: ListFilters;
}) {
  const { segment, plural } = config[kind];
  const action = `/admin/${segment}${view === "trash" ? "/trash" : ""}`;
  const filtered = filters.q || filters.status !== "all";

  return (
    <form action={action} className="adm-filters" method="get" role="search">
      <div className="adm-field">
        <label htmlFor={`${kind}-search`}>Search {plural}</label>
        <input
          defaultValue={filters.q}
          id={`${kind}-search`}
          name="q"
          placeholder="Title or slug"
          type="search"
        />
      </div>
      {view === "active" ? (
        <div className="adm-field">
          <label htmlFor={`${kind}-status`}>State</label>
          <select
            defaultValue={filters.status}
            id={`${kind}-status`}
            name="status"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="adm-filters-actions">
        <button className="adm-btn" type="submit">
          Filter
        </button>
        {filtered ? (
          <Link className="adm-btn" data-variant="quiet" href={action}>
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function ContentTable({
  kind,
  view,
  rows,
  canReorder = false,
  emptyMessage,
}: {
  kind: Kind;
  view: "active" | "trash";
  rows: AdminContentRow[];
  /** Only for the unfiltered project list, where every active row is shown. */
  canReorder?: boolean;
  emptyMessage: string;
}) {
  const router = useRouter();
  const [confirmDialog, confirm] = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: string; text: string } | null>(
    null,
  );
  const { segment, publicPrefix, transition, remove, duplicate } = config[kind];

  async function run(
    id: string,
    operation: () => Promise<ActionResult<unknown>>,
    success: string,
  ) {
    setBusyId(id);
    setMessage(null);
    try {
      const result = await operation();

      setMessage(
        result.ok
          ? { tone: "ok", text: success }
          : { tone: "error", text: failureMessage(result) },
      );
    } catch {
      setMessage({ tone: "error", text: "Couldn't reach the server." });
    } finally {
      setBusyId(null);
      router.refresh();
    }
  }

  async function restore(row: AdminContentRow) {
    const ok = await confirm({
      action: "Restore",
      itemName: row.title,
      confirmLabel: "Restore",
      body: (
        <p>
          It goes back to the {config[kind].plural} list as{" "}
          {row.status === "published"
            ? "published, and its public page returns"
            : "it was before, not public"}
          .
        </p>
      ),
    });

    if (ok) {
      await run(
        row.id,
        () =>
          transition("restore", {
            id: row.id,
            expectedUpdatedAt: row.updatedAt,
          }),
        `Restored “${row.title}”.`,
      );
    }
  }

  async function destroy(row: AdminContentRow) {
    const ok = await confirm({
      action: "Delete permanently",
      itemName: row.title,
      confirmLabel: "Delete permanently",
      tone: "danger",
      body: (
        <p>
          This deletes it and its history for good. It can&apos;t be undone.
          Images stay in the media library.
        </p>
      ),
    });

    if (ok) {
      await run(
        row.id,
        () => remove({ id: row.id, expectedUpdatedAt: row.updatedAt }),
        `Deleted “${row.title}” permanently.`,
      );
    }
  }

  async function copy(row: AdminContentRow) {
    await run(
      row.id,
      () => duplicate({ id: row.id }),
      `Copied “${row.title}” as a new private draft.`,
    );
  }

  async function move(index: number, offset: -1 | 1) {
    const ids = rows.map((row) => row.id);
    const target = index + offset;

    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(
      rows[index].id,
      () => reorderProjectsAction({ orderedIds: ids }),
      "Order saved. The public project list uses it straight away.",
    );
  }

  return (
    <>
      {confirmDialog}
      <p
        aria-live="polite"
        className="adm-status"
        data-tone={message?.tone}
        role="status"
      >
        {message?.text}
      </p>
      {rows.length === 0 ? (
        <p className="adm-empty">{emptyMessage}</p>
      ) : (
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">State</th>
                <th scope="col">{view === "trash" ? "Trashed" : "Updated"}</th>
                <th scope="col">
                  <span className="adm-visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const when = view === "trash" ? row.deletedAt : row.updatedAt;
                const busy = busyId !== null;

                return (
                  <tr key={row.id} aria-busy={busyId === row.id}>
                    <th scope="row">
                      {view === "trash" ? (
                        <span className="adm-row-title">{row.title}</span>
                      ) : (
                        <Link
                          className="adm-row-title"
                          href={`/admin/${segment}/${row.id}`}
                        >
                          {row.title}
                        </Link>
                      )}
                      <span className="adm-row-slug">
                        {publicPrefix}
                        {row.slug}
                      </span>
                    </th>
                    <td>
                      <LifecycleState
                        hasUnpublishedChanges={row.hasUnpublishedChanges}
                        status={row.status}
                        trashed={view === "trash"}
                      />
                      {row.featured && view === "active" ? (
                        <span className="adm-state-note">
                          Featured on the homepage
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {when ? (
                        <time dateTime={when} title={when}>
                          {formatDistanceToNow(new Date(when), {
                            addSuffix: true,
                          })}
                        </time>
                      ) : null}
                    </td>
                    <td className="adm-row-actions">
                      {view === "trash" ? (
                        <>
                          <button
                            aria-label={`Restore ${row.title}`}
                            className="adm-btn"
                            disabled={busy}
                            type="button"
                            onClick={() => void restore(row)}
                          >
                            Restore
                          </button>
                          <button
                            aria-label={`Delete ${row.title} permanently`}
                            className="adm-btn"
                            data-variant="danger-quiet"
                            disabled={busy}
                            type="button"
                            onClick={() => void destroy(row)}
                          >
                            Delete permanently
                          </button>
                        </>
                      ) : (
                        <>
                          {canReorder ? (
                            <>
                              <button
                                aria-label={`Move ${row.title} up`}
                                className="adm-btn adm-btn-icon"
                                disabled={busy || index === 0}
                                type="button"
                                onClick={() => void move(index, -1)}
                              >
                                ↑
                              </button>
                              <button
                                aria-label={`Move ${row.title} down`}
                                className="adm-btn adm-btn-icon"
                                disabled={busy || index === rows.length - 1}
                                type="button"
                                onClick={() => void move(index, 1)}
                              >
                                ↓
                              </button>
                            </>
                          ) : null}
                          <button
                            aria-label={`Duplicate ${row.title}`}
                            className="adm-btn"
                            data-variant="quiet"
                            disabled={busy}
                            type="button"
                            onClick={() => void copy(row)}
                          >
                            Duplicate
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
