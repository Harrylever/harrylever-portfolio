import { z } from "zod";

import { allowedImageFormats, maximumImageBytes } from "@/domain/content/media";

/* Browser-side helpers for the signed direct upload to Cloudinary. The
   server signs the parameters (the API secret never reaches the browser)
   and verifies the response before anything is registered. */

export type UploadLimits = {
  maxBytes: number;
  allowedFormats: readonly string[];
};

const defaultLimits: UploadLimits = {
  maxBytes: maximumImageBytes,
  allowedFormats: allowedImageFormats,
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "");

  return `${mb} MB`;
}

function formatOf(file: { name: string; type: string }) {
  const fromType = /^image\/([a-z0-9.+-]+)$/i.exec(file.type)?.[1];
  const fromName = /\.([a-z0-9]+)$/i.exec(file.name)?.[1];

  return (fromType ?? fromName ?? "").toLowerCase();
}

export function validateImageFile(
  file: { name: string; size: number; type: string },
  limits: UploadLimits = defaultLimits,
): string | null {
  if (!limits.allowedFormats.includes(formatOf(file))) {
    return "Use a JPEG, PNG, WebP or AVIF image.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > limits.maxBytes) {
    return `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(limits.maxBytes)} per image.`;
  }

  return null;
}

export function validateAltText(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) return "Describe the image for people who can't see it.";
  if (trimmed.length > 300) return "Keep alt text to 300 characters or fewer.";

  return null;
}

const signatureSchema = z.object({
  cloudName: z.string().min(1),
  apiKey: z.string().min(1),
  folder: z.string().min(1),
  allowedFormats: z.array(z.string()),
  maxBytes: z.number().int().positive(),
  expiresAt: z.number(),
  uploadParameters: z.object({
    allowed_formats: z.string(),
    folder: z.string(),
    timestamp: z.number().int(),
  }),
  signature: z.string().min(1),
});

export type UploadSignature = z.infer<typeof signatureSchema>;

export function parseUploadSignature(value: unknown): UploadSignature | null {
  const parsed = signatureSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}

export function cloudinaryUploadUrl(cloudName: string) {
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
}

/** Exactly the signed fields Cloudinary needs alongside the file. */
export function uploadFormFields(signature: UploadSignature) {
  return {
    api_key: signature.apiKey,
    allowed_formats: signature.uploadParameters.allowed_formats,
    folder: signature.uploadParameters.folder,
    timestamp: String(signature.uploadParameters.timestamp),
    signature: signature.signature,
  };
}

const uploadResponseSchema = z.object({
  public_id: z.string().min(1),
  version: z.number().int(),
  signature: z.string().min(1),
  resource_type: z.literal("image"),
  secure_url: z.string().min(1),
  width: z.number().int(),
  height: z.number().int(),
  bytes: z.number().int(),
  format: z.string().min(1),
});

export type UploadedImage = {
  publicId: string;
  version: number;
  signature: string;
  resourceType: "image";
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

/** Cloudinary's upload response, mapped for server-side verification. */
export function parseCloudinaryUpload(value: unknown): UploadedImage | null {
  const parsed = uploadResponseSchema.safeParse(value);

  if (!parsed.success) return null;
  const data = parsed.data;

  return {
    publicId: data.public_id,
    version: data.version,
    signature: data.signature,
    resourceType: data.resource_type,
    secureUrl: data.secure_url,
    width: data.width,
    height: data.height,
    bytes: data.bytes,
    format: data.format,
  };
}
