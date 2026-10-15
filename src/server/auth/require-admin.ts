import type { AdminSession } from "@/server/auth/session";

import { headers as nextHeaders } from "next/headers";

import { readSession, sessionTokenFromHeaders } from "@/server/auth/session";

export type { AdminSession } from "@/server/auth/session";

export class AdminAuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403) {
    super(
      status === 401 ? "Authentication required" : "Administrator required",
    );
    this.name = "AdminAuthorizationError";
    this.status = status;
  }
}

export async function requireAdmin(
  requestHeaders?: Headers,
): Promise<AdminSession> {
  const token = sessionTokenFromHeaders(
    requestHeaders ?? (await nextHeaders()),
  );

  // No cookie means no session; avoid touching auth config for anonymous
  // requests so public pages work without admin secrets.
  if (!token) throw new AdminAuthorizationError(401);
  const session = await readSession(token);

  if (!session) throw new AdminAuthorizationError(401);

  return session;
}
