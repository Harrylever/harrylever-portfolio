/**
 * In-memory sliding-window limiter for failed admin sign-in attempts.
 *
 * Best-effort only: state lives in this server instance's memory, so on
 * serverless hosting each warm instance keeps its own counters and a cold
 * start forgets them. It slows down casual guessing from a single client and,
 * through the global bucket, distributed guessing hitting one instance. The
 * long random ADMIN_PASSWORD remains the real defence.
 */

export type RateLimitDecision = { allowed: boolean; retryAfterMs: number };

export type LoginRateLimiter = {
  check(key: string): RateLimitDecision;
  recordFailure(key: string): void;
  reset(key: string): void;
  size(): number;
};

export type LoginRateLimiterOptions = {
  maxFailuresPerKey?: number;
  maxFailuresGlobal?: number;
  windowMs?: number;
  maxKeys?: number;
  now?: () => number;
};

const GLOBAL_KEY = "\u0000global";

export function createLoginRateLimiter({
  maxFailuresPerKey = 5,
  maxFailuresGlobal = 50,
  windowMs = 15 * 60 * 1000,
  maxKeys = 10_000,
  now = Date.now,
}: LoginRateLimiterOptions = {}): LoginRateLimiter {
  // Map insertion order doubles as recency order: entries are re-inserted on
  // every failure, so the first key is always the stalest.
  const failures = new Map<string, number[]>();

  function recent(key: string, at: number): number[] {
    const stamps = failures.get(key);

    if (!stamps) return [];
    const live = stamps.filter((stamp) => at - stamp < windowMs);

    if (live.length) failures.set(key, live);
    else failures.delete(key);

    return live;
  }

  function decide(stamps: number[], limit: number, at: number) {
    if (stamps.length < limit) return 0;

    // The bucket reopens when the oldest failure that keeps it full expires.
    return stamps[stamps.length - limit] + windowMs - at;
  }

  function push(key: string, at: number) {
    const stamps = recent(key, at);

    failures.delete(key);
    failures.set(key, [...stamps, at]);
  }

  return {
    check(key) {
      const at = now();
      const wait = Math.max(
        decide(recent(key, at), maxFailuresPerKey, at),
        decide(recent(GLOBAL_KEY, at), maxFailuresGlobal, at),
      );

      return { allowed: wait <= 0, retryAfterMs: Math.max(wait, 0) };
    },
    recordFailure(key) {
      const at = now();

      push(key, at);
      push(GLOBAL_KEY, at);

      while (failures.size > maxKeys) {
        let stalest: string | undefined;

        failures.forEach((_stamps, candidate) => {
          if (stalest === undefined && candidate !== GLOBAL_KEY) {
            stalest = candidate;
          }
        });
        if (stalest === undefined) break;
        failures.delete(stalest);
      }
    },
    reset(key) {
      failures.delete(key);
    },
    size() {
      return failures.size;
    },
  };
}

/** Client identity for throttling: first proxy hop, then x-real-ip. */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (forwarded) return forwarded;
  const realIp = headers.get("x-real-ip")?.trim();

  return realIp || "unknown";
}

/** Process-wide limiter used by the sign-in server action. */
export const loginRateLimiter = createLoginRateLimiter();
