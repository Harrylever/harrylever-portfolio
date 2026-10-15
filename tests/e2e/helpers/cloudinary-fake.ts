import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

import { type Page, expect } from "@playwright/test";

/*
 * No Cloudinary credentials are used by the E2E suite. playwright.config.ts
 * starts the dev server with these fake values (overriding anything in
 * .env.local), so a real cloud can never receive test uploads:
 * - the browser's direct upload to api.cloudinary.com is intercepted by
 *   Playwright (installCloudinaryFake), which checks the server-made
 *   signature and answers like Cloudinary, signing the response with the
 *   fake secret;
 * - the server's verification lookup and destroy calls go through the
 *   env-gated seam in src/server/media/e2e-fake.ts, which reads/writes the
 *   resources this file stores in fakeCloudinary.dir.
 */
export const fakeCloudinary = {
  cloudName: "e2e-fake-cloud",
  apiKey: "e2e-fake-key",
  apiSecret: "e2e-fake-secret-never-real",
  folder: "e2e/portfolio-test",
  dir: join(tmpdir(), "harrylever-portfolio-e2e-cloudinary"),
} as const;

export function fakeCloudinaryServerEnv() {
  return {
    CLOUDINARY_CLOUD_NAME: fakeCloudinary.cloudName,
    CLOUDINARY_API_KEY: fakeCloudinary.apiKey,
    CLOUDINARY_API_SECRET: fakeCloudinary.apiSecret,
    CLOUDINARY_FOLDER_PREFIX: fakeCloudinary.folder,
    E2E_CLOUDINARY_FAKE_DIR: fakeCloudinary.dir,
  };
}

const resourcesDir = join(fakeCloudinary.dir, "resources");
const destroyedLog = join(fakeCloudinary.dir, "destroyed.log");
const failFlag = join(fakeCloudinary.dir, "fail-next-registration");

export function resetFakeCloudinary() {
  rmSync(fakeCloudinary.dir, { recursive: true, force: true });
  mkdirSync(resourcesDir, { recursive: true });
}

export function failNextRegistration() {
  writeFileSync(failFlag, "1");
}

export function destroyedPublicIds(): string[] {
  return existsSync(destroyedLog)
    ? readFileSync(destroyedLog, "utf8").split("\n").filter(Boolean)
    : [];
}

function sha1(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

/** A tiny valid PNG of the given size (solid sage). */
/** `noisy` fills the pixels with random bytes so the PNG does not compress. */
export function pngBytes(width = 4, height = 3, noisy = false): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;

    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;

    return c >>> 0;
  });
  const crc = (buffer: Buffer) => {
    let c = 0xffffffff;

    for (const byte of Array.from(buffer))
      c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);

    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);

    length.writeUInt32BE(data.length);
    sum.writeUInt32BE(crc(body));

    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);

  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const flatRow = Buffer.concat([
    Buffer.from([0]),
    Buffer.alloc(width * 3, Buffer.from([0x9d, 0xb0, 0x9a])),
  ]);
  const raw = Buffer.concat(
    Array.from({ length: height }, () =>
      noisy
        ? Buffer.concat([Buffer.from([0]), randomBytes(width * 3)])
        : flatRow,
    ),
  );

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

type Part = { name: string; filename?: string; data: Buffer };

function parseMultipart(body: Buffer, contentType: string): Part[] {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);

  if (!boundary) throw new Error("Upload was not multipart");
  const delimiter = Buffer.from(`--${boundary[1] ?? boundary[2]}`);
  const parts: Part[] = [];
  let start = body.indexOf(delimiter);

  while (start !== -1) {
    const next = body.indexOf(delimiter, start + delimiter.length);

    if (next === -1) break;
    const part = body.subarray(start + delimiter.length + 2, next - 2);
    const split = part.indexOf("\r\n\r\n");
    const head = part.subarray(0, split).toString("utf8");
    const name = /name="([^"]*)"/.exec(head)?.[1] ?? "";
    const filename = /filename="([^"]*)"/.exec(head)?.[1];

    parts.push({ name, filename, data: part.subarray(split + 4) });
    start = next;
  }

  return parts;
}

/** Format and pixel size of an uploaded PNG or WebP (VP8, VP8L or VP8X). */
function imageInfo(data: Buffer): {
  format: "png" | "webp";
  width: number;
  height: number;
} {
  if (data.subarray(8, 12).toString("latin1") === "WEBP") {
    const kind = data.subarray(12, 16).toString("latin1");

    if (kind === "VP8X") {
      return {
        format: "webp",
        width: 1 + data.readUIntLE(24, 3),
        height: 1 + data.readUIntLE(27, 3),
      };
    }
    if (kind === "VP8L") {
      const bits = data.readUInt32LE(21);

      return {
        format: "webp",
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      };
    }

    return {
      format: "webp",
      width: data.readUInt16LE(26) & 0x3fff,
      height: data.readUInt16LE(28) & 0x3fff,
    };
  }

  return {
    format: "png",
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}

export type FakeUploadLog = {
  uploads: Array<{
    publicId: string;
    fields: Record<string, string>;
    format: "png" | "webp";
    bytes: number;
    width: number;
    height: number;
  }>;
  rawBodies: string[];
  /** Makes the next upload response disagree with what Cloudinary stores. */
  tamperNextResponse: boolean;
};

let sequence = 0;

/**
 * Intercepts the browser's direct Cloudinary upload (and image delivery).
 * Rejects any upload whose signature doesn't match what the server signed.
 */
export async function installCloudinaryFake(
  page: Page,
): Promise<FakeUploadLog> {
  const log: FakeUploadLog = {
    uploads: [],
    rawBodies: [],
    tamperNextResponse: false,
  };

  mkdirSync(resourcesDir, { recursive: true });
  await page.route("https://res.cloudinary.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: pngBytes() }),
  );
  await page.route("https://api.cloudinary.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    expect(url.pathname).toBe(`/v1_1/${fakeCloudinary.cloudName}/image/upload`);
    expect(request.method()).toBe("POST");
    const body = request.postDataBuffer() ?? Buffer.alloc(0);

    log.rawBodies.push(body.toString("latin1"));
    const parts = parseMultipart(
      body,
      (await request.allHeaders())["content-type"] ?? "",
    );
    const fields = Object.fromEntries(
      parts
        .filter((part) => !part.filename)
        .map((part) => [part.name, part.data.toString("utf8")]),
    );
    const file = parts.find((part) => part.filename !== undefined);
    const expectedSignature = sha1(
      `allowed_formats=${fields.allowed_formats}&folder=${fields.folder}&timestamp=${fields.timestamp}${fakeCloudinary.apiSecret}`,
    );

    if (
      !file ||
      fields.api_key !== fakeCloudinary.apiKey ||
      fields.signature !== expectedSignature ||
      fields.folder !== fakeCloudinary.folder
    ) {
      await route.fulfill({
        status: 401,
        json: { error: { message: "Invalid Signature" } },
      });

      return;
    }
    sequence += 1;
    const publicId = `${fakeCloudinary.folder}/e2e-cms-${Date.now().toString(36)}-${sequence}`;
    const version = 1_700_000_000 + sequence;
    const { format, width, height } = imageInfo(file.data);
    const stored = {
      publicId,
      resourceType: "image",
      secureUrl: `https://res.cloudinary.com/${fakeCloudinary.cloudName}/image/upload/v${version}/${publicId}.${format}`,
      width,
      height,
      bytes: file.data.length,
      format,
    };

    writeFileSync(
      join(resourcesDir, `${encodeURIComponent(publicId)}.json`),
      JSON.stringify(stored),
    );
    log.uploads.push({
      publicId,
      fields,
      format,
      bytes: file.data.length,
      width,
      height,
    });
    const tamper = log.tamperNextResponse;

    log.tamperNextResponse = false;
    await route.fulfill({
      status: 200,
      json: {
        public_id: publicId,
        version,
        signature: sha1(
          `public_id=${publicId}&version=${version}${fakeCloudinary.apiSecret}`,
        ),
        resource_type: "image",
        secure_url: stored.secureUrl,
        width: tamper ? width + 1000 : width,
        height,
        bytes: stored.bytes,
        format,
        api_key: fakeCloudinary.apiKey,
      },
    });
  });

  return log;
}
