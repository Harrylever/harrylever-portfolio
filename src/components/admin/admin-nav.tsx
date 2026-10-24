"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

import { signOutAction } from "@/app/admin/_actions/auth";

export const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/home", label: "Homepage" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export function isCurrentAdminPath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({
  label,
  onNavigate,
}: {
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/admin";

  return (
    <nav aria-label={label} className="adm-nav">
      <ul>
        {adminNavItems.map((item) => {
          const current = isCurrentAdminPath(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                aria-current={current ? "page" : undefined}
                href={item.href}
                onClick={onNavigate}
              >
                <span aria-hidden="true" className="adm-dot" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);
    posthog.reset();
    try {
      // On success the action redirects to /admin/sign-in.
      await signOutAction();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        className="adm-btn"
        data-variant="quiet"
        disabled={pending}
        type="button"
        onClick={() => {
          void signOut();
        }}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {failed ? (
        <p className="adm-field-error" role="alert">
          Sign-out failed. Try again.
        </p>
      ) : null}
    </div>
  );
}
