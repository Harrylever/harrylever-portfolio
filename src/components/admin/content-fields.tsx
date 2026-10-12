"use client";

import type { ReactNode } from "react";

import { reloadDiscardingChanges } from "@/components/admin/unsaved-changes";

/* Small field primitives shared by the project and post editors. */

export function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;

  return (
    <p className="adm-field-error" id={id}>
      {errors.join(" ")}
    </p>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  errors,
  hint,
  max,
  multiline = false,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  hint?: ReactNode;
  max?: number;
  multiline?: boolean;
  type?: "text" | "url";
  placeholder?: string;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [hint || max ? hintId : null, errors?.length ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const shared = {
    id,
    value,
    maxLength: max,
    placeholder,
    "aria-describedby": describedBy,
    "aria-invalid": errors?.length ? ("true" as const) : undefined,
  };

  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea {...shared} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...shared}
          inputMode={type === "url" ? "url" : undefined}
          type={type}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint || max ? (
        <p className="adm-hint" id={hintId}>
          {hint}
          {hint && max ? " " : null}
          {max ? `${value.length}/${max}` : null}
        </p>
      ) : null}
      <FieldError errors={errors} id={errorId} />
    </div>
  );
}

/**
 * The public URL. Editable (with a live preview of the normalised slug)
 * until the first publication, then shown read-only.
 */
export function SlugField({
  id,
  prefix,
  value,
  locked,
  onChange,
  errors,
}: {
  id: string;
  prefix: string;
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
  errors?: string[];
}) {
  if (locked) {
    return (
      <div className="adm-field">
        <span className="adm-label">Public URL</span>
        <p className="adm-slug-locked">
          <code>
            {prefix}
            {value}
          </code>
        </p>
        <p className="adm-hint">
          This is the published URL. A published URL can&apos;t change, so links
          people have shared keep working.
        </p>
        <FieldError errors={errors} id={`${id}-error`} />
      </div>
    );
  }

  return (
    <div className="adm-field">
      <label htmlFor={id}>URL slug</label>
      <div className="adm-slug">
        <span aria-hidden="true" className="adm-slug-prefix">
          {prefix}
        </span>
        <input
          aria-describedby={`${id}-hint${errors?.length ? ` ${id}-error` : ""}`}
          aria-invalid={errors?.length ? "true" : undefined}
          autoCapitalize="none"
          autoComplete="off"
          id={id}
          maxLength={120}
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="adm-hint" id={`${id}-hint`}>
        Lowercase letters, numbers and hyphens. It locks once you publish.
      </p>
      <FieldError errors={errors} id={`${id}-error`} />
    </div>
  );
}

/** Errors without an inline control, listed above the save bar. */
export function FormErrors({
  errors,
  inlineKeys,
  labels,
}: {
  errors: Record<string, string[]>;
  inlineKeys: Set<string>;
  labels: Record<string, string>;
}) {
  const other = Object.entries(errors).filter(
    ([key, messages]) => messages.length && !inlineKeys.has(key),
  );

  if (!other.length) return null;

  return (
    <ul aria-label="Problems to fix" className="adm-alert adm-form-errors">
      {other.map(([key, messages]) => (
        <li key={key}>
          {key === "form"
            ? messages.join(" ")
            : `${labels[key.split(".")[0]] ?? key}: ${messages.join(" ")}`}
        </li>
      ))}
    </ul>
  );
}

export function SaveBar({
  statusView,
  conflict,
  busy,
  canSave,
  saving,
  label,
}: {
  statusView: { tone: string; text: string };
  conflict: boolean;
  busy: boolean;
  canSave: boolean;
  saving: boolean;
  label: string;
}) {
  return (
    <div className="adm-savebar">
      <p
        aria-live="polite"
        className="adm-status"
        data-tone={statusView.tone}
        role="status"
        style={{ margin: 0 }}
      >
        {statusView.text}
      </p>
      {conflict ? (
        <button
          className="adm-btn"
          type="button"
          onClick={reloadDiscardingChanges}
        >
          Reload latest
        </button>
      ) : null}
      <button
        className="adm-btn"
        data-variant="solid"
        disabled={busy || !canSave}
        type="submit"
      >
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}
