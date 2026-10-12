const unsafeBranchNames = new Set(["main", "master", "production", "prod"]);

function normalizedNeonHost(value: string): string {
  return new URL(value).hostname.replace("-pooler.", ".");
}

/**
 * Refuses to run database-writing tests unless NEON_BRANCH names a
 * non-production branch and the app's runtime DATABASE_URL targets the same
 * Neon endpoint as TEST_DATABASE_URL_UNPOOLED. Call it at module load, before
 * any test touches the database.
 */
export function assertSafeTestDatabase(): void {
  const runtimeUrl = process.env.DATABASE_URL;
  const testUrl = process.env.TEST_DATABASE_URL_UNPOOLED;
  const branch = process.env.NEON_BRANCH?.trim().toLowerCase();

  if (!runtimeUrl || !testUrl) {
    throw new Error(
      "DATABASE_URL and TEST_DATABASE_URL_UNPOOLED are required for database integration tests",
    );
  }

  if (!branch || unsafeBranchNames.has(branch)) {
    throw new Error(
      "Database integration tests require NEON_BRANCH to name a non-production branch",
    );
  }

  if (normalizedNeonHost(runtimeUrl) !== normalizedNeonHost(testUrl)) {
    throw new Error(
      "DATABASE_URL and TEST_DATABASE_URL_UNPOOLED must target the same branch",
    );
  }
}
