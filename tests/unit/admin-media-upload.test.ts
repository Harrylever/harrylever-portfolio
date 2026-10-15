import { describe, expect, test } from "bun:test";

import { maximumImageBytes, maximumSourceBytes } from "@/domain/content/media";
import {
  cloudinaryUploadUrl,
  formatBytes,
  parseCloudinaryUpload,
  parseUploadSignature,
  uploadFormFields,
  validateAltText,
  validateImageFile,
} from "@/lib/admin/media-upload";
import {
  groupUsage,
  usageSummary,
  usedByMessage,
} from "@/lib/admin/media-usage";
import { e2eMediaDependencies } from "@/server/media/e2e-fake";

const MiB = 1024 * 1024;

const signature = {
  cloudName: "demo",
  apiKey: "key-123",
  folder: "development/portfolio",
  resourceType: "image",
  allowedFormats: ["avif", "jpeg", "jpg", "png", "webp"],
  maxBytes: 10 * MiB,
  issuedAt: 100,
  expiresAt: 160,
  uploadParameters: {
    allowed_formats: "avif,jpeg,jpg,png,webp",
    folder: "development/portfolio",
    timestamp: 100,
  },
  signature: "abc123",
};

describe("source image limit", () => {
  test("accepts a large phone photo as a source but not as a stored image", () => {
    const photo = { name: "p.jpg", size: 20 * MiB, type: "image/jpeg" };

    expect(maximumSourceBytes).toBeGreaterThan(maximumImageBytes);
    expect(
      validateImageFile(photo, {
        maxBytes: maximumSourceBytes,
        allowedFormats: ["jpeg"],
      }),
    ).toBeNull();
    expect(validateImageFile(photo)).toContain("The limit is 10 MB");
  });
});

describe("browser upload helpers", () => {
  test("validates size and type before anything is uploaded", () => {
    expect(
      validateImageFile({ name: "a.png", size: 2048, type: "image/png" }),
    ).toBeNull();
    expect(
      validateImageFile({ name: "a.JPG", size: 10 * MiB, type: "image/jpeg" }),
    ).toBeNull();
    expect(
      validateImageFile({
        name: "a.png",
        size: 10 * MiB + 1,
        type: "image/png",
      }),
    ).toBe("That image is 10 MB. The limit is 10 MB per image.");
    expect(
      validateImageFile({ name: "a.gif", size: 10, type: "image/gif" }),
    ).toBe("Use a JPEG, PNG, WebP or AVIF image.");
    expect(
      validateImageFile({ name: "a.svg", size: 10, type: "image/svg+xml" }),
    ).toBe("Use a JPEG, PNG, WebP or AVIF image.");
    expect(
      validateImageFile({ name: "a.png", size: 0, type: "image/png" }),
    ).toBe("That file is empty.");
    expect(
      validateImageFile(
        { name: "a.png", size: 3 * MiB, type: "image/png" },
        { maxBytes: 2 * MiB, allowedFormats: ["png"] },
      ),
    ).toBe("That image is 3 MB. The limit is 2 MB per image.");
  });

  test("formats sizes for people", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1.5 * MiB)).toBe("1.5 MB");
    expect(formatBytes(10 * MiB)).toBe("10 MB");
  });

  test("requires alt text", () => {
    expect(validateAltText("  ")).toBe(
      "Describe the image for people who can't see it.",
    );
    expect(validateAltText("x".repeat(301))).toBe(
      "Keep alt text to 300 characters or fewer.",
    );
    expect(validateAltText("A desk")).toBeNull();
  });

  test("builds the signed upload form without any secret", () => {
    const parsed = parseUploadSignature(signature);

    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(uploadFormFields(parsed)).toEqual({
      api_key: "key-123",
      allowed_formats: "avif,jpeg,jpg,png,webp",
      folder: "development/portfolio",
      timestamp: "100",
      signature: "abc123",
    });
    expect(cloudinaryUploadUrl("demo cloud")).toBe(
      "https://api.cloudinary.com/v1_1/demo%20cloud/image/upload",
    );
    expect(parseUploadSignature({ ...signature, signature: 4 })).toBeNull();
    expect(parseUploadSignature(null)).toBeNull();
  });

  test("maps Cloudinary's upload response to the registration shape", () => {
    expect(
      parseCloudinaryUpload({
        public_id: "development/portfolio/x",
        version: 42,
        signature: "sig",
        resource_type: "image",
        secure_url: "https://res.cloudinary.com/demo/x.png",
        width: 10,
        height: 20,
        bytes: 300,
        format: "png",
        api_key: "ignored",
      }),
    ).toEqual({
      publicId: "development/portfolio/x",
      version: 42,
      signature: "sig",
      resourceType: "image",
      secureUrl: "https://res.cloudinary.com/demo/x.png",
      width: 10,
      height: 20,
      bytes: 300,
      format: "png",
    });
    expect(parseCloudinaryUpload({ error: { message: "nope" } })).toBeNull();
  });
});

describe("media usage copy", () => {
  const usage = [
    {
      contentType: "project" as const,
      contentId: "p1",
      snapshot: "draft" as const,
      field: "coverAssetId",
      label: "Project “Atlas”",
      href: "/admin/projects/p1",
      trashed: false,
    },
    {
      contentType: "project" as const,
      contentId: "p1",
      snapshot: "published" as const,
      field: "coverAssetId",
      label: "Project “Atlas”",
      href: "/admin/projects/p1",
      trashed: false,
    },
    {
      contentType: "home_section" as const,
      contentId: "h1",
      snapshot: "draft" as const,
      field: "items[0].mediaAssetId",
      label: "Homepage: Frames",
      href: "/admin/home/frames",
      trashed: false,
    },
  ];

  test("groups usage by item", () => {
    expect(groupUsage(usage)).toEqual([
      {
        key: "project:p1",
        label: "Project “Atlas”",
        href: "/admin/projects/p1",
        snapshots: ["draft", "published"],
        trashed: false,
      },
      {
        key: "home_section:h1",
        label: "Homepage: Frames",
        href: "/admin/home/frames",
        snapshots: ["draft"],
        trashed: false,
      },
    ]);
    expect(usageSummary([])).toBe("Not used");
    expect(usageSummary(usage)).toBe("Used by 2 items");
    expect(usageSummary(usage.slice(0, 1))).toBe("Used by 1 item");
  });

  test("explains why a referenced image can't be deleted", () => {
    expect(usedByMessage("A desk", usage)).toBe(
      "“A desk” is used by Project “Atlas” (draft and published) and Homepage: Frames (draft). Remove it there before deleting it.",
    );
  });
});

describe("E2E Cloudinary fake", () => {
  test("is inert unless explicitly enabled outside production", () => {
    const env = process.env as Record<string, string | undefined>;
    const previous = {
      dir: env.E2E_CLOUDINARY_FAKE_DIR,
      node: env.NODE_ENV,
      vercel: env.VERCEL,
    };

    try {
      delete env.E2E_CLOUDINARY_FAKE_DIR;
      expect(e2eMediaDependencies()).toEqual({});
      env.E2E_CLOUDINARY_FAKE_DIR = "/tmp/fake";
      env.NODE_ENV = "production";
      expect(e2eMediaDependencies()).toEqual({});
      env.NODE_ENV = "development";
      env.VERCEL = "1";
      expect(e2eMediaDependencies()).toEqual({});
      delete env.VERCEL;
      expect(Object.keys(e2eMediaDependencies()).sort()).toEqual([
        "destroyResource",
        "getResource",
        "insertAsset",
      ]);
    } finally {
      for (const [key, value] of [
        ["E2E_CLOUDINARY_FAKE_DIR", previous.dir],
        ["NODE_ENV", previous.node],
        ["VERCEL", previous.vercel],
      ] as const) {
        if (value === undefined) delete env[key];
        else env[key] = value;
      }
    }
  });
});
