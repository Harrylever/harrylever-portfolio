import { type Page, expect } from "@playwright/test";

export function adminCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set (e.g. in .env.local) for admin E2E tests",
    );
  }

  return { email, password };
}

export async function fillSignIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Signs in through the real form and waits for the overview. */
export async function signInAsAdmin(page: Page, next?: string) {
  const { email, password } = adminCredentials();
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  await page.goto(`/admin/sign-in${query}`);
  await fillSignIn(page, email, password);
  await expect(page).not.toHaveURL(/\/admin\/sign-in/);
}

export async function expectOverview(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Overview", level: 1 }),
  ).toBeVisible();
}
