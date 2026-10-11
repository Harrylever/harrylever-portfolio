import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());

  const email = process.env.ADMIN_EMAIL;
  const newPassword = process.env.ADMIN_NEW_PASSWORD;

  if (!email || !newPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_NEW_PASSWORD are required to rotate the administrator password",
    );
  }

  const { rotateAdminPassword } = await import("@/server/auth/bootstrap");

  await rotateAdminPassword({ email, newPassword });
  // eslint-disable-next-line no-console -- CLI confirmation is intentional.
  console.info(
    `Rotated the password for ${email} and revoked existing sessions.`,
  );
}

void main();
