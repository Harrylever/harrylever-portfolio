import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED is required to run migrations");
}

async function main() {
  const pool = new Pool({ connectionString, max: 1 });

  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.info("Database migrations are up to date.");
  } finally {
    await pool.end();
  }
}

void main();
