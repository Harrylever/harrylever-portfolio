import { loadEnvConfig } from "@next/env";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

loadEnvConfig(process.cwd());

const unsafeBranchNames = new Set(["main", "master", "production", "prod"]);

function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL_UNPOOLED;
  const branch = process.env.NEON_BRANCH?.trim().toLowerCase();

  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL_UNPOOLED is required for database integration tests",
    );
  }

  if (!branch || unsafeBranchNames.has(branch)) {
    throw new Error(
      "Database integration tests require NEON_BRANCH to name a non-production branch",
    );
  }

  return url;
}

export const testPool = new Pool({
  connectionString: testDatabaseUrl(),
  max: 2,
});

export type TestDatabase = Pool | PoolClient;

export async function queryRows<Row extends QueryResultRow>(
  database: TestDatabase,
  text: string,
  values: unknown[] = [],
): Promise<Row[]> {
  return (await database.query<Row>(text, values)).rows;
}

export async function tableNames(database: TestDatabase): Promise<string[]> {
  const rows = await queryRows<{ table_name: string }>(
    database,
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
      order by table_name`,
  );

  return rows.map((row) => row.table_name);
}

export async function primaryKeyType(
  database: TestDatabase,
  table: string,
): Promise<string | undefined> {
  const [row] = await queryRows<{ data_type: string }>(
    database,
    `select columns.data_type
       from information_schema.table_constraints constraints
       join information_schema.key_column_usage key_columns
         on constraints.constraint_name = key_columns.constraint_name
        and constraints.table_schema = key_columns.table_schema
       join information_schema.columns columns
         on columns.table_schema = key_columns.table_schema
        and columns.table_name = key_columns.table_name
        and columns.column_name = key_columns.column_name
      where constraints.table_schema = 'public'
        and constraints.table_name = $1
        and constraints.constraint_type = 'PRIMARY KEY'`,
    [table],
  );

  return row?.data_type;
}

export async function timestampType(
  database: TestDatabase,
  table: string,
  column: string,
): Promise<string | undefined> {
  const [row] = await queryRows<{ data_type: string }>(
    database,
    `select data_type
       from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2`,
    [table, column],
  );

  return row?.data_type;
}

export async function foreignKeyTargets(
  database: TestDatabase,
  table: string,
): Promise<string[]> {
  const rows = await queryRows<{ target: string }>(
    database,
    `select foreign_table.table_name || '.' || foreign_column.column_name as target
       from information_schema.table_constraints constraints
       join information_schema.key_column_usage source_column
         on constraints.constraint_name = source_column.constraint_name
        and constraints.table_schema = source_column.table_schema
       join information_schema.constraint_column_usage foreign_column
         on foreign_column.constraint_name = constraints.constraint_name
        and foreign_column.constraint_schema = constraints.table_schema
       join information_schema.tables foreign_table
         on foreign_table.table_schema = foreign_column.table_schema
        and foreign_table.table_name = foreign_column.table_name
      where constraints.table_schema = 'public'
        and constraints.table_name = $1
        and constraints.constraint_type = 'FOREIGN KEY'
      order by target`,
    [table],
  );

  return rows.map((row) => row.target);
}

export async function indexDefinition(
  database: TestDatabase,
  indexName: string,
): Promise<string | undefined> {
  const [row] = await queryRows<{ indexdef: string }>(
    database,
    `select indexdef
       from pg_indexes
      where schemaname = 'public'
        and indexname = $1`,
    [indexName],
  );

  return row?.indexdef;
}

export async function withRollback(
  callback: (client: PoolClient) => Promise<void>,
): Promise<void> {
  const client = await testPool.connect();

  try {
    await client.query("begin");
    await callback(client);
  } finally {
    await client.query("rollback");
    client.release();
  }
}
