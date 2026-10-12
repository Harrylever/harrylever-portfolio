import type { SignInAdminResult } from "@/server/auth";

import { describe, expect, test } from "bun:test";

import { createLoginRateLimiter } from "@/server/auth/rate-limit";
import { buildAdminSession } from "@/server/auth/session";
import {
  GENERIC_SIGN_IN_ERROR,
  TOO_MANY_ATTEMPTS_ERROR,
  performAdminSignIn,
  performAdminSignOut,
  safeAdminRedirect,
} from "@/server/auth/sign-in-flow";

const goodEmail = "owner@example.test";
const goodPassword = "correct-horse-battery-staple";

function fakeSignIn() {
  const calls: [string, string][] = [];

  return {
    calls,
    async signIn(email: string, password: string): Promise<SignInAdminResult> {
      calls.push([email, password]);
      if (email === goodEmail && password === goodPassword) {
        return {
          ok: true,
          session: buildAdminSession(email, new Date(Date.now() + 60_000)),
        };
      }

      return { ok: false, error: "invalid_credentials" };
    },
  };
}

function limiter(maxFailuresPerKey = 3) {
  return createLoginRateLimiter({
    maxFailuresPerKey,
    maxFailuresGlobal: 100,
    windowMs: 15 * 60_000,
    now: () => 0,
  });
}

const fromIp = (ip: string) => new Headers({ "x-forwarded-for": ip });

describe("safeAdminRedirect", () => {
  test("keeps same-origin admin paths with their query", () => {
    expect(safeAdminRedirect("/admin")).toBe("/admin");
    expect(safeAdminRedirect("/admin/settings")).toBe("/admin/settings");
    expect(safeAdminRedirect("/admin/projects?status=draft")).toBe(
      "/admin/projects?status=draft",
    );
  });

  test("rejects anything that could leave the admin area", () => {
    for (const next of [
      undefined,
      null,
      42,
      "",
      "https://evil.example/admin",
      "//evil.example/admin",
      "/\\evil.example/admin",
      "\\\\evil.example",
      "/administrator",
      "/admin.evil",
      "/blog",
      "/admin/../blog",
      "/admin/%2e%2e/blog",
      "javascript:alert(1)",
      "/admin/sign-in",
      " /admin",
    ]) {
      expect(safeAdminRedirect(next)).toBe("/admin");
    }
  });
});

describe("performAdminSignIn", () => {
  test("signs in and redirects to a validated next path", async () => {
    const auth = fakeSignIn();
    const result = await performAdminSignIn(
      {
        email: goodEmail,
        password: goodPassword,
        next: "/admin/settings",
        headers: fromIp("1.1.1.1"),
      },
      { limiter: limiter(), signIn: auth.signIn },
    );

    expect(result).toEqual({ ok: true, redirectTo: "/admin/settings" });
  });

  test("falls back to /admin for an open-redirect next value", async () => {
    const auth = fakeSignIn();
    const result = await performAdminSignIn(
      {
        email: goodEmail,
        password: goodPassword,
        next: "https://evil.example",
        headers: fromIp("1.1.1.1"),
      },
      { limiter: limiter(), signIn: auth.signIn },
    );

    expect(result).toEqual({ ok: true, redirectTo: "/admin" });
  });

  test("uses one generic error for a wrong email and a wrong password", async () => {
    const auth = fakeSignIn();
    const bucket = limiter(10);
    const wrongPassword = await performAdminSignIn(
      {
        email: goodEmail,
        password: "nope-nope-nope",
        next: null,
        headers: fromIp("1.1.1.1"),
      },
      { limiter: bucket, signIn: auth.signIn },
    );
    const wrongEmail = await performAdminSignIn(
      {
        email: "someone@example.test",
        password: goodPassword,
        next: null,
        headers: fromIp("1.1.1.1"),
      },
      { limiter: bucket, signIn: auth.signIn },
    );

    expect(wrongPassword).toEqual({
      ok: false,
      error: { code: "INVALID_CREDENTIALS", message: GENERIC_SIGN_IN_ERROR },
    });
    expect(wrongEmail).toEqual(wrongPassword);
  });

  test("rejects malformed input without calling sign-in", async () => {
    const auth = fakeSignIn();

    for (const [email, password] of [
      ["", goodPassword],
      [goodEmail, ""],
      [undefined, goodPassword],
      [goodEmail, { toString: () => goodPassword }],
      ["a".repeat(400), goodPassword],
      [goodEmail, "p".repeat(2_000)],
    ]) {
      const result = await performAdminSignIn(
        { email, password, next: null, headers: fromIp("1.1.1.1") },
        { limiter: limiter(), signIn: auth.signIn },
      );

      expect(result).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
    }
    expect(auth.calls).toHaveLength(0);
  });

  test("throttles repeated failures per client without revealing why", async () => {
    const auth = fakeSignIn();
    const bucket = limiter(3);
    const attempt = (password: string, ip = "9.9.9.9") =>
      performAdminSignIn(
        { email: goodEmail, password, next: null, headers: fromIp(ip) },
        { limiter: bucket, signIn: auth.signIn },
      );

    for (let index = 0; index < 3; index += 1) {
      expect(await attempt("wrong-password-x")).toMatchObject({
        error: { code: "INVALID_CREDENTIALS" },
      });
    }

    // Even the correct password is refused while throttled, and the
    // credentials are not checked at all.
    const callsBefore = auth.calls.length;

    expect(await attempt(goodPassword)).toEqual({
      ok: false,
      error: { code: "TOO_MANY_ATTEMPTS", message: TOO_MANY_ATTEMPTS_ERROR },
    });
    expect(auth.calls).toHaveLength(callsBefore);
    expect(TOO_MANY_ATTEMPTS_ERROR).not.toMatch(/email|password/i);

    // A different client can still sign in.
    expect(await attempt(goodPassword, "8.8.8.8")).toEqual({
      ok: true,
      redirectTo: "/admin",
    });
  });

  test("parallel attempts cannot slip past the limit before failures are recorded", async () => {
    const calls: string[] = [];
    // Resolve on a later tick so every request is in flight at once.
    const slowSignIn = async (
      email: string,
      password: string,
    ): Promise<SignInAdminResult> => {
      calls.push(password);
      await new Promise((resolve) => setTimeout(resolve, 5));

      return { ok: false, error: "invalid_credentials" };
    };
    const bucket = limiter(3);
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        performAdminSignIn(
          {
            email: goodEmail,
            password: `wrong-${index}`,
            next: null,
            headers: fromIp("6.6.6.6"),
          },
          { limiter: bucket, signIn: slowSignIn },
        ),
      ),
    );

    expect(calls).toHaveLength(3);
    expect(
      results.filter((r) => !r.ok && r.error.code === "TOO_MANY_ATTEMPTS"),
    ).toHaveLength(17);
  });

  test("parallel attempts from many clients respect the global bucket", async () => {
    let calls = 0;
    const bucket = createLoginRateLimiter({
      maxFailuresPerKey: 5,
      maxFailuresGlobal: 4,
      windowMs: 15 * 60_000,
      now: () => 0,
    });

    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        performAdminSignIn(
          {
            email: goodEmail,
            password: "wrong-password",
            next: null,
            headers: fromIp(`10.1.0.${index}`),
          },
          {
            limiter: bucket,
            signIn: async () => {
              calls += 1;
              await new Promise((resolve) => setTimeout(resolve, 5));

              return { ok: false, error: "invalid_credentials" };
            },
          },
        ),
      ),
    );

    expect(calls).toBe(4);
  });

  test("a successful or unavailable attempt gives its reservation back", async () => {
    const auth = fakeSignIn();
    const bucket = createLoginRateLimiter({
      maxFailuresPerKey: 2,
      maxFailuresGlobal: 2,
      windowMs: 15 * 60_000,
      now: () => 0,
    });
    const attempt = (password: string, ip: string) =>
      performAdminSignIn(
        { email: goodEmail, password, next: null, headers: fromIp(ip) },
        { limiter: bucket, signIn: auth.signIn },
      );

    for (let index = 0; index < 5; index += 1) {
      expect(await attempt(goodPassword, `5.5.5.${index}`)).toMatchObject({
        ok: true,
      });
    }
    for (let index = 0; index < 5; index += 1) {
      await performAdminSignIn(
        {
          email: goodEmail,
          password: goodPassword,
          next: null,
          headers: fromIp("4.4.4.4"),
        },
        {
          limiter: bucket,
          signIn: async () => {
            throw new Error("misconfigured");
          },
        },
      );
    }
    // Neither successes nor outages consumed the global budget.
    expect(bucket.check("3.3.3.3").allowed).toBe(true);
    expect(bucket.check("4.4.4.4").allowed).toBe(true);
  });

  test("a successful sign-in clears that client's failure history", async () => {
    const auth = fakeSignIn();
    const bucket = limiter(2);
    const attempt = (password: string) =>
      performAdminSignIn(
        {
          email: goodEmail,
          password,
          next: null,
          headers: fromIp("7.7.7.7"),
        },
        { limiter: bucket, signIn: auth.signIn },
      );

    await attempt("wrong-password-x");
    expect(await attempt(goodPassword)).toMatchObject({ ok: true });
    await attempt("wrong-password-x");
    expect(await attempt(goodPassword)).toMatchObject({ ok: true });
  });

  test("reports an unavailable result when auth is misconfigured", async () => {
    const result = await performAdminSignIn(
      {
        email: goodEmail,
        password: goodPassword,
        next: null,
        headers: fromIp("1.1.1.1"),
      },
      {
        limiter: limiter(),
        signIn: async () => {
          throw new Error("ADMIN_SESSION_SECRET is required");
        },
      },
    );

    expect(result).toMatchObject({ ok: false, error: { code: "UNAVAILABLE" } });
    if (!result.ok) {
      expect(result.error.message).not.toContain("ADMIN_SESSION_SECRET");
    }
  });
});

describe("performAdminSignOut", () => {
  test("clears the session and sends the browser to sign-in", async () => {
    let cleared = 0;
    const result = await performAdminSignOut({
      signOut: async () => {
        cleared += 1;
      },
    });

    expect(cleared).toBe(1);
    expect(result).toEqual({ redirectTo: "/admin/sign-in" });
  });
});
