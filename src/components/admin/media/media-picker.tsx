"use client";

import type { MediaPickerAsset } from "@/app/admin/_actions/media";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { listMediaForPickerAction } from "@/app/admin/_actions/media";
import { MediaUploader } from "@/components/admin/media/media-uploader";

export type { MediaPickerAsset };

/**
 * Upload slot: render an uploader and call `onUploaded` with the newly
 * registered asset; the picker adds and selects it. Defaults to the signed
 * direct-to-Cloudinary uploader.
 */
export type MediaUploadSlot = (
  onUploaded: (asset: MediaPickerAsset) => void,
) => ReactNode;

/** Registered media known to a form, refreshed when the picker opens. */
export function useMediaLibrary(initial: MediaPickerAsset[]) {
  const [assets, setAssets] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const byId = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMediaForPickerAction();

      if (result.ok) {
        setAssets(result.data);
        setError(null);
      } else {
        setError(
          result.error.code === "UNAUTHORIZED"
            ? "Your session has ended. Sign in again to load images."
            : "The media library couldn't load. Try again shortly.",
        );
      }
    } catch {
      setError("Couldn't reach the server to load images.");
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback((asset: MediaPickerAsset) => {
    setAssets((current) => [
      asset,
      ...current.filter((item) => item.id !== asset.id),
    ]);
  }, []);

  return { assets, byId, error, loading, refresh, add };
}

export type MediaLibrary = ReturnType<typeof useMediaLibrary>;

export const defaultUploadSlot: MediaUploadSlot = (onUploaded) => (
  <details className="adm-upload-details">
    <summary>Upload a new image</summary>
    <MediaUploader
      onUploaded={({ id, secureUrl, altText, caption, width, height }) =>
        onUploaded({ id, secureUrl, altText, caption, width, height })
      }
    />
  </details>
);

/**
 * Modal chooser over registered images, with an upload slot (by default
 * the signed uploader) so a new image can be added and picked in one go.
 */
export function MediaPicker({
  open,
  title,
  library,
  selectedId,
  onSelect,
  onClose,
  renderUpload = defaultUploadSlot,
}: {
  open: boolean;
  title: string;
  library: MediaLibrary;
  selectedId?: string | null;
  onSelect: (asset: MediaPickerAsset) => void;
  onClose: () => void;
  renderUpload?: MediaUploadSlot;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const radioName = useId();
  const [choice, setChoice] = useState<string | null>(selectedId ?? null);
  const { refresh } = library;

  useEffect(() => {
    const dialog = ref.current;

    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setChoice(selectedId ?? null);
      dialog.showModal();
      void refresh();
    } else if (!open && dialog.open) {
      dialog.close();
      opener.current?.focus();
    }
  }, [open, refresh, selectedId]);

  const chosen = choice ? library.byId.get(choice) : undefined;

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      className="adm-dialog adm-dialog-wide"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 className="adm-dialog-title" id={headingId}>
        {title}
      </h2>
      {renderUpload((asset) => {
        library.add(asset);
        setChoice(asset.id);
      })}
      {library.error ? (
        <p className="adm-alert" role="alert">
          {library.error}
        </p>
      ) : null}
      {library.assets.length === 0 && !library.loading ? (
        <p className="adm-empty">
          No images yet. Upload one above, or in the media library.
        </p>
      ) : (
        <fieldset aria-busy={library.loading} className="adm-media-grid">
          <legend className="adm-visually-hidden">Images</legend>
          {library.assets.map((asset) => (
            <label key={asset.id} className="adm-media-option">
              <input
                checked={choice === asset.id}
                name={radioName}
                type="radio"
                value={asset.id}
                onChange={() => setChoice(asset.id)}
              />
              {/* Cloudinary URLs are already sized by the media service. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                height={asset.height}
                loading="lazy"
                src={asset.secureUrl}
                width={asset.width}
              />
              <span className="adm-media-alt">
                {asset.altText || "Missing alt text"}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {chosen && !chosen.altText.trim() ? (
        <p className="adm-hint">
          This image has no alt text yet. Add it in the media library before
          publishing.
        </p>
      ) : null}
      <div className="adm-dialog-actions">
        <button className="adm-btn" type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="adm-btn"
          data-variant="solid"
          disabled={!chosen}
          type="button"
          onClick={() => {
            if (chosen) onSelect(chosen);
            onClose();
          }}
        >
          Use image
        </button>
      </div>
    </dialog>
  );
}

/** A thumbnail for an asset id, or a note when it can't be resolved. */
export function MediaThumb({
  asset,
  id,
}: {
  asset?: MediaPickerAsset;
  id: string;
}) {
  if (!asset) {
    return (
      <span className="adm-media-missing">
        Image {id.slice(0, 6)}… isn&apos;t in the media library
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={asset.altText}
      className="adm-media-thumb"
      height={asset.height}
      src={asset.secureUrl}
      width={asset.width}
    />
  );
}

/** Single image field (cover images). */
export function MediaField({
  label,
  value,
  onChange,
  library,
  error,
  renderUpload,
}: {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  library: MediaLibrary;
  error?: string[];
  renderUpload?: MediaUploadSlot;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();

  return (
    <div aria-labelledby={labelId} className="adm-field" role="group">
      <span className="adm-label" id={labelId}>
        {label}
      </span>
      <div className="adm-media-field">
        {value ? (
          <MediaThumb asset={library.byId.get(value)} id={value} />
        ) : (
          <span className="adm-empty">No image chosen</span>
        )}
        <div className="adm-media-field-actions">
          <button
            className="adm-btn"
            type="button"
            onClick={() => setOpen(true)}
          >
            {value ? "Change image" : "Choose image"}
          </button>
          {value ? (
            <button
              className="adm-btn"
              data-variant="quiet"
              type="button"
              onClick={() => onChange(null)}
            >
              Remove image
            </button>
          ) : null}
        </div>
      </div>
      {error?.length ? (
        <p className="adm-field-error">{error.join(" ")}</p>
      ) : null}
      <MediaPicker
        library={library}
        open={open}
        renderUpload={renderUpload}
        selectedId={value}
        title={`Choose ${label.toLowerCase()}`}
        onClose={() => setOpen(false)}
        onSelect={(asset) => onChange(asset.id)}
      />
    </div>
  );
}

/** Ordered list of images (project gallery). */
export function MediaListField({
  label,
  value,
  onChange,
  library,
  error,
  renderUpload,
}: {
  label: string;
  value: string[];
  onChange: (ids: string[]) => void;
  library: MediaLibrary;
  error?: string[];
  renderUpload?: MediaUploadSlot;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();

  return (
    <div aria-labelledby={labelId} className="adm-field" role="group">
      <span className="adm-label" id={labelId}>
        {label}
      </span>
      {value.length ? (
        <ol className="adm-media-list">
          {value.map((id, index) => {
            const asset = library.byId.get(id);
            const name = asset?.altText || `image ${index + 1}`;

            return (
              <li key={`${id}-${index}`}>
                <MediaThumb asset={asset} id={id} />
                <div className="adm-media-field-actions">
                  <button
                    aria-label={`Move ${name} earlier`}
                    className="adm-btn"
                    data-variant="quiet"
                    disabled={index === 0}
                    type="button"
                    onClick={() => {
                      const next = [...value];

                      [next[index - 1], next[index]] = [
                        next[index],
                        next[index - 1],
                      ];
                      onChange(next);
                    }}
                  >
                    Earlier
                  </button>
                  <button
                    aria-label={`Remove ${name} from the gallery`}
                    className="adm-btn"
                    data-variant="quiet"
                    type="button"
                    onClick={() =>
                      onChange(value.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="adm-empty">No gallery images.</p>
      )}
      <div>
        <button className="adm-btn" type="button" onClick={() => setOpen(true)}>
          Add image
        </button>
      </div>
      {error?.length ? (
        <p className="adm-field-error">{error.join(" ")}</p>
      ) : null}
      <MediaPicker
        library={library}
        open={open}
        renderUpload={renderUpload}
        title={`Add to ${label.toLowerCase()}`}
        onClose={() => setOpen(false)}
        onSelect={(asset) =>
          onChange(value.includes(asset.id) ? value : [...value, asset.id])
        }
      />
    </div>
  );
}
