import {
  type AdminAuthConfig,
  readAdminAuthConfig,
} from "@/server/auth/config";
import { verifyAdminCredentials } from "@/server/auth/credentials";
import {
  type AdminSession,
  type CookieWriter,
  clearSessionCookie,
  createSession,
  setSessionCookie,
} from "@/server/auth/session";

export type SignInAdminResult =
  | { ok: true; session: AdminSession }
  | { ok: false; error: "invalid_credentials" };

type AuthDependencies = {
  config?: AdminAuthConfig;
  cookies?: CookieWriter;
};

/**
 * Checks the submitted credentials against the environment-preset admin and,
 * on success, sets the signed HttpOnly session cookie. There is no sign-up.
 */
export async function signInAdmin(
  email: string,
  password: string,
  { config = readAdminAuthConfig(), cookies }: AuthDependencies = {},
): Promise<SignInAdminResult> {
  if (!verifyAdminCredentials(email, password, config)) {
    return { ok: false, error: "invalid_credentials" };
  }

  const { token, session } = await createSession({ config });

  await setSessionCookie(token, session.expiresAt, cookies);

  return { ok: true, session };
}

export async function signOutAdmin({
  cookies,
}: Pick<AuthDependencies, "cookies"> = {}): Promise<void> {
  await clearSessionCookie(cookies);
}
