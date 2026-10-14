"use server";

import type { AdminSignInResult } from "@/server/auth/sign-in-flow";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signInAdmin, signOutAdmin } from "@/server/auth";
import { loginRateLimiter } from "@/server/auth/rate-limit";
import {
  performAdminSignIn,
  performAdminSignOut,
} from "@/server/auth/sign-in-flow";

/**
 * Returns a typed failure for the form to display; on success it sets the
 * session cookie and redirects (to a validated /admin path), so it never
 * resolves with `ok: true`.
 */
export async function signInAction(input: {
  email: string;
  password: string;
  next?: string | null;
}): Promise<AdminSignInResult> {
  const result = await performAdminSignIn(
    {
      email: input?.email,
      password: input?.password,
      next: input?.next,
      headers: await headers(),
    },
    {
      limiter: loginRateLimiter,
      signIn: (email, password) => signInAdmin(email, password),
    },
  );

  if (result.ok) redirect(result.redirectTo);

  return result;
}

export async function signOutAction(): Promise<void> {
  const { redirectTo } = await performAdminSignOut({
    signOut: () => signOutAdmin(),
  });

  redirect(redirectTo);
}
