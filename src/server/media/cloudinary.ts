import type { AdminSession } from "@/server/auth/require-admin";

import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";

export const allowedImageFormats = [
  "avif",
  "jpeg",
  "jpg",
  "png",
  "webp",
] as const;
export const maximumImageBytes = 10 * 1024 * 1024;
const signatureLifetimeSeconds = 60;

export type CloudinaryMediaConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

export type CloudinaryResource = {
  publicId: string;
  resourceType: "image";
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

export type UploadedAssetResponse = CloudinaryResource & {
  version: number;
  signature: string;
};

type ResourceLookup = (publicId: string) => Promise<CloudinaryResource>;
type DestroyResource = (
  publicId: string,
) => Promise<{ result?: string } | undefined>;

export type CloudinaryMediaDependencies = {
  config?: CloudinaryMediaConfig;
  getResource?: ResourceLookup;
  destroyResource?: DestroyResource;
};

const responseSchema = z.strictObject({
  publicId: z.string().trim().min(1).max(500),
  version: z.number().int().positive(),
  signature: z.string().trim().min(1).max(200),
  resourceType: z.literal("image"),
  secureUrl: z.url().startsWith("https://"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  format: z.string().trim().min(1).max(40),
});

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) throw new Error(`${name} is required for Cloudinary media`);

  return value;
}

export function cloudinaryMediaConfig(): CloudinaryMediaConfig {
  return {
    cloudName: requiredEnvironmentValue("CLOUDINARY_CLOUD_NAME"),
    apiKey: requiredEnvironmentValue("CLOUDINARY_API_KEY"),
    apiSecret: requiredEnvironmentValue("CLOUDINARY_API_SECRET"),
    folder: requiredEnvironmentValue("CLOUDINARY_FOLDER_PREFIX").replace(
      /^\/+|\/+$/g,
      "",
    ),
  };
}

function configure(config: CloudinaryMediaConfig) {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
  });
}

function assertAdmin(actor: AdminSession | null | undefined) {
  if (!actor) throw new Error("Authentication required");
  if (actor.user.role !== "admin") throw new Error("Administrator required");
}

export async function createUploadSignature(
  actor: AdminSession | null | undefined,
  options: {
    config?: CloudinaryMediaConfig;
    now?: () => Date;
  } = {},
) {
  assertAdmin(actor);
  const config = options.config ?? cloudinaryMediaConfig();
  const issuedAt = Math.floor((options.now?.() ?? new Date()).getTime() / 1000);
  const uploadParameters = {
    allowed_formats: allowedImageFormats.join(","),
    folder: config.folder,
    timestamp: issuedAt,
  };

  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    folder: config.folder,
    resourceType: "image" as const,
    allowedFormats: [...allowedImageFormats],
    maxBytes: maximumImageBytes,
    issuedAt,
    expiresAt: issuedAt + signatureLifetimeSeconds,
    uploadParameters,
    signature: cloudinary.utils.api_sign_request(
      uploadParameters,
      config.apiSecret,
    ),
  };
}

async function getCloudinaryResource(
  publicId: string,
): Promise<CloudinaryResource> {
  const resource = (await cloudinary.api.resource(publicId, {
    resource_type: "image",
    type: "upload",
  })) as Record<string, unknown>;

  return responseSchema.omit({ version: true, signature: true }).parse({
    publicId: resource.public_id,
    resourceType: resource.resource_type,
    secureUrl: resource.secure_url,
    width: resource.width,
    height: resource.height,
    bytes: resource.bytes,
    format: resource.format,
  });
}

function sameMetadata(
  response: UploadedAssetResponse,
  resource: CloudinaryResource,
) {
  return (
    response.publicId === resource.publicId &&
    response.resourceType === resource.resourceType &&
    response.secureUrl === resource.secureUrl &&
    response.width === resource.width &&
    response.height === resource.height &&
    response.bytes === resource.bytes &&
    response.format.toLowerCase() === resource.format.toLowerCase()
  );
}

export async function verifyUploadedAssetResponse(
  input: UploadedAssetResponse,
  dependencies: CloudinaryMediaDependencies = {},
): Promise<CloudinaryResource> {
  const response = responseSchema.parse({
    publicId: input.publicId,
    version: input.version,
    signature: input.signature,
    resourceType: input.resourceType,
    secureUrl: input.secureUrl,
    width: input.width,
    height: input.height,
    bytes: input.bytes,
    format: input.format,
  });
  const config = dependencies.config ?? cloudinaryMediaConfig();

  configure(config);
  const verifyResponseSignature = (
    cloudinary.utils as typeof cloudinary.utils & {
      verify_api_response_signature: (
        publicId: string,
        version: number,
        signature: string,
      ) => boolean;
    }
  ).verify_api_response_signature;

  if (
    !verifyResponseSignature(
      response.publicId,
      response.version,
      response.signature,
    )
  ) {
    throw new Error("Invalid upload signature");
  }

  const resource = await (dependencies.getResource ?? getCloudinaryResource)(
    response.publicId,
  );

  if (!sameMetadata(response, resource)) {
    throw new Error("Upload metadata does not match Cloudinary");
  }
  if (!resource.publicId.startsWith(`${config.folder}/`)) {
    throw new Error("Uploaded image is outside the configured folder");
  }
  if (
    !allowedImageFormats.includes(
      resource.format.toLowerCase() as (typeof allowedImageFormats)[number],
    )
  ) {
    throw new Error("Uploaded image format is not allowed");
  }
  if (resource.bytes > maximumImageBytes) {
    throw new Error("Uploaded image is too large");
  }

  return { ...resource, format: resource.format.toLowerCase() };
}

export async function destroyCloudinaryResource(
  publicId: string,
  dependencies: CloudinaryMediaDependencies = {},
) {
  const config = dependencies.config ?? cloudinaryMediaConfig();

  configure(config);

  return (
    dependencies.destroyResource ??
    ((id) =>
      cloudinary.uploader.destroy(id, {
        resource_type: "image",
        type: "upload",
        invalidate: true,
      }))
  )(publicId);
}
