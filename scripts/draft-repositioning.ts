import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  // Not inside a Next request: there is no data cache to revalidate.
  process.env.CONTENT_CACHE_INVALIDATION = "off";

  const apply = process.argv.includes("--apply");
  const { applyRepositioning } = await import(
    "@/server/content/seed/apply-repositioning"
  );
  const report = await applyRepositioning({
    apply,
    databaseUrl: process.env.DATABASE_URL,
    envLabel: process.env.APP_ENV_LABEL ?? process.env.NEON_BRANCH,
  });

  // eslint-disable-next-line no-console -- CLI output is the handoff.
  console.info(JSON.stringify(report, null, 2));
  if (!apply) {
    // eslint-disable-next-line no-console -- tells the owner nothing was written.
    console.info(
      "Dry run: nothing was written. Re-run with --apply to write drafts.",
    );
  }
}

void main().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- CLI failure output.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
