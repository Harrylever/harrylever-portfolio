"use client";

import type { MediaLibrary } from "@/components/admin/media/media-picker";

import { type ReactNode } from "react";

import { FieldError, TextField } from "@/components/admin/content-fields";
import { moveBy } from "@/lib/admin/reorder";

/** Props every section form receives from the editor shell. */
export type SectionFormProps<T> = {
  values: T;
  onChange: (next: T) => void;
  errors: Record<string, string[]>;
  library: MediaLibrary;
};

export function fieldId(key: string) {
  return `home-${key.replace(/\./g, "-")}`;
}

/** A text input bound to one form key (keys match homeFieldErrors). */
export function HomeText({
  name,
  errors,
  ...props
}: Omit<Parameters<typeof TextField>[0], "id" | "errors"> & {
  name: string;
  errors: Record<string, string[]>;
}) {
  return <TextField errors={errors[name]} id={fieldId(name)} {...props} />;
}

export function HomeSelect({
  name,
  label,
  value,
  options,
  onChange,
  errors,
}: {
  name: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  errors: Record<string, string[]>;
}) {
  const id = fieldId(name);

  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <select
        aria-describedby={errors[name]?.length ? `${id}-error` : undefined}
        aria-invalid={errors[name]?.length ? "true" : undefined}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldError errors={errors[name]} id={`${id}-error`} />
    </div>
  );
}

/**
 * An ordered, repeatable group of fields with accessible move/remove
 * controls (no drag needed inside a form).
 */
export function RepeatList<T extends { key: string }>({
  legend,
  noun,
  rows,
  onChange,
  create,
  addLabel,
  name,
  errors,
  hint,
  children,
}: {
  legend: string;
  /** Used in control names, e.g. "item" → "Move item 2 up". */
  noun: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  create: () => T;
  addLabel: string;
  /** Form key for list-level errors, e.g. "items". */
  name: string;
  errors: Record<string, string[]>;
  hint?: ReactNode;
  children: (
    row: T,
    index: number,
    patch: (fields: Partial<T>) => void,
  ) => ReactNode;
}) {
  const id = fieldId(name);

  return (
    <fieldset
      aria-describedby={errors[name]?.length ? `${id}-error` : undefined}
      className="adm-repeat"
    >
      <legend className="adm-label">{legend}</legend>
      {hint ? <p className="adm-hint">{hint}</p> : null}
      {rows.length ? (
        <ol className="adm-repeat-list">
          {rows.map((row, index) => (
            <li key={row.key} className="adm-repeat-row">
              <span aria-hidden="true" className="adm-repeat-index">
                {index + 1}
              </span>
              <div className="adm-repeat-fields">
                {children(row, index, (fields) =>
                  onChange(
                    rows.map((item, i) =>
                      i === index ? { ...item, ...fields } : item,
                    ),
                  ),
                )}
              </div>
              <div className="adm-repeat-controls">
                <button
                  aria-label={`Move ${noun} ${index + 1} up`}
                  className="adm-btn adm-btn-small"
                  disabled={index === 0}
                  type="button"
                  onClick={() => onChange(moveBy(rows, index, -1))}
                >
                  Up
                </button>
                <button
                  aria-label={`Move ${noun} ${index + 1} down`}
                  className="adm-btn adm-btn-small"
                  disabled={index === rows.length - 1}
                  type="button"
                  onClick={() => onChange(moveBy(rows, index, 1))}
                >
                  Down
                </button>
                <button
                  aria-label={`Remove ${noun} ${index + 1}`}
                  className="adm-btn adm-btn-small"
                  data-variant="danger-quiet"
                  type="button"
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="adm-empty">None yet.</p>
      )}
      <FieldError errors={errors[name]} id={`${id}-error`} />
      <div>
        <button
          className="adm-btn"
          type="button"
          onClick={() => onChange([...rows, create()])}
        >
          {addLabel}
        </button>
      </div>
    </fieldset>
  );
}

/** Heading + optional note, shared by most sections. */
export function HeadingFields<T extends { heading: string; note: string }>({
  values,
  onChange,
  errors,
}: Omit<SectionFormProps<T>, "library">) {
  return (
    <>
      <HomeText
        errors={errors}
        label="Heading"
        max={120}
        name="heading"
        value={values.heading}
        onChange={(heading) => onChange({ ...values, heading })}
      />
      <HomeText
        errors={errors}
        hint="Optional. A short line beside the heading."
        label="Note"
        max={240}
        name="note"
        value={values.note}
        onChange={(note) => onChange({ ...values, note })}
      />
    </>
  );
}
