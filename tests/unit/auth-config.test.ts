import { beforeAll, describe, expect, test } from "bun:test";
import { isCuid } from "@paralleldrive/cuid2";
import { getTableColumns } from "drizzle-orm";

import type { createAuthOptions as CreateAuthOptions } from "@/server/auth/config";
import {
  account,
  rateLimit,
  session,
  user,
  verification,
} from "@/server/db/schema/auth";

let createAuthOptions: typeof CreateAuthOptions;

beforeAll(async () => {
  process.env.DATABASE_URL ??=
    "postgresql://portfolio:secret@localhost:5432/portfolio_test";
  process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL;
  process.env.BETTER_AUTH_SECRET ??=
    "test-secret-at-least-thirty-two-characters";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  ({ createAuthOptions } = await import("@/server/auth/config"));
});

describe("Better Auth configuration", () => {
  test("locks runtime authentication to the single administrator", () => {
    const options = createAuthOptions({ allowSignUp: false });

    expect(options.emailAndPassword).toMatchObject({
      enabled: true,
      disableSignUp: true,
    });
    expect(options.rateLimit).toMatchObject({
      enabled: true,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
      },
    });
  });

  test("uses CUID2 identifiers for every Better Auth model", () => {
    const generateId = createAuthOptions({ allowSignUp: false }).advanced
      ?.database?.generateId;

    expect(typeof generateId).toBe("function");
    if (typeof generateId !== "function")
      throw new Error("Missing ID generator");

    for (const model of [
      "user",
      "session",
      "account",
      "verification",
      "rateLimit",
    ] as const) {
      const id = generateId({ model });

      expect(typeof id === "string" && isCuid(id)).toBe(true);
    }
  });

  test("keeps role assignment out of public sign-up input", () => {
    const role = createAuthOptions({ allowSignUp: false }).user
      ?.additionalFields?.role;

    expect(role).toMatchObject({
      type: "string",
      required: true,
      input: false,
      defaultValue: "user",
    });
    expect(getTableColumns(user).role.getSQLType()).toBe("text");
  });

  test("uses secure, HTTP-only, same-site cookies in production", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    Reflect.set(process.env, "NODE_ENV", "production");

    try {
      const attributes = createAuthOptions({ allowSignUp: false }).advanced
        ?.defaultCookieAttributes;

      expect(attributes).toMatchObject({
        secure: true,
        httpOnly: true,
        sameSite: "lax",
      });
    } finally {
      if (previousNodeEnv)
        Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
      else Reflect.deleteProperty(process.env, "NODE_ENV");
    }
  });

  test("defines text primary keys and database rate-limit storage", () => {
    for (const table of [user, session, account, verification, rateLimit]) {
      const id = getTableColumns(table).id;

      expect(id.getSQLType()).toBe("text");
      expect(id.primary).toBe(true);
    }

    expect(getTableColumns(rateLimit).key.getSQLType()).toBe("text");
  });

  test("allows sign-up only for the explicit bootstrap configuration", () => {
    expect(
      createAuthOptions({ allowSignUp: true }).emailAndPassword?.disableSignUp,
    ).toBe(false);
  });
});
