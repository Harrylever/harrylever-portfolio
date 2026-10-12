import type { Metadata } from "next";

import { redirect } from "next/navigation";

import { SignInForm } from "@/components/admin/sign-in-form";
import { requireAdmin } from "@/server/auth/require-admin";
import { safeAdminRedirect } from "@/server/auth/sign-in-flow";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

async function hasSession(): Promise<boolean> {
  try {
    await requireAdmin();

    return true;
  } catch {
    return false;
  }
}

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const destination = safeAdminRedirect(Array.isArray(next) ? next[0] : next);

  if (await hasSession()) redirect(destination);

  return (
    <main className="adm-gate">
      <div className="adm-gate-inner">
        <h1 className="adm-title">Sign in</h1>
        <p className="adm-lede">
          Portfolio admin. Only the site owner has an account.
        </p>
        <SignInForm next={destination} />
      </div>
    </main>
  );
}
