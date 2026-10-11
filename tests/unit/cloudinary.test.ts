import { describe, expect, test } from "bun:test";
import { v2 as cloudinary } from "cloudinary";

import type { AdminSession } from "@/server/auth/require-admin";
import {
  createUploadSignature,
  type CloudinaryMediaConfig,
  verifyUploadedAssetResponse,
} from "@/server/media/cloudinary";

const admin = {
  user: { id: "admin-id", email: "admin@example.test", role: "admin" },
  session: { id: "session-id", userId: "admin-id" },
} as AdminSession;

const config: CloudinaryMediaConfig = {
  cloudName: "portfolio-test",
  apiKey: "test-key",
  apiSecret: "test-secret",
  folder: "portfolio/test",
};

const authoritativeResource = {
  publicId: "portfolio/test/aizen-cover",
  resourceType: "image" as const,
  secureUrl:
    "https://res.cloudinary.com/portfolio-test/image/upload/v42/aizen-cover.jpg",
  width: 1600,
  height: 900,
  bytes: 120_000,
  format: "jpg",
};

function signedUploadResponse(
  cloudinaryResource = authoritativeResource,
) {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    signature_version: 1,
  });

  return {
    ...cloudinaryResource,
    version: 42,
    signature: cloudinary.utils.api_sign_request(
      { public_id: cloudinaryResource.publicId, version: 42 },
      config.apiSecret,
    ),
  };
}

describe("Cloudinary upload boundary", () => {
  test("rejects anonymous upload-signature requests", async () => {
    await expect(
      createUploadSignature(null, {
        config,
        now: () => new Date("2026-10-11T10:00:00.000Z"),
      }),
    ).rejects.toThrow("Authentication required");
  });

  test("issues only constrained, short-lived image signatures", async () => {
    const result = await createUploadSignature(admin, {
      config,
      now: () => new Date("2026-10-11T10:00:00.000Z"),
    });

    expect(result).toMatchObject({
      cloudName: "portfolio-test",
      apiKey: "test-key",
      folder: "portfolio/test",
      resourceType: "image",
      allowedFormats: ["avif", "jpeg", "jpg", "png", "webp"],
      maxBytes: 10 * 1024 * 1024,
      issuedAt: 1_791_712_800,
      expiresAt: 1_791_712_860,
    });
    expect(result.expiresAt - result.issuedAt).toBeLessThanOrEqual(60);
    expect(result.uploadParameters).toEqual({
      allowed_formats: "avif,jpeg,jpg,png,webp",
      folder: "portfolio/test",
      timestamp: 1_791_712_800,
    });
    expect(result.signature).toBe(
      cloudinary.utils.api_sign_request(
        result.uploadParameters,
        config.apiSecret,
      ),
    );
    expect(JSON.stringify(result)).not.toContain(config.apiSecret);
  });

  test("rejects a tampered upload-response signature", async () => {
    await expect(
      verifyUploadedAssetResponse(
        { ...signedUploadResponse(), signature: "tampered" },
        {
          config,
          getResource: async () => authoritativeResource,
        },
      ),
    ).rejects.toThrow("Invalid upload signature");
  });

  test("rejects browser metadata that differs from Cloudinary", async () => {
    await expect(
      verifyUploadedAssetResponse(
        { ...signedUploadResponse(), bytes: 1 },
        {
          config,
          getResource: async () => authoritativeResource,
        },
      ),
    ).rejects.toThrow("Upload metadata does not match Cloudinary");
  });

  test("rejects resources outside the configured image constraints", async () => {
    const outsideFolder = {
      ...authoritativeResource,
      publicId: "portfolio/production/aizen-cover",
    };
    const response = signedUploadResponse(outsideFolder);

    await expect(
      verifyUploadedAssetResponse(response, {
        config,
        getResource: async () => outsideFolder,
      }),
    ).rejects.toThrow("Uploaded image is outside the configured folder");

    await expect(
      verifyUploadedAssetResponse(
        {
          ...signedUploadResponse(),
          bytes: 10 * 1024 * 1024 + 1,
        },
        {
          config,
          getResource: async () => ({
            ...authoritativeResource,
            bytes: 10 * 1024 * 1024 + 1,
          }),
        },
      ),
    ).rejects.toThrow("Uploaded image is too large");
  });
});
