import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { serverEnv } from "@/env/server";
import * as schema from "@/server/db/schema";

const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
  max: 10,
});

// Only acts on Vercel (needs VERCEL_URL and VERCEL_REGION); a no-op with a
// local Postgres in development and tests.
attachDatabasePool(pool);

export const db = drizzle(pool, { schema });

export type AppDatabase = typeof db;
export type DbTransaction = Parameters<
  Parameters<AppDatabase["transaction"]>[0]
>[0];
