/**
 * bun test preload (see bunfig.toml). Bun has already loaded .env/.env.local.
 *
 * App code under test (the Drizzle client, seed, services) connects through
 * DATABASE_URL, so point it at the separate test database before any test
 * file imports it. The development database in .env.local is never written
 * by tests. assertSafeTestDatabase() then refuses production-looking targets.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL_UNPOOLED?.trim();

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_URL_UNPOOLED = testDatabaseUrl;
}
