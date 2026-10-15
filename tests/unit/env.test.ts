import { describe, expect, test } from "bun:test";

import { parseServerEnv } from "@/env/server";

const pooled =
  "postgresql://portfolio:secret@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
const direct =
  "postgresql://portfolio:secret@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("parseServerEnv", () => {
  test("requires pooled and direct database URLs", () => {
    expect(() => parseServerEnv({})).toThrow("DATABASE_URL");
    expect(() => parseServerEnv({ DATABASE_URL: pooled })).toThrow(
      "DATABASE_URL_UNPOOLED",
    );
  });

  test("accepts a local Postgres URL with either scheme", () => {
    const local =
      "postgres://postgres:postgres@localhost:5432/harrylever_portfolio";

    expect(
      parseServerEnv({
        DATABASE_URL: local,
        DATABASE_URL_UNPOOLED: local.replace("postgres://", "postgresql://"),
      }).DATABASE_URL,
    ).toBe(local);
    expect(() =>
      parseServerEnv({
        DATABASE_URL: "mysql://localhost/db",
        DATABASE_URL_UNPOOLED: local,
      }),
    ).toThrow("DATABASE_URL");
  });

  test("keeps database credentials out of public environment keys", () => {
    const environment = parseServerEnv({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLED: direct,
      NEXT_PUBLIC_DATABASE_URL: pooled,
      NEXT_PUBLIC_DATABASE_URL_UNPOOLED: direct,
    });

    expect(environment).toEqual({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLED: direct,
    });
    expect(
      Object.keys(environment).some((key) => key.startsWith("NEXT_PUBLIC_")),
    ).toBe(false);
  });

  test("validates the preset administrator credentials lazily", () => {
    const base = { DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: direct };
    const admin = {
      ADMIN_EMAIL: "owner@example.com",
      ADMIN_PASSWORD: "twelve-chars-or-more",
      ADMIN_SESSION_SECRET: "x".repeat(32),
    };

    expect(parseServerEnv(base)).toEqual(base);
    expect(
      parseServerEnv({
        ...base,
        ADMIN_EMAIL: "",
        ADMIN_PASSWORD: "",
        ADMIN_SESSION_SECRET: "",
      }),
    ).toEqual(base);
    expect(parseServerEnv({ ...base, ...admin })).toEqual({
      ...base,
      ...admin,
    });
    expect(() =>
      parseServerEnv({ ...base, ...admin, ADMIN_EMAIL: "not-an-email" }),
    ).toThrow("ADMIN_EMAIL");
    expect(() =>
      parseServerEnv({ ...base, ...admin, ADMIN_PASSWORD: "short" }),
    ).toThrow("ADMIN_PASSWORD");
    expect(() =>
      parseServerEnv({
        ...base,
        ...admin,
        ADMIN_SESSION_SECRET: "x".repeat(31),
      }),
    ).toThrow("ADMIN_SESSION_SECRET");
    expect(
      Object.keys(
        parseServerEnv({ ...base, BETTER_AUTH_SECRET: "x".repeat(32) }),
      ),
    ).not.toContain("BETTER_AUTH_SECRET");
  });

  test("RESUME_URL is optional, blank counts as unset, and only http(s) is accepted", () => {
    const base = { DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: direct };

    expect(parseServerEnv(base).RESUME_URL).toBeUndefined();
    expect(
      parseServerEnv({ ...base, RESUME_URL: "" }).RESUME_URL,
    ).toBeUndefined();
    expect(
      parseServerEnv({ ...base, RESUME_URL: "https://example.com/cv.pdf" })
        .RESUME_URL,
    ).toBe("https://example.com/cv.pdf");
    expect(() =>
      parseServerEnv({ ...base, RESUME_URL: "javascript:alert(1)" }),
    ).toThrow("RESUME_URL");
  });
});
