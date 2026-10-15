/* Delivery-time optimisation for Cloudinary images. The stored URL is the
   original upload; these helpers ask Cloudinary for an automatic format
   (AVIF/WebP where the browser supports it), automatic quality and a width,
   without changing what is stored. */

export const imageWidths = [480, 800, 1200, 1600, 2000] as const;

const uploadSegment = "/image/upload/";
// A Cloudinary transformation starts with a "x_" style parameter; a version
// ("v123…") or a plain folder name does not.
const transformation = /^[a-z]{1,3}_/;

function parse(url: string): URL | null {
  try {
    const parsed = new URL(url);

    return parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.includes(uploadSegment)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function optimizedImageUrl(secureUrl: string, width?: number): string {
  const parsed = parse(secureUrl);

  if (!parsed) return secureUrl;
  const [head, tail] = parsed.pathname.split(uploadSegment, 2);

  if (!tail || transformation.test(tail.split("/")[0])) return secureUrl;
  const params = [
    "f_auto",
    "q_auto",
    ...(width ? [`w_${width}`, "c_limit"] : []),
  ];

  parsed.pathname = `${head}${uploadSegment}${params.join(",")}/${tail}`;

  return parsed.toString();
}

/** A `srcSet` of widths up to the image's own width, or undefined. */
export function imageSrcSet(
  secureUrl: string,
  intrinsicWidth: number,
): string | undefined {
  if (!parse(secureUrl)) return undefined;
  const widths: number[] = imageWidths.filter(
    (width) => width < intrinsicWidth,
  );

  if (intrinsicWidth <= imageWidths[imageWidths.length - 1]) {
    widths.push(intrinsicWidth);
  }

  return widths
    .map((width) => `${optimizedImageUrl(secureUrl, width)} ${width}w`)
    .join(", ");
}
