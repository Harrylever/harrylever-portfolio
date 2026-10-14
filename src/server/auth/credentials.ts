import { createHash, timingSafeEqual } from "node:crypto";

import {
  type AdminAuthConfig,
  readAdminAuthConfig,
} from "@/server/auth/config";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Compares two strings without leaking where they differ or how long they
 * are: both sides are hashed to fixed-length digests before comparison.
 */
export function constantTimeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function verifyAdminCredentials(
  email: string,
  password: string,
  config: AdminAuthConfig = readAdminAuthConfig(),
): boolean {
  // Evaluate both comparisons so a wrong email costs the same as a wrong
  // password.
  const emailMatches = constantTimeEqual(
    normalizeAdminEmail(email),
    normalizeAdminEmail(config.email),
  );
  const passwordMatches = constantTimeEqual(password, config.password);

  return emailMatches && passwordMatches;
}
