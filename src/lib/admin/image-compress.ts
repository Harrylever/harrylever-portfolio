/* Browser-side image optimisation before the direct Cloudinary upload:
   large images are scaled down and re-encoded as WebP with jSquash (WASM).
   The codecs are imported on demand so they never load unless a file needs
   them. Any failure returns the original file, so uploads are never blocked
   by compression. */

/** Longest side, in pixels, of a stored image. */
export const MAX_DIMENSION = 2400;
/** Files below this size are uploaded as they are. */
export const SKIP_BELOW_BYTES = 150 * 1024;
export const WEBP_QUALITY = 82;

export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);

  if (longest <= max) return { width, height };
  const scale = max / longest;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function needsCompression(
  file: { size: number },
  dimensions: { width: number; height: number },
): boolean {
  return (
    file.size >= SKIP_BELOW_BYTES ||
    Math.max(dimensions.width, dimensions.height) > MAX_DIMENSION
  );
}

export function webpName(name: string): string {
  return `${name.replace(/\.[^./\\]+$/, "")}.webp`;
}

async function toImageData(file: File): Promise<ImageData> {
  // Honours EXIF orientation, so phone photos are not rotated.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const canvas = document.createElement("canvas");

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(bitmap, 0, 0);

    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

/**
 * Returns a smaller WebP version of the file, or the file itself when it is
 * already small, cannot be decoded, or would not get smaller.
 */
export async function compressImage(file: File): Promise<File> {
  try {
    const decoded = await toImageData(file);

    if (!needsCompression(file, decoded)) return file;

    const [{ default: encode }, { default: resize }] = await Promise.all([
      import("@jsquash/webp/encode"),
      import("@jsquash/resize"),
    ]);
    const target = fitWithin(decoded.width, decoded.height, MAX_DIMENSION);
    const pixels =
      target.width === decoded.width && target.height === decoded.height
        ? decoded
        : await resize(decoded, target);
    const encoded = await encode(pixels, { quality: WEBP_QUALITY });

    if (encoded.byteLength >= file.size) return file;

    return new File([encoded], webpName(file.name), { type: "image/webp" });
  } catch {
    return file;
  }
}
