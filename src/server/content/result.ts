import type {
  ActionErrorCode,
  ActionFailure,
  ActionResult,
} from "@/domain/content/action-result";

export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function failure(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionFailure {
  return { ok: false, error: { code, message, fieldErrors } };
}

export function isPostgresError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function infrastructureFailure(): ActionFailure {
  return failure(
    "INFRASTRUCTURE_ERROR",
    "The content operation could not be completed. Please try again.",
  );
}
