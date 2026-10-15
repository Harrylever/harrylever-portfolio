"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="adm-main" role="alert">
      <h1 className="adm-title">This page didn&apos;t load</h1>
      <p className="adm-lede">
        The admin couldn&apos;t reach its data. Your saved content is unchanged.
        Try again, or return to the overview.
        {error.digest ? ` Reference: ${error.digest}.` : null}
      </p>
      <div
        style={{ display: "flex", gap: "var(--s-4)", marginTop: "var(--s-8)" }}
      >
        <button
          className="adm-btn"
          data-variant="solid"
          type="button"
          onClick={() => reset()}
        >
          Try again
        </button>
        <Link className="adm-btn" href="/admin">
          Go to overview
        </Link>
      </div>
    </div>
  );
}
