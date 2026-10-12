import { describe, expect, test } from "bun:test";

import {
  clientKeyFromHeaders,
  createLoginRateLimiter,
} from "@/server/auth/rate-limit";

function clock(start = 1_000_000) {
  let now = start;

  return {
    now: () => now,
    advance(ms: number) {
      now += ms;
    },
  };
}

const minute = 60_000;

describe("login rate limiter", () => {
  test("allows attempts until a key reaches the failure limit", () => {
    const time = clock();
    const limiter = createLoginRateLimiter({
      maxFailuresPerKey: 3,
      maxFailuresGlobal: 100,
      windowMs: 15 * minute,
      now: time.now,
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(limiter.check("1.1.1.1").allowed).toBe(true);
      limiter.recordFailure("1.1.1.1");
    }

    const blocked = limiter.check("1.1.1.1");

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(15 * minute);
    // Other clients are unaffected by one client's failures.
    expect(limiter.check("2.2.2.2").allowed).toBe(true);
  });

  test("uses a sliding window: old failures expire individually", () => {
    const time = clock();
    const limiter = createLoginRateLimiter({
      maxFailuresPerKey: 2,
      maxFailuresGlobal: 100,
      windowMs: 10 * minute,
      now: time.now,
    });

    limiter.recordFailure("ip");
    time.advance(6 * minute);
    limiter.recordFailure("ip");
    expect(limiter.check("ip")).toEqual({
      allowed: false,
      retryAfterMs: 4 * minute,
    });

    time.advance(4 * minute);
    expect(limiter.check("ip").allowed).toBe(true);
    limiter.recordFailure("ip");
    expect(limiter.check("ip").allowed).toBe(false);
  });

  test("a global bucket caps failures spread across many keys", () => {
    const time = clock();
    const limiter = createLoginRateLimiter({
      maxFailuresPerKey: 5,
      maxFailuresGlobal: 4,
      windowMs: 15 * minute,
      now: time.now,
    });

    for (let index = 0; index < 4; index += 1) {
      limiter.recordFailure(`10.0.0.${index}`);
    }

    expect(limiter.check("10.0.0.99").allowed).toBe(false);
    time.advance(15 * minute);
    expect(limiter.check("10.0.0.99").allowed).toBe(true);
  });

  test("reset clears a key's failures but not the global bucket", () => {
    const time = clock();
    const limiter = createLoginRateLimiter({
      maxFailuresPerKey: 2,
      maxFailuresGlobal: 3,
      windowMs: 15 * minute,
      now: time.now,
    });

    limiter.recordFailure("ip");
    limiter.recordFailure("ip");
    expect(limiter.check("ip").allowed).toBe(false);
    limiter.reset("ip");
    expect(limiter.check("ip").allowed).toBe(true);
    limiter.recordFailure("other");
    expect(limiter.check("ip").allowed).toBe(false);
  });

  test("bounds memory by evicting the stalest keys", () => {
    const time = clock();
    const limiter = createLoginRateLimiter({
      maxFailuresPerKey: 1,
      maxFailuresGlobal: 1_000,
      windowMs: 15 * minute,
      maxKeys: 3,
      now: time.now,
    });

    for (const key of ["a", "b", "c", "d"]) {
      limiter.recordFailure(key);
      time.advance(1);
    }

    expect(limiter.size()).toBeLessThanOrEqual(3);
    expect(limiter.check("d").allowed).toBe(false);
  });
});

describe("client key", () => {
  test("prefers the first x-forwarded-for hop, then x-real-ip", () => {
    expect(
      clientKeyFromHeaders(
        new Headers({
          "x-forwarded-for": " 203.0.113.9 , 10.0.0.1",
          "x-real-ip": "198.51.100.2",
        }),
      ),
    ).toBe("203.0.113.9");
    expect(
      clientKeyFromHeaders(new Headers({ "x-real-ip": "198.51.100.2" })),
    ).toBe("198.51.100.2");
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
    expect(
      clientKeyFromHeaders(new Headers({ "x-forwarded-for": " , " })),
    ).toBe("unknown");
  });
});
