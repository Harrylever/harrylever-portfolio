import { siteConfig } from "@/config/site";

type Fetcher = (
  url: string,
  init?: RequestInit & { next?: { revalidate: number } },
) => Promise<Response>;

function defaultOrigins(): string[] {
  const { origin, hostname, protocol } = new URL(siteConfig.url);
  const bare = hostname.replace(/^www\./, "");
  const origins = [origin, `${protocol}//${bare}`, `${protocol}//www.${bare}`];

  if (process.env.NODE_ENV !== "production")
    origins.push("http://localhost:3000");

  return Array.from(new Set(origins));
}

/**
 * Whether a response's framing headers stop the portfolio embedding it.
 * `frame-ancestors` wins over `X-Frame-Options`, as it does in browsers.
 */
export function frameBlocked(
  headers: Headers,
  ownOrigins: readonly string[],
): boolean {
  const policy = (headers.get("content-security-policy") ?? "")
    .split(/[;,]/)
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("frame-ancestors"));

  if (policy) {
    const sources = policy
      .split(/\s+/)
      .slice(1)
      .map((source) => source.toLowerCase().replace(/\/$/, ""));

    return !sources.some(
      (source) => source === "*" || ownOrigins.includes(source),
    );
  }

  return Boolean(headers.get("x-frame-options")?.trim());
}

/**
 * Probes a site's headers (cached for an hour) and says whether it can be
 * embedded. A failed or non-OK probe is treated as "no" so the image shows.
 */
export async function canEmbed(
  url: string,
  options: { fetcher?: Fetcher; own?: readonly string[] } = {},
): Promise<boolean> {
  const fetcher = options.fetcher ?? ((target, init) => fetch(target, init));
  const own = options.own ?? defaultOrigins();
  const init = {
    redirect: "follow" as const,
    signal: AbortSignal.timeout(5_000),
    next: { revalidate: 3_600 },
  };

  try {
    let response = await fetcher(url, { ...init, method: "HEAD" });

    // Some servers reject HEAD; ask again with GET and drop the body.
    if (response.status === 405 || response.status === 501) {
      response = await fetcher(url, { ...init, method: "GET" });
      await response.body?.cancel();
    }

    return response.ok && !frameBlocked(response.headers, own);
  } catch {
    return false;
  }
}
