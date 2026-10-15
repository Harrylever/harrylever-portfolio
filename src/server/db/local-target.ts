const unsafeLabels = new Set(["main", "master", "prod", "production"]);
const neonHost = /(^|\.)neon\.tech$/i;
const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Guard for scripts that write content: refuses everything except a loopback
 * Postgres with a non-production environment label. Neon is production.
 */
export function assertLocalDatabaseTarget(
  databaseUrl: string | undefined,
  envLabel: string | undefined,
): void {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  let host: string;

  try {
    const url = new URL(databaseUrl);

    // The pg driver lets these override the URL's own host.
    for (const key of Array.from(url.searchParams.keys())) {
      if (["host", "hostaddr"].includes(key.toLowerCase())) {
        throw new Error("Refusing a database URL with a host override");
      }
    }
    host = url.hostname.toLowerCase();
  } catch (error) {
    if (error instanceof Error && /host override/.test(error.message)) {
      throw error;
    }
    throw new Error("DATABASE_URL is not a valid database URL");
  }
  if (neonHost.test(host)) {
    throw new Error("Refusing to write to a Neon database (production)");
  }

  const label = envLabel?.trim().toLowerCase();

  if (!label) throw new Error("APP_ENV_LABEL is required");
  if (unsafeLabels.has(label)) {
    throw new Error(`Refusing to run with environment label "${label}"`);
  }
  if (!loopbackHosts.has(host)) {
    throw new Error("Refusing to write to a database that is not local");
  }
}
