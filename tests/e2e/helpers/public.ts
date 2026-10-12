import type { APIRequestContext } from "@playwright/test";

/** A sign-up payload for an account that must never be creatable. */
export const unknownSignup = {
  email: "not-the-admin@example.invalid",
  password: "an-attempted-signup-password",
  name: "Unknown visitor",
};

/** Sign-up and auth API paths a generic auth library would expose. */
export const signupSurfaces = [
  "/api/auth/sign-up/email",
  "/api/auth/sign-up",
  "/api/auth/signup",
] as const;

export async function postJson(
  request: APIRequestContext,
  path: string,
  data: unknown,
) {
  return request.post(path, { data, failOnStatusCode: false, maxRedirects: 0 });
}
