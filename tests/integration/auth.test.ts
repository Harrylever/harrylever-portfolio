import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { inArray } from "drizzle-orm";

import { auth } from "@/server/auth";
import { bootstrapAdmin, rotateAdminPassword } from "@/server/auth/bootstrap";
import { requireAdmin } from "@/server/auth/require-admin";
import { createAuthOptions } from "@/server/auth/config";
import { db } from "@/server/db/client";
import { rateLimit, user } from "@/server/db/schema/auth";

const admin = {
  name: "CMS Test Admin",
  email: "cms-auth-admin@example.invalid",
  password: "initial-test-password-2026",
};

const secondAdmin = {
  name: "Second CMS Admin",
  email: "cms-auth-second@example.invalid",
  password: "second-test-password-2026",
};

const ordinaryUser = {
  name: "CMS Test User",
  email: "cms-auth-user@example.invalid",
  password: "ordinary-test-password-2026",
};

const testEmails = [admin.email, secondAdmin.email, ordinaryUser.email];

function normalizedNeonHost(value: string): string {
  return new URL(value).hostname.replace("-pooler.", ".");
}

function assertSafeAuthTestDatabase() {
  const runtimeUrl = process.env.DATABASE_URL;
  const testUrl = process.env.TEST_DATABASE_URL_UNPOOLED;
  const branch = process.env.NEON_BRANCH?.trim().toLowerCase();

  if (!runtimeUrl || !testUrl) {
    throw new Error(
      "DATABASE_URL and TEST_DATABASE_URL_UNPOOLED are required for auth integration tests",
    );
  }

  if (!branch || ["main", "master", "production", "prod"].includes(branch)) {
    throw new Error("Auth integration tests require a non-production branch");
  }

  if (normalizedNeonHost(runtimeUrl) !== normalizedNeonHost(testUrl)) {
    throw new Error(
      "Runtime and test database URLs must target the same branch",
    );
  }
}

assertSafeAuthTestDatabase();

async function cleanAuthFixtures() {
  await db.delete(user).where(inArray(user.email, testEmails));
  await db.delete(rateLimit);
}

async function authRequest(
  path: string,
  body: Record<string, unknown>,
  authHandler = auth.handler,
) {
  return authHandler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function cookieHeaders(response: Response): Headers {
  const setCookie = response.headers.get("set-cookie");

  if (!setCookie)
    throw new Error("Expected Better Auth to set a session cookie");

  return new Headers({ cookie: setCookie.split(";", 1)[0] });
}

async function signIn(email: string, password: string) {
  return authRequest("/sign-in/email", { email, password });
}

describe.serial("administrator authentication", () => {
  beforeEach(cleanAuthFixtures, 30_000);
  afterAll(cleanAuthFixtures, 30_000);

  test("requires a live admin session", async () => {
    await expect(requireAdmin(new Headers())).rejects.toMatchObject({
      status: 401,
    });

    const bootstrapAuth = betterAuth(createAuthOptions({ allowSignUp: true }));
    const userSignUp = await authRequest(
      "/sign-up/email",
      ordinaryUser,
      bootstrapAuth.handler,
    );

    expect(userSignUp.status).toBe(200);
    await expect(requireAdmin(cookieHeaders(userSignUp))).rejects.toMatchObject(
      { status: 403 },
    );

    await bootstrapAdmin(admin);
    const adminSignIn = await signIn(admin.email, admin.password);

    expect(adminSignIn.status).toBe(200);
    await expect(
      requireAdmin(cookieHeaders(adminSignIn)),
    ).resolves.toMatchObject({ user: { email: admin.email, role: "admin" } });
  }, 60_000);

  test("bootstraps exactly one administrator idempotently", async () => {
    await expect(bootstrapAdmin(admin)).resolves.toMatchObject({
      created: true,
      email: admin.email,
    });
    await expect(bootstrapAdmin(admin)).resolves.toMatchObject({
      created: false,
      email: admin.email,
    });
    await expect(bootstrapAdmin(secondAdmin)).rejects.toThrow(
      "An administrator already exists",
    );

    const admins = await db.query.user.findMany({
      where: (users, { eq }) => eq(users.role, "admin"),
    });

    expect(admins).toHaveLength(1);
  }, 60_000);

  test("rotates the password through Better Auth and revokes sessions", async () => {
    await bootstrapAdmin(admin);
    const oldSignIn = await signIn(admin.email, admin.password);
    const oldSessionHeaders = cookieHeaders(oldSignIn);

    await expect(requireAdmin(oldSessionHeaders)).resolves.toBeDefined();
    await expect(
      rotateAdminPassword({
        email: admin.email,
        newPassword: "rotated-test-password-2026",
      }),
    ).resolves.toMatchObject({ rotated: true });
    await expect(requireAdmin(oldSessionHeaders)).rejects.toMatchObject({
      status: 401,
    });

    expect((await signIn(admin.email, admin.password)).status).toBe(401);
    expect(
      (await signIn(admin.email, "rotated-test-password-2026")).status,
    ).toBe(200);
  }, 60_000);

  test("does not reveal whether a login email exists", async () => {
    await bootstrapAdmin(admin);

    const unknownEmail = await signIn(
      "missing-admin@example.invalid",
      "wrong-test-password-2026",
    );
    const wrongPassword = await signIn(admin.email, "wrong-test-password-2026");

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(await unknownEmail.json()).toEqual(await wrongPassword.json());
  }, 60_000);
});
