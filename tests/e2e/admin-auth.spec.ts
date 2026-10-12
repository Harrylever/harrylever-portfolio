import { expect, test } from "@playwright/test";

import {
  adminCredentials,
  expectOverview,
  fillSignIn,
  signInAsAdmin,
} from "./helpers/admin";
import { postJson, signupSurfaces, unknownSignup } from "./helpers/public";

const navLabels = [
  "Overview",
  "Projects",
  "Blog",
  "Homepage",
  "Media",
  "Settings",
];

test.describe("admin authentication", () => {
  test("redirects anonymous visitors to sign-in", async ({ page }) => {
    for (const path of ["/admin", "/admin/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/sign-in/);
    }
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("protects and restores the admin session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/sign-in/);
    await signInAsAdmin(page);
    await expectOverview(page);
    await page.reload();
    await expectOverview(page);

    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === "portfolio_admin_session");

    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");

    // A signed-in visit to the sign-in page goes straight to the admin.
    await page.goto("/admin/sign-in");
    await expectOverview(page);
  });

  test("rejects invalid credentials with one generic message", async ({
    page,
  }) => {
    const { email } = adminCredentials();

    await page.goto("/admin/sign-in");
    await fillSignIn(page, email, "definitely-not-the-password");
    const alert = page.locator("#sign-in-error");

    await expect(alert).toHaveText(
      "Those details don't match the administrator account.",
    );
    await fillSignIn(page, "stranger@example.invalid", "whatever-password");
    await expect(alert).toHaveText(
      "Those details don't match the administrator account.",
    );
    await expect(page).toHaveURL(/\/admin\/sign-in/);
    expect(
      (await page.context().cookies()).some(
        (c) => c.name === "portfolio_admin_session",
      ),
    ).toBe(false);
  });

  test("honours a safe next path and ignores an external one", async ({
    page,
  }) => {
    await signInAsAdmin(page, "/admin/settings");
    await expect(page).toHaveURL(/\/admin\/settings$/);
    await page.context().clearCookies();

    await signInAsAdmin(page, "https://evil.example/admin");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("signs out and blocks the admin again", async ({ page }) => {
    await signInAsAdmin(page);
    await expectOverview(page);
    // In `next dev` the dev-tools badge sits over the rail's bottom-left
    // corner and swallows pointer clicks, so activate it from the keyboard.
    const signOut = page
      .getByRole("complementary")
      .getByRole("button", { name: "Sign out" });

    await signOut.focus();
    await signOut.press("Enter");
    await expect(page).toHaveURL(/\/admin\/sign-in/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/sign-in/);
  });

  test("exposes no sign-up surface", async ({ request }) => {
    for (const path of signupSurfaces) {
      const response = await postJson(request, path, unknownSignup);

      expect(response.ok(), path).toBe(false);
      expect(response.status(), path).toBe(404);
    }
  });
});

test.describe("admin shell", () => {
  test("desktop navigation reaches every section", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInAsAdmin(page);
    const nav = page.getByRole("navigation", { name: "Admin" });

    await expect(nav).toBeVisible();
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    for (const label of navLabels) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/admin\/settings$/);
    await expect(
      page.getByRole("heading", { name: "Settings", level: 1 }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("mobile drawer opens, navigates and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAsAdmin(page);
    const menu = page.getByRole("button", { name: "Menu" });

    await expect(menu).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Admin" })).toBeHidden();
    await menu.click();
    const drawer = page.getByRole("dialog", { name: "Admin menu" });

    await expect(drawer).toBeVisible();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    for (const label of navLabels) {
      await expect(drawer.getByRole("link", { name: label })).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(menu).toBeFocused();

    await menu.click();
    await drawer.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/admin\/settings$/);
    await expect(drawer).toBeHidden();
  });

  test("shows the loading state while a page streams", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInAsAdmin(page);
    // Hold the RSC payload for the next navigation so the boundary shows.
    await page.route("**/admin/settings**", async (route) => {
      if (route.request().headers()["rsc"]) {
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }
      await route.continue();
    });
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Settings" })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Loading admin" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Settings", level: 1 }),
    ).toBeVisible();
  });

  test("settings form reports unsaved, saving and error states", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInAsAdmin(page, "/admin/settings");
    const status = page.locator(".adm-savebar").getByRole("status");
    const tagline = page.getByLabel("Tagline");

    await tagline.fill(`${await tagline.inputValue()} `.trimEnd() + " (e2e)");
    await expect(status).toHaveText("Unsaved changes");

    // Simulate the network dropping the server action request.
    await page.route("**/admin/settings", async (route) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(status).toHaveText(
      "Couldn't reach the server. Your changes aren't saved yet.",
    );
    await page.unroute("**/admin/settings");
  });
});
