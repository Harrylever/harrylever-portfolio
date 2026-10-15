"use client";

import { useRef, useState } from "react";

import { signInAction } from "@/app/admin/_actions/auth";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "error"; message: string };

export function SignInForm({ next }: { next: string }) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitting = status.state === "submitting";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);

    setStatus({ state: "submitting" });
    try {
      // Redirects on success; only failures come back.
      const result = await signInAction({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        next,
      });

      if (result && !result.ok) {
        setStatus({ state: "error", message: result.error.message });
        if (passwordRef.current) {
          passwordRef.current.value = "";
          passwordRef.current.focus();
        }
      }
    } catch {
      setStatus({
        state: "error",
        message:
          "Couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  return (
    <form noValidate className="adm-form" onSubmit={onSubmit}>
      {status.state === "error" ? (
        <p className="adm-alert" id="sign-in-error" role="alert">
          {status.message}
        </p>
      ) : null}
      <div className="adm-field">
        <label htmlFor="admin-email">Email</label>
        <input
          required
          aria-describedby={
            status.state === "error" ? "sign-in-error" : undefined
          }
          autoComplete="username"
          id="admin-email"
          inputMode="email"
          maxLength={320}
          name="email"
          type="email"
        />
      </div>
      <div className="adm-field">
        <label htmlFor="admin-password">Password</label>
        <input
          ref={passwordRef}
          required
          autoComplete="current-password"
          id="admin-password"
          maxLength={1024}
          name="password"
          type="password"
        />
      </div>
      <div>
        <button
          aria-busy={submitting}
          className="adm-btn"
          data-variant="solid"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
