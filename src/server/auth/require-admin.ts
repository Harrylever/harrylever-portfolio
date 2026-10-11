import { headers as nextHeaders } from "next/headers";

import { auth } from "@/server/auth";

type AuthSession = typeof auth.$Infer.Session;

export type AdminSession = AuthSession & {
  user: AuthSession["user"] & { role: "admin" };
};

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
  const session = await auth.api.getSession({
    headers: requestHeaders ?? (await nextHeaders()),
  });

  if (!session) throw new AdminAuthorizationError(401);
  if (session.user.role !== "admin") throw new AdminAuthorizationError(403);

  return session as AdminSession;
}
