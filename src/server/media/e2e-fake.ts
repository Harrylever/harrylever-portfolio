import type { MediaAssetInsert } from "@/server/content/media/repository";
import type { CloudinaryResource } from "@/server/media/cloudinary";

import { appendFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

/**
 * Test seam for the Playwright media suite, inert unless
 * E2E_CLOUDINARY_FAKE_DIR is set on a non-production, non-Vercel server
 * (playwright.config.ts sets it, with fake Cloudinary credentials, only for
 * the dev server it starts). It stands in for Cloudinary's Admin API:
 * - getResource reads the record the intercepted browser upload stored;
 * - destroyResource removes it and logs the public ID;
 * - insertAsset fails once when the suite drops a flag file, to exercise
 *   the orphaned-registration retry.
 * Signature verification and every database write stay real.
 */
export function e2eMediaDependencies() {
  const dir = process.env.E2E_CLOUDINARY_FAKE_DIR;

  if (!dir || process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return {};
  }
  const resourcePath = (publicId: string) =>
    join(dir, "resources", `${encodeURIComponent(publicId)}.json`);

  return {
    getResource: async (publicId: string): Promise<CloudinaryResource> =>
      JSON.parse(await readFile(resourcePath(publicId), "utf8")),
    destroyResource: async (publicId: string) => {
      await rm(resourcePath(publicId), { force: true });
      await appendFile(join(dir, "destroyed.log"), `${publicId}\n`);

      return { result: "ok" };
    },
    insertAsset: async (values: MediaAssetInsert) => {
      const flag = join(dir, "fail-next-registration");
      const failing = await rm(flag).then(
        () => true,
        () => false,
      );

      if (failing) throw new Error("E2E: simulated registration failure");
      const [{ db }, { insertMediaAsset }] = await Promise.all([
        import("@/server/db/client"),
        import("@/server/content/media/repository"),
      ]);

      return insertMediaAsset(db, values);
    },
  };
}
