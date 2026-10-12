import type { AdminAuthConfig } from "@/server/auth/config";

import { beforeAll, describe, expect, test } from "bun:test";
import { SignJWT } from "jose";

type AuthModule = typeof import("@/server/auth");
type SessionModule = typeof import("@/server/auth/session");
type CredentialsModule = typeof import("@/server/auth/credentials");
type RequireAdminModule = typeof import("@/server/auth/require-admin");

let auth: AuthModule;
let sessions: SessionModule;
let credentials: CredentialsModule;
let guard: RequireAdminModule;

const config: AdminAuthConfig = {
  email: "owner@example.test",
  password: "correct-horse-battery-staple",
  sessionSecret: "unit-test-session-secret-with-32-plus-chars",
};

type CookieCall = { name: string; value: string; options: object };

function cookieStore() {
  const calls: CookieCall[] = [];

  return {
    calls,
    set(name: string, value: string, options: object) {
      calls.push({ name, value, options });
    },
  };
}

beforeAll(async () => {
  process.env.DATABASE_URL ??=
    "postgresql://portfolio:secret@localhost:5432/portfolio_test";
  process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL;
  process.env.ADMIN_EMAIL ??= "env-owner@example.test";
  process.env.ADMIN_PASSWORD ??= "env-admin-password-2026";
  process.env.ADMIN_SESSION_SECRET ??=
    "env-session-secret-with-at-least-32-characters";

  auth = await import("@/server/auth");
  sessions = await import("@/server/auth/session");
  credentials = await import("@/server/auth/credentials");
  guard = await import("@/server/auth/require-admin");
});

function cookieHeader(token: string): Headers {
  return new Headers({
    cookie: `theme=dark; ${sessions.ADMIN_SESSION_COOKIE}=${token}; other=1`,
  });
}

describe("constant-time comparison", () => {
  test("matches equal strings and rejects different lengths or values", () => {
    expect(credentials.constantTimeEqual("secret", "secret")).toBe(true);
    expect(credentials.constantTimeEqual("secret", "secret-longer")).toBe(
      false,
    );
    expect(credentials.constantTimeEqual("", "x")).toBe(false);
    expect(credentials.constantTimeEqual("secreT", "secret")).toBe(false);
    expect(credentials.constantTimeEqual("", "")).toBe(true);
  });
});

describe("administrator credentials", () => {
  test("accepts the preset email (trimmed, any case) and password", () => {
    expect(
      credentials.verifyAdminCredentials(
        "  Owner@Example.TEST ",
        config.password,
        config,
      ),
    ).toBe(true);
  });

  test("rejects a wrong password or a wrong email", () => {
    expect(
      credentials.verifyAdminCredentials(
        config.email,
        "wrong-password",
        config,
      ),
    ).toBe(false);
    expect(
      credentials.verifyAdminCredentials(
        "intruder@example.test",
        config.password,
        config,
      ),
    ).toBe(false);
    expect(
      credentials.verifyAdminCredentials(
        config.email,
        ` ${config.password}`,
        config,
      ),
    ).toBe(false);
  });
});

describe("signInAdmin and signOutAdmin", () => {
  test("correct credentials set a signed session cookie", async () => {
    const store = cookieStore();
    const result = await auth.signInAdmin(config.email, config.password, {
      config,
      cookies: store,
    });

    expect(result.ok).toBe(true);
    expect(store.calls).toHaveLength(1);
    const [call] = store.calls;

    expect(call.name).toBe(sessions.ADMIN_SESSION_COOKIE);
    expect(call.value.split(".")).toHaveLength(3);
    expect(call.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    const session = await sessions.readSession(call.value, config);

    expect(session).toMatchObject({
      user: { id: sessions.ADMIN_USER_ID, email: config.email, role: "admin" },
    });
    expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test("wrong credentials are rejected without setting a cookie", async () => {
    for (const [email, password] of [
      [config.email, "not-the-password"],
      ["someone@example.test", config.password],
    ]) {
      const store = cookieStore();
      const result = await auth.signInAdmin(email, password, {
        config,
        cookies: store,
      });

      expect(result).toEqual({ ok: false, error: "invalid_credentials" });
      expect(store.calls).toHaveLength(0);
    }
  });

  test("sign-out expires the session cookie", async () => {
    const store = cookieStore();

    await auth.signOutAdmin({ cookies: store });

    expect(store.calls).toHaveLength(1);
    expect(store.calls[0]).toMatchObject({
      name: sessions.ADMIN_SESSION_COOKIE,
      value: "",
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 },
    });
  });
});

describe("session cookie attributes", () => {
  test("are HttpOnly and SameSite=Lax, Secure only in production", () => {
    const expiresAt = new Date(Date.now() + 60_000);

    expect(sessions.sessionCookieOptions(expiresAt, "production")).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      expires: expiresAt,
    });
    expect(
      sessions.sessionCookieOptions(expiresAt, "development"),
    ).toMatchObject({ httpOnly: true, sameSite: "lax", secure: false });
  });
});

describe("requireAdmin", () => {
  test("rejects requests without a session cookie", async () => {
    await expect(guard.requireAdmin(new Headers())).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      guard.requireAdmin(new Headers({ cookie: "theme=dark" })),
    ).rejects.toBeInstanceOf(guard.AdminAuthorizationError);
  });

  test("accepts a valid session cookie and returns the admin session", async () => {
    const { token } = await sessions.createSession();
    const session = await guard.requireAdmin(cookieHeader(token));

    expect(session.user).toEqual({
      id: sessions.ADMIN_USER_ID,
      email: process.env.ADMIN_EMAIL!.trim().toLowerCase(),
      role: "admin",
    });
    expect(session.expiresAt).toBeInstanceOf(Date);
  });

  test("rejects a tampered token", async () => {
    const { token } = await sessions.createSession();
    const [header, payload, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload, "base64url").toString()),
        email: "attacker@example.test",
      }),
    ).toString("base64url");

    await expect(
      guard.requireAdmin(
        cookieHeader(`${header}.${forgedPayload}.${signature}`),
      ),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      guard.requireAdmin(cookieHeader(`${token.slice(0, -2)}xx`)),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      guard.requireAdmin(cookieHeader("garbage")),
    ).rejects.toMatchObject({ status: 401 });
  });

  test("rejects an expired token", async () => {
    const { token } = await sessions.createSession({
      now: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    });

    await expect(guard.requireAdmin(cookieHeader(token))).rejects.toMatchObject(
      { status: 401 },
    );
  });

  test("rejects a token signed with a different secret", async () => {
    const { token } = await sessions.createSession({
      config: {
        email: process.env.ADMIN_EMAIL!,
        password: process.env.ADMIN_PASSWORD!,
        sessionSecret: "a-completely-different-secret-of-32-chars",
      },
    });

    await expect(guard.requireAdmin(cookieHeader(token))).rejects.toMatchObject(
      { status: 401 },
    );
  });

  test("rejects a correctly signed token that lacks the admin claims", async () => {
    const forged = await new SignJWT({ role: "user" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("someone")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET!));

    await expect(
      guard.requireAdmin(cookieHeader(forged)),
    ).rejects.toMatchObject({ status: 401 });
  });

  test("revokes sessions when the preset password changes", async () => {
    const { token } = await sessions.createSession({ config });

    await expect(sessions.readSession(token, config)).resolves.not.toBeNull();
    await expect(
      sessions.readSession(token, {
        ...config,
        password: "rotated-password-2026",
      }),
    ).resolves.toBeNull();
  });
});
