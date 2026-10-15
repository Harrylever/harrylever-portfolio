import { serverEnv } from "@/env/server";

export type AdminAuthConfig = {
  email: string;
  password: string;
  sessionSecret: string;
};

/**
 * Reads the single administrator's preset credentials. Validation happens
 * lazily (see `src/env/server.ts`); this enforces that every value is present
 * whenever authentication is actually used.
 */
export function readAdminAuthConfig(): AdminAuthConfig {
  const email = serverEnv.ADMIN_EMAIL;
  const password = serverEnv.ADMIN_PASSWORD;
  const sessionSecret = serverEnv.ADMIN_SESSION_SECRET;

  if (!email) throw new Error("ADMIN_EMAIL is required");
  if (!password) throw new Error("ADMIN_PASSWORD is required");
  if (!sessionSecret) throw new Error("ADMIN_SESSION_SECRET is required");

  return { email, password, sessionSecret };
}
