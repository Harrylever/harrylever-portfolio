import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { serverEnv } from "@/env/server";

const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
  max: 10,
});

attachDatabasePool(pool);

export const db = drizzle(pool);

export type AppDatabase = typeof db;
export type DbTransaction = Parameters<
  Parameters<AppDatabase["transaction"]>[0]
>[0];
