import { loadEnvConfig } from "@next/env";

/** host/database only; never the credentials. */
function databaseTarget(value: string | undefined): string {
  if (!value) throw new Error("DATABASE_URL is required for content seeding");
  const url = new URL(value);

  return `${url.hostname}${url.pathname}`;
}

async function main() {
  loadEnvConfig(process.cwd());
  // Not inside a Next request: there is no data cache to revalidate.
  process.env.CONTENT_CACHE_INVALIDATION = "off";

  // Which environment is being seeded, e.g. local-dev or production.
  const environment = (
    process.env.APP_ENV_LABEL ?? process.env.NEON_BRANCH
  )?.trim();

  if (!environment) {
    throw new Error("APP_ENV_LABEL is required for content seeding");
  }
  const target = databaseTarget(process.env.DATABASE_URL);
  const { seedLegacyContent } = await import(
    "@/server/content/seed/legacy-content"
  );
  const summary = await seedLegacyContent();

  // eslint-disable-next-line no-console -- CLI output is the seed handoff.
  console.info(JSON.stringify({ environment, target, ...summary }, null, 2));
}

void main();
