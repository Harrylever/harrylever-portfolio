import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());

  const branch = process.env.NEON_BRANCH?.trim();

  if (!branch) throw new Error("NEON_BRANCH is required for content seeding");
  const { seedLegacyContent } = await import(
    "@/server/content/seed/legacy-content"
  );
  const summary = await seedLegacyContent();

  // eslint-disable-next-line no-console -- CLI output is the seed handoff.
  console.info(JSON.stringify({ branch, ...summary }, null, 2));
}

void main();
