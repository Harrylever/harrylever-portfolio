"use client";

import type { AdminMediaAsset } from "@/server/content/media/admin";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

import {
  deleteMediaAssetAction,
  updateMediaTextAction,
} from "@/app/admin/_actions/media";
import { TextField } from "@/components/admin/content-fields";
import { MediaUploader } from "@/components/admin/media/media-uploader";
import { useConfirm } from "@/components/admin/publish-controls";
import { useUnsavedChangesWarning } from "@/components/admin/unsaved-changes";
import { formatBytes, validateAltText } from "@/lib/admin/media-upload";
import {
  groupUsage,
  usageSummary,
  usedByMessage,
} from "@/lib/admin/media-usage";

type Note = { tone: "ok" | "meta" | "error"; text: string } | null;

function nameOf(asset: AdminMediaAsset) {
  return asset.altText.trim() || "Image without alt text";
}

function AssetDetails({
  asset,
  onUpdated,
  onDeleted,
}: {
  asset: AdminMediaAsset;
  onUpdated: (asset: AdminMediaAsset) => void;
  onDeleted: (asset: AdminMediaAsset) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState(asset.altText);
  const [caption, setCaption] = useState(asset.caption ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [confirmDialog, confirm] = useConfirm();
  const dirty = altText !== asset.altText || caption !== (asset.caption ?? "");
  const groups = groupUsage(asset.usage);

  useUnsavedChangesWarning(dirty);

  useEffect(() => {
    headingRef.current?.focus();
  }, [asset.id]);

  async function saveDetails() {
    const altError = validateAltText(altText);

    if (altError) {
      setErrors({ altText: [altError] });
      setNote({ tone: "error", text: "Fix the alt text, then save again." });

      return;
    }
    setBusy(true);
    setNote({ tone: "meta", text: "Saving…" });
    try {
      const result = await updateMediaTextAction({
        id: asset.id,
        altText,
        caption,
      });

      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        setNote({ tone: "error", text: result.error.message });

        return;
      }
      setErrors({});
      setAltText(result.data.altText);
      setCaption(result.data.caption ?? "");
      posthog.capture("media_details_saved");
      onUpdated(result.data);
      setNote({ tone: "ok", text: "Details saved" });
    } catch {
      setNote({ tone: "error", text: "Couldn't reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(asset.secureUrl);
      setNote({ tone: "ok", text: "URL copied" });
    } catch {
      urlRef.current?.select();
      setNote({
        tone: "meta",
        text: "Couldn't copy automatically. The URL is selected; press Ctrl+C or ⌘C.",
      });
    }
  }

  async function remove() {
    setBlocked(null);
    // Referenced images are never deleted: say where they're used instead.
    if (asset.usage.length) {
      setBlocked(usedByMessage(nameOf(asset), asset.usage));

      return;
    }
    const ok = await confirm({
      action: "Delete permanently",
      itemName: nameOf(asset),
      confirmLabel: "Delete permanently",
      tone: "danger",
      body: (
        <p>
          This removes the image from Cloudinary and from the media library.
          Media has no trash, so this can&apos;t be undone.
        </p>
      ),
    });

    if (!ok) return;
    setBusy(true);
    try {
      const result = await deleteMediaAssetAction({ id: asset.id });

      if (result.ok) {
        posthog.capture("media_deleted");
        onDeleted(asset);

        return;
      }
      if (result.error.code === "IN_USE") setBlocked(result.error.message);
      else setNote({ tone: "error", text: result.error.message });
    } catch {
      setNote({ tone: "error", text: "Couldn't reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Image details" className="adm-media-detail">
      {confirmDialog}
      <h2 ref={headingRef} className="adm-h2" tabIndex={-1}>
        {nameOf(asset)}
      </h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={asset.altText}
        className="adm-media-preview"
        height={asset.height}
        src={asset.secureUrl}
        width={asset.width}
      />
      <p className="adm-hint">
        {asset.width} × {asset.height}, {asset.format.toUpperCase()},{" "}
        {formatBytes(asset.bytes)}
      </p>

      <form
        noValidate
        className="adm-form"
        onSubmit={(event) => {
          event.preventDefault();
          void saveDetails();
        }}
      >
        <TextField
          errors={errors.altText}
          hint="Required. Describe what the image shows for people who can't see it."
          id="media-alt"
          label="Alt text"
          max={300}
          value={altText}
          onChange={(value) => {
            setAltText(value);
            setErrors({});
          }}
        />
        <TextField
          errors={errors.caption}
          id="media-caption"
          label="Caption"
          max={500}
          value={caption}
          onChange={setCaption}
        />
        <div className="adm-media-detail-actions">
          <button
            className="adm-btn"
            data-variant="solid"
            disabled={busy || !dirty}
            type="submit"
          >
            Save details
          </button>
          <p
            aria-live="polite"
            className="adm-status"
            data-tone={note?.tone ?? "meta"}
            role="status"
          >
            {note?.text ?? (dirty ? "Unsaved changes" : "")}
          </p>
        </div>
      </form>

      <div className="adm-field">
        <label htmlFor="media-url">Image URL</label>
        <div className="adm-copy">
          <input
            ref={urlRef}
            readOnly
            id="media-url"
            value={asset.secureUrl}
            onFocus={(event) => event.target.select()}
          />
          <button
            className="adm-btn"
            type="button"
            onClick={() => void copyUrl()}
          >
            Copy URL
          </button>
        </div>
      </div>

      <div className="adm-media-usage">
        <h3 className="adm-label">Where it&apos;s used</h3>
        {groups.length ? (
          <ul>
            {groups.map((group) => (
              <li key={group.key}>
                {group.href ? (
                  <Link href={group.href}>{group.label}</Link>
                ) : (
                  <span>{group.label}</span>
                )}{" "}
                <span className="adm-hint">
                  {group.snapshots.join(" and ")}
                  {group.trashed ? ", in trash" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Not used. It can be deleted.</p>
        )}
      </div>

      {blocked ? (
        <div className="adm-alert" role="alert">
          <p>{blocked}</p>
        </div>
      ) : null}
      <div>
        <button
          className="adm-btn"
          data-variant="danger-quiet"
          disabled={busy}
          type="button"
          onClick={() => void remove()}
        >
          Delete permanently
        </button>
      </div>
    </section>
  );
}

/** The media library: upload, browse, describe, copy, and delete images. */
export function MediaLibrary({
  initial,
  selectedId,
}: {
  initial: AdminMediaAsset[];
  selectedId?: string | null;
}) {
  const [assets, setAssets] = useState(initial);
  const [selected, setSelected] = useState<string | null>(
    selectedId && initial.some((asset) => asset.id === selectedId)
      ? selectedId
      : null,
  );
  const [note, setNote] = useState<Note>(null);
  const current = assets.find((asset) => asset.id === selected) ?? null;

  return (
    <>
      <section aria-labelledby="media-upload-heading" className="adm-section">
        <h2 className="adm-h2" id="media-upload-heading">
          Upload an image
        </h2>
        <MediaUploader
          idPrefix="media-upload"
          onUploaded={(asset) => {
            setAssets((list) => [
              asset,
              ...list.filter((a) => a.id !== asset.id),
            ]);
            setSelected(asset.id);
          }}
        />
      </section>

      <p
        aria-live="polite"
        className="adm-status adm-library-status"
        data-tone={note?.tone ?? "meta"}
        role="status"
      >
        {note?.text ?? ""}
      </p>

      <div className="adm-media-layout">
        <section aria-labelledby="media-list-heading">
          <h2 className="adm-h2" id="media-list-heading">
            Library ({assets.length})
          </h2>
          {assets.length ? (
            <ul aria-label="Images" className="adm-media-library">
              {assets.map((asset) => (
                <li
                  key={asset.id}
                  aria-current={asset.id === selected ? "true" : undefined}
                  className="adm-media-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    height={asset.height}
                    loading="lazy"
                    src={asset.secureUrl}
                    width={asset.width}
                  />
                  <span
                    className="adm-media-card-alt"
                    data-missing={asset.altText.trim() ? undefined : "true"}
                  >
                    {nameOf(asset)}
                  </span>
                  <span className="adm-hint">
                    {usageSummary(asset.usage)}, {formatBytes(asset.bytes)}
                  </span>
                  <button
                    aria-label={`Open “${nameOf(asset)}”`}
                    className="adm-btn"
                    data-variant="quiet"
                    type="button"
                    onClick={() => {
                      setNote(null);
                      setSelected(asset.id);
                    }}
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">
              No images yet. Upload one above; it&apos;s then available in every
              editor&apos;s image picker.
            </p>
          )}
        </section>

        {current ? (
          <AssetDetails
            key={current.id}
            asset={current}
            onDeleted={(asset) => {
              setAssets((list) => list.filter((a) => a.id !== asset.id));
              setSelected(null);
              setNote({
                tone: "ok",
                text: `Deleted “${nameOf(asset)}” permanently.`,
              });
            }}
            onUpdated={(asset) =>
              setAssets((list) =>
                list.map((a) => (a.id === asset.id ? asset : a)),
              )
            }
          />
        ) : (
          <p className="adm-empty adm-media-detail-empty">
            Open an image to edit its alt text and caption, copy its URL, or see
            where it&apos;s used.
          </p>
        )}
      </div>
    </>
  );
}
