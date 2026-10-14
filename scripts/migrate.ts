/* eslint-disable no-console -- CLI progress output. */
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

// `--test` migrates the local test database instead of the app database.
const variable = process.argv.includes("--test")
  ? "TEST_DATABASE_URL_UNPOOLED"
  : "DATABASE_URL_UNPOOLED";
const connectionString = process.env[variable];

if (!connectionString) {
  throw new Error(`${variable} is required to run migrations`);
}

async function main() {
  const url = new URL(connectionString!);

  // host/database only; never the credentials.
  console.info(`Migrating ${url.hostname}${url.pathname}`);
  const pool = new Pool({ connectionString, max: 1 });

  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.info("Database migrations are up to date.");
  } finally {
    await pool.end();
  }
}

void main();
