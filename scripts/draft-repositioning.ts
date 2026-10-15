import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  // Not inside a Next request: there is no data cache to revalidate.
  process.env.CONTENT_CACHE_INVALIDATION = "off";

  const apply = process.argv.includes("--apply");
  const flag = process.argv.findIndex((arg) => arg.startsWith("--overwrite"));
  const raw =
    flag === -1
      ? ""
      : (process.argv[flag].split("=")[1] ?? process.argv[flag + 1] ?? "");
  // --overwrite all, or a list such as: profile,home,project:priceit,post
  const overwrite =
    raw === "all"
      ? ("all" as const)
      : raw
          .split(",")
          .map((key) => key.trim())
          .filter(Boolean);
  if (apply) {
    // eslint-disable-next-line no-console -- warns before drafts are replaced.
    console.warn(
      overwrite.length
        ? `--overwrite replaces the current draft of: ${overwrite === "all" ? "everything" : overwrite.join(", ")}.`
        : "--apply creates missing items only; existing drafts are left alone (use --overwrite to replace named ones).",
    );
  }
  const { applyRepositioning } = await import(
    "@/server/content/seed/apply-repositioning"
  );
  const report = await applyRepositioning({
    apply,
    overwrite,
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
