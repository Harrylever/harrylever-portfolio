import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());

  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required to bootstrap the administrator",
    );
  }

  const { bootstrapAdmin } = await import("@/server/auth/bootstrap");
  const result = await bootstrapAdmin({ name, email, password });

  // eslint-disable-next-line no-console -- CLI confirmation is intentional.
  console.info(
    result.created
      ? `Created administrator ${result.email}.`
      : `Administrator ${result.email} already exists; no changes made.`,
  );
}

void main();
