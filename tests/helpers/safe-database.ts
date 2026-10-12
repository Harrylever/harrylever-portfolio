/**
 * Production protection for every database-writing test (bun integration and
 * Playwright admin E2E). Neon hosts the PRODUCTION database; tests run against
 * a local Postgres test database.
 */
const unsafeEnvLabels = new Set(["main", "master", "production", "prod"]);
const neonHostPattern = /(^|\.)neon\.tech$/i;

type DatabaseTarget = { host: string; port: string; database: string };

function databaseTarget(name: string, value: string): DatabaseTarget {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} is not a valid database URL`);
  }

  return {
    // A Neon pooled host differs from its direct host only by "-pooler".
    host: url.hostname.toLowerCase().replace("-pooler.", "."),
    port: url.port || "5432",
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };
}

/** APP_ENV_LABEL, or the legacy NEON_BRANCH, lower-cased. */
export function environmentLabel(): string | undefined {
  const label = (process.env.APP_ENV_LABEL ?? process.env.NEON_BRANCH)
    ?.trim()
    .toLowerCase();

  return label || undefined;
}

/**
 * Refuses to run database-writing tests unless:
 * - DATABASE_URL and TEST_DATABASE_URL_UNPOOLED are both set and point at the
 *   same database (same host, port and database name), because the app code
 *   under test writes through DATABASE_URL (tests/setup/env.ts points it at
 *   the test database);
 * - the environment label (APP_ENV_LABEL) is not a production name;
 * - the host is not Neon (production) unless ALLOW_NEON_TESTS=1 is set
 *   deliberately together with a non-production APP_ENV_LABEL, e.g. for a
 *   disposable Neon branch;
 * - otherwise (local/other Postgres) the database name contains "test".
 * Call it at module load, before any test touches the database.
 */
export function assertSafeTestDatabase(): void {
  const runtimeUrl = process.env.DATABASE_URL;
  const testUrl = process.env.TEST_DATABASE_URL_UNPOOLED;

  if (!runtimeUrl || !testUrl) {
    throw new Error(
      "DATABASE_URL and TEST_DATABASE_URL_UNPOOLED are required for database tests",
    );
  }

  const label = environmentLabel();

  if (label && unsafeEnvLabels.has(label)) {
    throw new Error(
      `Refusing to run database tests: APP_ENV_LABEL "${label}" names a production environment`,
    );
  }

  const runtime = databaseTarget("DATABASE_URL", runtimeUrl);
  const test = databaseTarget("TEST_DATABASE_URL_UNPOOLED", testUrl);

  if (runtime.host !== test.host || runtime.port !== test.port) {
    throw new Error(
      "DATABASE_URL and TEST_DATABASE_URL_UNPOOLED must target the same host",
    );
  }

  if (runtime.database !== test.database) {
    throw new Error(
      "DATABASE_URL must point at the test database while tests run (TEST_DATABASE_URL_UNPOOLED); use the test scripts, which set it",
    );
  }

  if (neonHostPattern.test(test.host)) {
    if (process.env.ALLOW_NEON_TESTS !== "1" || !label) {
      throw new Error(
        "Refusing to run database tests against Neon (production). Use the local test database, or set ALLOW_NEON_TESTS=1 and a non-production APP_ENV_LABEL for a disposable Neon branch",
      );
    }

    return;
  }

  if (!test.database.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to run database tests against "${test.database}": the test database name must contain "test"`,
    );
  }
}
