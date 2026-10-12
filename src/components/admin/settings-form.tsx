"use client";

import type { ActionResult } from "@/domain/content/action-result";
import type { SiteProfileContent } from "@/domain/content/site-profile";
import type { SiteProfileEditorState } from "@/server/content/site-profile/admin";

import { useEffect, useMemo, useState } from "react";

import {
  publishSiteProfileAction,
  saveSiteProfileAction,
} from "@/app/admin/_actions/site-profile";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "publishing" }
  | { kind: "saved" }
  | { kind: "published" }
  | { kind: "error"; message: string; conflict: boolean };

const emptyProfile: SiteProfileContent = {
  name: "",
  location: "",
  tagline: "",
  description: "",
  email: "",
  githubUsername: "",
  socialLinks: [],
};

const textFields = [
  { key: "name", label: "Name", max: 100, autoComplete: "name" },
  { key: "location", label: "Location", max: 120, autoComplete: "off" },
  { key: "email", label: "Public email", max: 320, autoComplete: "email" },
  {
    key: "githubUsername",
    label: "GitHub username",
    max: 39,
    autoComplete: "off",
    hint: "Used for the contribution calendar.",
  },
] as const;

function snapshot(values: SiteProfileContent) {
  return JSON.stringify(values);
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;

  return (
    <p className="adm-field-error" id={id}>
      {errors.join(" ")}
    </p>
  );
}

export function SettingsForm({
  initial,
}: {
  initial: SiteProfileEditorState | null;
}) {
  const [values, setValues] = useState<SiteProfileContent>(
    initial?.draft ?? emptyProfile,
  );
  const [saved, setSaved] = useState(() =>
    snapshot(initial?.draft ?? emptyProfile),
  );
  const [version, setVersion] = useState<string | null>(
    initial?.updatedAt ?? null,
  );
  const [meta, setMeta] = useState({
    publishedAt: initial?.publishedAt ?? null,
    hasUnpublishedChanges: initial?.hasUnpublishedChanges ?? false,
  });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const dirty = useMemo(() => snapshot(values) !== saved, [values, saved]);
  const busy = status.kind === "saving" || status.kind === "publishing";

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof SiteProfileContent>(
    key: K,
    value: SiteProfileContent[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    if (status.kind !== "error" || !status.conflict)
      setStatus({ kind: "idle" });
  }

  function updateLink(index: number, key: "label" | "href", value: string) {
    update(
      "socialLinks",
      values.socialLinks.map((link, i) =>
        i === index ? { ...link, [key]: value } : link,
      ),
    );
  }

  function applyResult(
    result: ActionResult<SiteProfileEditorState>,
    done: Status,
  ) {
    if (result.ok) {
      setValues(result.data.draft);
      setSaved(snapshot(result.data.draft));
      setVersion(result.data.updatedAt);
      setMeta({
        publishedAt: result.data.publishedAt,
        hasUnpublishedChanges: result.data.hasUnpublishedChanges,
      });
      setFieldErrors({});
      setStatus(done);

      return;
    }
    setFieldErrors(result.error.fieldErrors ?? {});
    setStatus({
      kind: "error",
      conflict: result.error.code === "CONFLICT",
      message:
        result.error.code === "CONFLICT"
          ? "The profile changed in another tab or session. Reload to get the latest version; your edits here aren't saved."
          : result.error.code === "UNAUTHORIZED"
            ? "Your session has ended. Sign in again to save."
            : result.error.message,
    });
  }

  async function run(
    pending: Status,
    done: Status,
    call: () => Promise<ActionResult<SiteProfileEditorState>>,
  ) {
    setStatus(pending);
    try {
      applyResult(await call(), done);
    } catch {
      setStatus({
        kind: "error",
        conflict: false,
        message: "Couldn't reach the server. Your changes aren't saved yet.",
      });
    }
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty) return;
    void run({ kind: "saving" }, { kind: "saved" }, () =>
      saveSiteProfileAction({ draft: values, expectedUpdatedAt: version }),
    );
  }

  function publish() {
    if (busy || dirty || !version) return;
    void run({ kind: "publishing" }, { kind: "published" }, () =>
      publishSiteProfileAction({ expectedUpdatedAt: version }),
    );
  }

  const statusView: { tone: string; text: string } = (() => {
    switch (status.kind) {
      case "saving":
        return { tone: "meta", text: "Saving…" };
      case "publishing":
        return { tone: "meta", text: "Publishing…" };
      case "error":
        return { tone: "error", text: status.message };
      default:
        break;
    }
    if (dirty) return { tone: "attention", text: "Unsaved changes" };
    if (status.kind === "published") {
      return { tone: "ok", text: "Published. The public site is updated." };
    }
    if (status.kind === "saved") {
      return { tone: "ok", text: "Saved. Publish to update the public site." };
    }
    if (!version) return { tone: "meta", text: "Not saved yet" };
    if (meta.hasUnpublishedChanges) {
      return { tone: "attention", text: "Saved draft isn't published yet" };
    }

    return { tone: "meta", text: "Published and up to date" };
  })();

  const errorId = (key: string) => `profile-${key.replace(/\./g, "-")}-error`;
  const invalid = (key: string) =>
    fieldErrors[key]?.length ? ("true" as const) : undefined;

  return (
    <form noValidate aria-busy={busy} className="adm-form" onSubmit={save}>
      <div className="adm-form-row">
        {textFields.slice(0, 2).map((field) => (
          <div key={field.key} className="adm-field">
            <label htmlFor={`profile-${field.key}`}>{field.label}</label>
            <input
              aria-describedby={invalid(field.key) && errorId(field.key)}
              aria-invalid={invalid(field.key)}
              autoComplete={field.autoComplete}
              id={`profile-${field.key}`}
              maxLength={field.max}
              value={values[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
            />
            <FieldError
              errors={fieldErrors[field.key]}
              id={errorId(field.key)}
            />
          </div>
        ))}
      </div>

      <div className="adm-field">
        <label htmlFor="profile-tagline">Tagline</label>
        <input
          aria-describedby={invalid("tagline") && errorId("tagline")}
          aria-invalid={invalid("tagline")}
          id="profile-tagline"
          maxLength={180}
          value={values.tagline}
          onChange={(e) => update("tagline", e.target.value)}
        />
        <FieldError errors={fieldErrors.tagline} id={errorId("tagline")} />
      </div>

      <div className="adm-field">
        <label htmlFor="profile-description">Introduction</label>
        <textarea
          aria-describedby={`profile-description-hint${invalid("description") ? ` ${errorId("description")}` : ""}`}
          aria-invalid={invalid("description")}
          id="profile-description"
          maxLength={500}
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
        />
        <p className="adm-hint" id="profile-description-hint">
          {values.description.length}/500 characters. Also used as the
          site&apos;s search description.
        </p>
        <FieldError
          errors={fieldErrors.description}
          id={errorId("description")}
        />
      </div>

      <div className="adm-form-row">
        {textFields.slice(2).map((field) => (
          <div key={field.key} className="adm-field">
            <label htmlFor={`profile-${field.key}`}>{field.label}</label>
            <input
              aria-describedby={invalid(field.key) && errorId(field.key)}
              aria-invalid={invalid(field.key)}
              autoComplete={field.autoComplete}
              id={`profile-${field.key}`}
              maxLength={field.max}
              type={field.key === "email" ? "email" : "text"}
              value={values[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
            />
            {"hint" in field ? <p className="adm-hint">{field.hint}</p> : null}
            <FieldError
              errors={fieldErrors[field.key]}
              id={errorId(field.key)}
            />
          </div>
        ))}
      </div>

      <fieldset
        className="adm-links"
        style={{ border: 0, padding: 0, margin: 0 }}
      >
        <legend className="adm-label" style={{ marginBottom: "var(--s-3)" }}>
          Social links
        </legend>
        {values.socialLinks.length === 0 ? (
          <p className="adm-empty">
            No links yet. Add GitHub, LinkedIn or anywhere else people can find
            you.
          </p>
        ) : null}
        {values.socialLinks.map((link, index) => {
          const labelKey = `socialLinks.${index}.label`;
          const hrefKey = `socialLinks.${index}.href`;

          return (
            // Index keys are fine: rows are only appended or removed.

            <div key={index} className="adm-link-row">
              <div className="adm-field">
                <label htmlFor={`profile-link-${index}-label`}>Label</label>
                <input
                  aria-describedby={invalid(labelKey) && errorId(labelKey)}
                  aria-invalid={invalid(labelKey)}
                  id={`profile-link-${index}-label`}
                  maxLength={40}
                  value={link.label}
                  onChange={(e) => updateLink(index, "label", e.target.value)}
                />
                <FieldError
                  errors={fieldErrors[labelKey]}
                  id={errorId(labelKey)}
                />
              </div>
              <div className="adm-field">
                <label htmlFor={`profile-link-${index}-href`}>URL</label>
                <input
                  aria-describedby={invalid(hrefKey) && errorId(hrefKey)}
                  aria-invalid={invalid(hrefKey)}
                  id={`profile-link-${index}-href`}
                  inputMode="url"
                  placeholder="https://"
                  type="url"
                  value={link.href}
                  onChange={(e) => updateLink(index, "href", e.target.value)}
                />
                <FieldError
                  errors={fieldErrors[hrefKey]}
                  id={errorId(hrefKey)}
                />
              </div>
              <button
                aria-label={`Remove link ${link.label || index + 1}`}
                className="adm-btn"
                data-variant="quiet"
                style={{ marginTop: 34 }}
                type="button"
                onClick={() =>
                  update(
                    "socialLinks",
                    values.socialLinks.filter((_, i) => i !== index),
                  )
                }
              >
                Remove
              </button>
            </div>
          );
        })}
        {values.socialLinks.length < 12 ? (
          <div>
            <button
              className="adm-btn"
              type="button"
              onClick={() =>
                update("socialLinks", [
                  ...values.socialLinks,
                  { label: "", href: "" },
                ])
              }
            >
              Add link
            </button>
          </div>
        ) : null}
      </fieldset>

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
        {status.kind === "error" && status.conflict ? (
          <button
            className="adm-btn"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload latest
          </button>
        ) : null}
        <button
          className="adm-btn"
          data-variant="solid"
          disabled={busy || !dirty}
          type="submit"
        >
          {status.kind === "saving" ? "Saving…" : "Save draft"}
        </button>
        <button
          className="adm-btn"
          disabled={busy || dirty || !version || !meta.hasUnpublishedChanges}
          type="button"
          onClick={publish}
        >
          {status.kind === "publishing" ? "Publishing…" : "Publish"}
        </button>
      </div>
    </form>
  );
}
