"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

import { AdminNav, SignOutButton } from "@/components/admin/admin-nav";

function Mark() {
  return (
    <Link className="adm-mark" href="/admin">
      Portfolio admin
      <small>Drafts stay private until you publish</small>
    </Link>
  );
}

/**
 * Desktop (>=960px): fixed left rail. Below that: a sticky top bar whose
 * Menu button opens a right-hand drawer (modal dialog, Escape closes, focus
 * returns to the trigger). Visibility per breakpoint is handled in CSS.
 */
export function AdminShell({
  email,
  userId,
  children,
}: {
  email: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    posthog.identify(userId, { email, role: "admin" });
  }, [email, userId]);

  // Close the drawer whenever navigation completes.
  useEffect(() => setOpen(false), [pathname]);

  // Widening past the breakpoint hides the drawer in CSS; also close it so
  // the scroll lock and keyboard trap are released.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 960px)");
    const onChange = () => {
      if (desktop.matches) setOpen(false);
    };

    desktop.addEventListener("change", onChange);

    return () => desktop.removeEventListener("change", onChange);
  }, []);

  function closeAfterNavigation() {
    setOpen(false);
    // The trigger is about to be irrelevant; start the next page's focus at
    // the main region (it persists across navigations inside the shell).
    document.getElementById("admin-content")?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const close = () => {
      setOpen(false);
      trigger.current?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();

        return;
      }
      if (event.key !== "Tab" || !drawer.current) return;
      // Keep keyboard focus inside the open drawer.
      const focusable = drawer.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    drawer.current?.querySelector<HTMLElement>("a[href]")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <a className="skip" href="#admin-content">
        Skip to content
      </a>

      <aside className="adm-rail">
        <Mark />
        <AdminNav label="Admin" />
        <div className="adm-account">
          <span>Signed in as {email}</span>
          <SignOutButton />
        </div>
      </aside>

      <header className="adm-topbar">
        <Mark />
        <button
          ref={trigger}
          aria-controls="admin-drawer"
          aria-expanded={open}
          className="adm-btn"
          type="button"
          onClick={() => setOpen(true)}
        >
          Menu
        </button>
      </header>

      {open ? (
        <>
          <div
            aria-hidden="true"
            className="adm-scrim"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          />
          <div
            ref={drawer}
            aria-label="Admin menu"
            aria-modal="true"
            className="adm-drawer"
            id="admin-drawer"
            role="dialog"
          >
            <div className="adm-drawer-head">
              <span className="adm-label">Menu</span>
              <button
                className="adm-btn"
                type="button"
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                Close
              </button>
            </div>
            <AdminNav label="Admin" onNavigate={closeAfterNavigation} />
            <div className="adm-account">
              <span>Signed in as {email}</span>
              <SignOutButton />
            </div>
          </div>
        </>
      ) : null}

      <main className="adm-main" id="admin-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
