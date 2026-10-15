import type {
  ActionFailure,
  ActionResult,
} from "@/domain/content/action-result";
import type { ListStatusFilter } from "@/lib/admin/content-forms";
import type { AdminSession } from "@/server/auth/require-admin";

import { serviceFieldErrors } from "@/lib/admin/content-forms";
import { AdminAuthorizationError } from "@/server/auth/require-admin";
import { failure, infrastructureFailure } from "@/server/content/result";

/** Injected so tests can exercise the auth paths without cookies. */
export type Authorize = () => Promise<AdminSession>;
export type AdminDependencies = { authorize: Authorize };

/** Same contract as the Task 12 site-profile actions. */
export async function authorizeOrFail(
  authorize: Authorize,
): Promise<
  { session: AdminSession; failure?: undefined } | { failure: ActionFailure }
> {
  try {
    return { session: await authorize() };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return {
        failure: failure("UNAUTHORIZED", "Sign in again to save changes."),
      };
    }

    return { failure: infrastructureFailure() };
  }
}

/** Services return typed failures for expected cases; this catches the rest. */
export async function guarded<T>(
  operation: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await operation();
  } catch {
    return infrastructureFailure();
  }
}

/** Attaches slug-related service messages to the slug field. */
export function withFieldErrors<T>(result: ActionResult<T>): ActionResult<T> {
  if (result.ok || result.error.fieldErrors) return result;
  const fieldErrors = serviceFieldErrors(result.error.message);

  return fieldErrors
    ? failure(result.error.code, result.error.message, fieldErrors)
    : result;
}

export function isId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9]{23}$/.test(value);
}

export function isVersion(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function invalidRequest(): ActionFailure {
  return failure(
    "VALIDATION_ERROR",
    "The request was malformed. Reload and try again.",
  );
}

export type LifecycleStatus = "draft" | "published" | "unpublished";

export type AdminContentRow = {
  id: string;
  slug: string;
  title: string;
  status: LifecycleStatus;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
  publishedAt: string | null;
  deletedAt: string | null;
  featured?: boolean;
};

export type AdminListQuery = {
  view: "active" | "trash";
  q?: string;
  status?: ListStatusFilter;
};

/** Shared by projects and posts: search and lifecycle filters. */
export function filterRows(rows: AdminContentRow[], query: AdminListQuery) {
  const needle = query.q?.trim().toLowerCase();

  return rows.filter((row) => {
    if (
      needle &&
      !row.title.toLowerCase().includes(needle) &&
      !row.slug.includes(needle)
    ) {
      return false;
    }
    switch (query.status ?? "all") {
      case "all":
        return true;
      case "changes":
        return row.status === "published" && row.hasUnpublishedChanges;
      default:
        return row.status === query.status;
    }
  });
}
