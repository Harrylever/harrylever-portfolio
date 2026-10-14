export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "IN_USE"
  | "INFRASTRUCTURE_ERROR";

export type ActionFailure = {
  ok: false;
  error: {
    code: ActionErrorCode;
    message: string;
    fieldErrors?: Record<string, string[]>;
    /** The same request may succeed if repeated (e.g. a re-upload). */
    retryable?: boolean;
  };
};

export type ActionResult<T> = { ok: true; data: T } | ActionFailure;
