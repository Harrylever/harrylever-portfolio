import type { AdminSession } from "@/server/auth/require-admin";

import { redirect } from "next/navigation";

import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/server/auth/require-admin";

/**
 * requireAdmin() for server components: an anonymous or expired session is
 * sent to sign-in instead of surfacing as an error. Next renders layouts and
 * pages in parallel, so every protected page must call this itself.
 */
export async function requireAdminPage(): Promise<AdminSession> {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) redirect("/admin/sign-in");
    throw error;
  }
}
