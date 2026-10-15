"use client";

import type { AdminMediaAsset } from "@/server/content/media/admin";

import { type KeyboardEvent, useId, useRef, useState } from "react";

import { registerMediaUploadAction } from "@/app/admin/_actions/media";
import { FieldError } from "@/components/admin/content-fields";
import {
  cloudinaryUploadUrl,
  formatBytes,
  parseCloudinaryUpload,
  parseUploadSignature,
  uploadFormFields,
  validateAltText,
  validateImageFile,
} from "@/lib/admin/media-upload";
import { compressImage } from "@/lib/admin/image-compress";
import {
  allowedImageFormats,
  maximumImageBytes,
  maximumSourceBytes,
} from "@/domain/content/media";

/** What a visitor may pick from disk; it is compressed before upload. */
const sourceLimits = {
  maxBytes: maximumSourceBytes,
  allowedFormats: allowedImageFormats,
};

type Phase =
  | { kind: "idle" }
  | { kind: "working"; text: string }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string; retryable: boolean };

/**
 * Signed direct upload: the server signs the parameters, the browser sends
 * the file straight to Cloudinary, and the server verifies Cloudinary's
 * response before the image is registered. No <form> element, because it
 * also lives inside editor forms (via the media picker).
 */
export function MediaUploader({
  onUploaded,
  idPrefix,
}: {
  onUploaded: (asset: AdminMediaAsset) => void;
  /** Stable ids for the media page; pickers get generated ones. */
  idPrefix?: string;
}) {
  const generated = useId();
  const prefix = idPrefix ?? `upload${generated.replace(/:/g, "")}`;
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [altError, setAltError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const working = phase.kind === "working";

  function fail(text: string, retryable = true) {
    setPhase({ kind: "error", text, retryable });
  }

  async function upload() {
    if (working) return;
    const nextFileError = file
      ? validateImageFile(file, sourceLimits)
      : "Choose an image to upload.";
    const nextAltError = validateAltText(altText);

    setFileError(nextFileError);
    setAltError(nextAltError);
    if (nextFileError || nextAltError || !file) {
      setPhase({ kind: "idle" });

      return;
    }

    try {
      setPhase({ kind: "working", text: "Preparing upload…" });
      const signing = await fetch("/api/admin/media/signature", {
        cache: "no-store",
      });

      if (signing.status === 401 || signing.status === 403) {
        return fail("Your session has ended. Sign in again to upload.", false);
      }
      const signature = signing.ok
        ? parseUploadSignature(await signing.json())
        : null;

      if (!signature) {
        return fail("Uploads aren't available right now. Try again shortly.");
      }
      setPhase({ kind: "working", text: "Optimising image…" });
      // Scales large images down and re-encodes them as WebP; falls back to
      // the original file if anything goes wrong.
      const prepared = await compressImage(file);
      const limitError = validateImageFile(prepared, {
        maxBytes: signature.maxBytes,
        allowedFormats: signature.allowedFormats,
      });

      if (limitError) {
        setFileError(limitError);
        setPhase({ kind: "idle" });

        return;
      }

      setPhase({ kind: "working", text: "Uploading to Cloudinary…" });
      const body = new FormData();

      body.append("file", prepared);
      for (const [key, value] of Object.entries(uploadFormFields(signature))) {
        body.append(key, value);
      }
      const response = await fetch(cloudinaryUploadUrl(signature.cloudName), {
        method: "POST",
        body,
      });
      const json: unknown = await response.json().catch(() => null);
      const uploaded = response.ok ? parseCloudinaryUpload(json) : null;

      if (!uploaded) {
        const reason =
          json && typeof json === "object" && "error" in json
            ? String(
                (json as { error?: { message?: unknown } }).error?.message ??
                  "",
              )
            : "";

        return fail(
          `Cloudinary didn't accept the upload${reason ? `: ${reason}` : ""}. Try again.`,
        );
      }

      setPhase({ kind: "working", text: "Checking the upload…" });
      const result = await registerMediaUploadAction({
        ...uploaded,
        altText,
        caption: caption.trim() ? caption : null,
      });

      if (!result.ok) {
        if (result.error.fieldErrors?.altText) {
          setAltError(result.error.fieldErrors.altText.join(" "));
        }

        return fail(
          result.error.code === "UNAUTHORIZED"
            ? "Your session has ended. Sign in again to upload."
            : result.error.message,
          Boolean(result.error.retryable),
        );
      }

      setPhase({ kind: "done", text: `Uploaded “${result.data.altText}”.` });
      setFile(null);
      setAltText("");
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded(result.data);
    } catch {
      fail(
        "Couldn't reach the server or Cloudinary. Check your connection and retry.",
      );
    }
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    // Inside an editor form, Enter would otherwise save the whole form.
    if (event.key === "Enter") {
      event.preventDefault();
      void upload();
    }
  }

  return (
    <div aria-label="Upload a new image" className="adm-uploader" role="group">
      <div className="adm-field">
        <label htmlFor={`${prefix}-file`}>Image file</label>
        <input
          ref={fileRef}
          accept="image/jpeg,image/png,image/webp,image/avif"
          aria-describedby={`${prefix}-file-hint${fileError ? ` ${prefix}-file-error` : ""}`}
          aria-invalid={fileError ? "true" : undefined}
          className="adm-file"
          disabled={working}
          id={`${prefix}-file`}
          type="file"
          onChange={(event) => {
            const chosen = event.target.files?.[0] ?? null;

            setFile(chosen);
            setFileError(
              chosen ? validateImageFile(chosen, sourceLimits) : null,
            );
            if (phase.kind !== "working") setPhase({ kind: "idle" });
          }}
        />
        <p className="adm-hint" id={`${prefix}-file-hint`}>
          JPEG, PNG, WebP or AVIF, up to {formatBytes(maximumSourceBytes)}.
          Large images are scaled down and converted to WebP before upload
          (stored images must be under {formatBytes(maximumImageBytes)}).
          {file && !fileError
            ? ` Selected: ${file.name}, ${formatBytes(file.size)}.`
            : ""}
        </p>
        <FieldError
          errors={fileError ? [fileError] : undefined}
          id={`${prefix}-file-error`}
        />
      </div>
      <div className="adm-field">
        <label htmlFor={`${prefix}-alt`}>Describe this image</label>
        <input
          aria-describedby={`${prefix}-alt-hint${altError ? ` ${prefix}-alt-error` : ""}`}
          aria-invalid={altError ? "true" : undefined}
          disabled={working}
          id={`${prefix}-alt`}
          maxLength={300}
          value={altText}
          onChange={(event) => {
            setAltText(event.target.value);
            if (altError) setAltError(null);
          }}
          onKeyDown={submitOnEnter}
        />
        <p className="adm-hint" id={`${prefix}-alt-hint`}>
          Required. This is the alt text screen readers announce.
        </p>
        <FieldError
          errors={altError ? [altError] : undefined}
          id={`${prefix}-alt-error`}
        />
      </div>
      <div className="adm-field">
        <label htmlFor={`${prefix}-caption`}>Caption (optional)</label>
        <input
          disabled={working}
          id={`${prefix}-caption`}
          maxLength={500}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          onKeyDown={submitOnEnter}
        />
      </div>
      <div className="adm-uploader-actions">
        <button
          className="adm-btn"
          data-variant="solid"
          disabled={working}
          type="button"
          onClick={() => void upload()}
        >
          {working ? "Uploading…" : "Upload image"}
        </button>
        <p
          aria-live="polite"
          className="adm-status"
          data-tone={phase.kind === "done" ? "ok" : "meta"}
          role="status"
        >
          {phase.kind === "working" || phase.kind === "done" ? phase.text : ""}
        </p>
      </div>
      {phase.kind === "error" ? (
        <div className="adm-alert adm-upload-error" role="alert">
          <p>{phase.text}</p>
          {phase.retryable && file ? (
            <button
              className="adm-btn"
              type="button"
              onClick={() => void upload()}
            >
              Retry upload
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
