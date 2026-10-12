import type { SignInAdminResult } from "@/server/auth";

import {
  type LoginRateLimiter,
  clientKeyFromHeaders,
} from "@/server/auth/rate-limit";

export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_SIGN_IN_PATH = "/admin/sign-in";

/** One message for every credential failure, so nothing reveals which field was wrong. */
export const GENERIC_SIGN_IN_ERROR =
  "Those details don't match the administrator account.";
export const TOO_MANY_ATTEMPTS_ERROR =
  "Too many sign-in attempts. Wait 15 minutes, then try again.";
const INVALID_INPUT_ERROR = "Enter the administrator email and password.";
const UNAVAILABLE_ERROR =
  "Sign-in is unavailable right now. Check the server configuration and try again.";

const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 1_024;

export type SignInErrorCode =
  | "INVALID_INPUT"
  | "INVALID_CREDENTIALS"
  | "TOO_MANY_ATTEMPTS"
  | "UNAVAILABLE";

export type AdminSignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: { code: SignInErrorCode; message: string } };

export type AdminSignInInput = {
  email: unknown;
  password: unknown;
  next: unknown;
  headers: Headers;
};

export type AdminSignInDependencies = {
  limiter: LoginRateLimiter;
  signIn: (email: string, password: string) => Promise<SignInAdminResult>;
};

/**
 * Returns `next` only when it is a same-origin path inside the admin area
 * (and not the sign-in page itself); anything else falls back to /admin.
 */
export function safeAdminRedirect(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) {
    return ADMIN_HOME_PATH;
  }
  if (next.startsWith("//") || next.includes("\\")) return ADMIN_HOME_PATH;

  let url: URL;

  try {
    url = new URL(next, "http://admin.invalid");
  } catch {
    return ADMIN_HOME_PATH;
  }
  if (url.origin !== "http://admin.invalid") return ADMIN_HOME_PATH;

  let decodedPath: string;

  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    return ADMIN_HOME_PATH;
  }
  const inAdmin =
    url.pathname === ADMIN_HOME_PATH ||
    url.pathname.startsWith(`${ADMIN_HOME_PATH}/`);

  // URL normalises "/admin/../blog" to "/blog"; also refuse encoded dot
  // segments and anything resolving to the sign-in page.
  if (
    !inAdmin ||
    decodedPath.split("/").includes("..") ||
    url.pathname === ADMIN_SIGN_IN_PATH ||
    url.pathname.startsWith(`${ADMIN_SIGN_IN_PATH}/`)
  ) {
    return ADMIN_HOME_PATH;
  }

  return `${url.pathname}${url.search}`;
}

function failure(code: SignInErrorCode, message: string): AdminSignInResult {
  return { ok: false, error: { code, message } };
}

export async function performAdminSignIn(
  input: AdminSignInInput,
  { limiter, signIn }: AdminSignInDependencies,
): Promise<AdminSignInResult> {
  const { email, password } = input;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    email.length > MAX_EMAIL_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return failure("INVALID_INPUT", INVALID_INPUT_ERROR);
  }

  const key = clientKeyFromHeaders(input.headers);

  if (!limiter.check(key).allowed) {
    return failure("TOO_MANY_ATTEMPTS", TOO_MANY_ATTEMPTS_ERROR);
  }

  let result: SignInAdminResult;

  try {
    result = await signIn(email, password);
  } catch {
    // Missing or invalid ADMIN_* configuration; never echo the cause.
    return failure("UNAVAILABLE", UNAVAILABLE_ERROR);
  }

  if (!result.ok) {
    limiter.recordFailure(key);

    return failure("INVALID_CREDENTIALS", GENERIC_SIGN_IN_ERROR);
  }

  limiter.reset(key);

  return { ok: true, redirectTo: safeAdminRedirect(input.next) };
}

export async function performAdminSignOut({
  signOut,
}: {
  signOut: () => Promise<void>;
}): Promise<{ redirectTo: string }> {
  await signOut();

  return { redirectTo: ADMIN_SIGN_IN_PATH };
}
