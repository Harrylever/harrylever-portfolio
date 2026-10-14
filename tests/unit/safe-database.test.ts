import { afterEach, describe, expect, test } from "bun:test";

import { assertSafeTestDatabase } from "../helpers/safe-database";

const keys = [
  "DATABASE_URL",
  "TEST_DATABASE_URL_UNPOOLED",
  "APP_ENV_LABEL",
  "NEON_BRANCH",
  "ALLOW_NEON_TESTS",
] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

function setEnv(values: Partial<Record<(typeof keys)[number], string>>) {
  for (const key of keys) {
    const value = values[key];

    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const localTest =
  "postgresql://postgres:postgres@localhost:5432/harrylever_portfolio_test";
const localDev =
  "postgresql://postgres:postgres@localhost:5432/harrylever_portfolio";
const neonPooled =
  "postgresql://u:p@ep-x-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
const neonDirect =
  "postgresql://u:p@ep-x.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("assertSafeTestDatabase", () => {
  afterEach(() => setEnv(original as Record<string, string>));

  test("allows a local test database", () => {
    setEnv({
      DATABASE_URL: localTest,
      TEST_DATABASE_URL_UNPOOLED: localTest,
      APP_ENV_LABEL: "local-dev",
    });
    expect(() => assertSafeTestDatabase()).not.toThrow();
  });

  test("refuses when the app still points at the development database", () => {
    setEnv({ DATABASE_URL: localDev, TEST_DATABASE_URL_UNPOOLED: localTest });
    expect(() => assertSafeTestDatabase()).toThrow("test database");
  });

  test("refuses a database whose name lacks 'test'", () => {
    setEnv({ DATABASE_URL: localDev, TEST_DATABASE_URL_UNPOOLED: localDev });
    expect(() => assertSafeTestDatabase()).toThrow('must contain "test"');
  });

  test("refuses a production label", () => {
    setEnv({
      DATABASE_URL: localTest,
      TEST_DATABASE_URL_UNPOOLED: localTest,
      APP_ENV_LABEL: "production",
    });
    expect(() => assertSafeTestDatabase()).toThrow("production");
  });

  test("refuses Neon unless explicitly allowed with a non-production label", () => {
    setEnv({
      DATABASE_URL: neonPooled,
      TEST_DATABASE_URL_UNPOOLED: neonDirect,
      APP_ENV_LABEL: "rehearsal",
    });
    expect(() => assertSafeTestDatabase()).toThrow("Neon");

    setEnv({
      DATABASE_URL: neonPooled,
      TEST_DATABASE_URL_UNPOOLED: neonDirect,
      APP_ENV_LABEL: "rehearsal",
      ALLOW_NEON_TESTS: "1",
    });
    expect(() => assertSafeTestDatabase()).not.toThrow();

    setEnv({
      DATABASE_URL: neonPooled,
      TEST_DATABASE_URL_UNPOOLED: neonDirect,
      ALLOW_NEON_TESTS: "1",
    });
    expect(() => assertSafeTestDatabase()).toThrow("Neon");
  });

  test("refuses different hosts", () => {
    setEnv({
      DATABASE_URL: localTest.replace("localhost", "db.example.com"),
      TEST_DATABASE_URL_UNPOOLED: localTest,
    });
    expect(() => assertSafeTestDatabase()).toThrow("same host");
  });
});
