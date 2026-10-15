import { expect, test } from "@playwright/test";

import { signInAsAdmin } from "./helpers/admin";
import {
  cleanupE2EContent,
  confirmNamedDialog,
  type SiteProfileSnapshot,
  ensurePublishedSiteProfile,
  restoreSiteProfile,
  createProjectDraft,
  expectHostilePasteNeutralised,
  expectPublicStatus,
  expectStatus,
  fillProjectForm,
  hostilePaste,
  openEditorInTwoPages,
  pasteHtml,
  publicHtml,
  uniqueSlug,
} from "./helpers/content";

test.describe.configure({ mode: "serial" });

let profileSnapshot: SiteProfileSnapshot = { touched: false };

test.beforeAll(async ({ browser, baseURL }) => {
  // Refuses non-local targets and an implicit/production test database.
  profileSnapshot = await ensurePublishedSiteProfile(browser, baseURL);
});

test.afterAll(async ({ baseURL }) => {
  // Both re-check the target, so a refused run never cleans another DB.
  await cleanupE2EContent(baseURL);
  await restoreSiteProfile(profileSnapshot, baseURL);
});

test.describe("project administration", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test("saves type, status tone and metrics, and shows them on the public project page", async ({
    page,
    baseURL,
  }) => {
    const name = `CMS metrics project ${Date.now()}`;
    const slug = uniqueSlug("project");

    await page.goto("/admin/projects/new");
    await fillProjectForm(page, { name, slug });
    await page.getByLabel("Type", { exact: true }).selectOption("client");
    await page.getByLabel("Status tone").selectOption("paused");
    await page.getByRole("button", { name: "Add metric" }).click();
    await page.getByLabel("Metric label 1").fill("Registered users");
    await page.getByLabel("Metric value 1").fill("227");
    await page.getByLabel("Metric as of 1").fill("2026-10-15");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/[a-z0-9]{24}$/);
    await expectStatus(page, /Saved/);

    await page.reload();
    await expect(page.getByLabel("Type", { exact: true })).toHaveValue(
      "client",
    );
    await expect(page.getByLabel("Metric value 1")).toHaveValue("227");

    await page.getByRole("button", { name: "Publish changes" }).click();
    await confirmNamedDialog(page, name, "Publish");
    await expectStatus(page, /Published/);

    await expectPublicStatus(baseURL!, `/projects/${slug}`, 200);
    const html = await publicHtml(baseURL!, `/projects/${slug}`);

    expect(html).toContain("Registered users");
    expect(html).toContain("227");
    expect(html).toContain("15 Oct 2026");
    expect(html).toContain("Client work");
  });

  test("a half-filled metric shows an error and does not save", async ({
    page,
  }) => {
    await page.goto("/admin/projects/new");
    await fillProjectForm(page, {
      name: `CMS bad metric ${Date.now()}`,
      slug: uniqueSlug("project"),
    });
    await page.getByRole("button", { name: "Add metric" }).click();
    await page.getByLabel("Metric label 1").fill("Registered users");
    await page.getByRole("button", { name: "Create draft" }).click();

    await expect(page).toHaveURL(/\/admin\/projects\/new$/);
    await expect(page.locator("#home-metrics-error")).toBeVisible();
  });

  test("publishes a project only after a named confirmation, keeping later draft edits private", async ({
    page,
    baseURL,
  }) => {
    const name = `CMS test project ${Date.now()}`;
    const slug = uniqueSlug("project");

    await createProjectDraft(page, { name, slug });
    await expect(
      page.getByText("Draft", { exact: true }).first(),
    ).toBeVisible();
    await expectPublicStatus(baseURL!, `/projects/${slug}`, 404);

    // Cancelling the dialog publishes nothing.
    await page.getByRole("button", { name: "Publish changes" }).click();
    const dialog = page.getByRole("dialog");

    await expect(dialog).toContainText(name);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Publish changes" }),
    ).toBeFocused();
    await expectPublicStatus(baseURL!, `/projects/${slug}`, 404);

    await page.getByRole("button", { name: "Publish changes" }).click();
    await confirmNamedDialog(page, name, "Publish");
    await expectStatus(page, /Published/);
    await expectPublicStatus(baseURL!, `/projects/${slug}`, 200, name);

    // The published slug is now read-only.
    await expect(page.getByLabel("URL slug")).toHaveCount(0);
    await expect(page.getByText(`/projects/${slug}`)).toBeVisible();
    await expect(page.getByText(/published URL can.t change/i)).toBeVisible();

    // A saved draft edit stays private until it is published again.
    await page.getByLabel("Hook").fill("A brand new private hook");
    await expectStatus(page, "Unsaved changes");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expectStatus(page, /Saved/);
    await expect(
      page.getByText(/Draft changes not published/i).first(),
    ).toBeVisible();
    expect(await publicHtml(baseURL!, `/projects/${slug}`)).not.toContain(
      "A brand new private hook",
    );

    await page.getByRole("button", { name: "Publish changes" }).click();
    await confirmNamedDialog(page, name, "Publish");
    await expectPublicStatus(
      baseURL!,
      `/projects/${slug}`,
      200,
      "A brand new private hook",
    );

    // Unpublishing takes it off the public site.
    await page.getByRole("button", { name: "Unpublish" }).click();
    await confirmNamedDialog(page, name, "Unpublish");
    await expectStatus(page, /Unpublished/);
    await expectPublicStatus(baseURL!, `/projects/${slug}`, 404);
  });

  test("shows explicit save states and keeps edits while a save is in flight", async ({
    page,
  }) => {
    const name = `CMS save states ${Date.now()}`;

    await createProjectDraft(page, { name, slug: uniqueSlug("states") });
    await page.getByLabel("Year").fill("2025");
    await expectStatus(page, "Unsaved changes");

    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));

    await page.route("**/admin/projects/**", async (route) => {
      if (route.request().method() === "POST") await held;
      await route.continue();
    });
    await page.getByRole("button", { name: "Save draft" }).click();
    await expectStatus(page, "Saving…");
    await expect(page.getByRole("button", { name: /Saving/ })).toBeDisabled();
    await page.getByLabel("Role").fill("Typed during save");
    release();
    await expectStatus(page, "Unsaved changes");
    await expect(page.getByLabel("Role")).toHaveValue("Typed during save");
    await page.unroute("**/admin/projects/**");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expectStatus(page, /Saved/);
    await page.reload();
    await expect(page.getByLabel("Year")).toHaveValue("2025");
    await expect(page.getByLabel("Role")).toHaveValue("Typed during save");
  });

  test("shows a conflict instead of overwriting a newer save", async ({
    context,
  }) => {
    // beforeEach signed this context in through the `page` fixture.
    const setup = await context.newPage();

    const id = await createProjectDraft(setup, {
      name: `CMS conflict ${Date.now()}`,
      slug: uniqueSlug("conflict"),
    });

    await setup.close();
    const [first, second] = await openEditorInTwoPages(
      context,
      `/admin/projects/${id}`,
    );

    await first.getByLabel("Hook").fill("newer");
    await first.getByRole("button", { name: "Save draft" }).click();
    await expectStatus(first, /Saved/);

    await second.getByLabel("Hook").fill("stale");
    await second.getByRole("button", { name: "Save draft" }).click();
    await expect(second.getByText(/changed in another tab/i)).toBeVisible();
    await expect(
      second.getByRole("button", { name: "Reload latest" }),
    ).toBeVisible();
    // No retry path that could resend the stale version.
    await expect(
      second.getByRole("button", { name: "Save draft" }),
    ).toBeDisabled();

    // Reloading discards the stale edits explicitly (no unload prompt).
    await second.getByRole("button", { name: "Reload latest" }).click();
    await expect(second.getByLabel("Hook")).toHaveValue("newer");
  });

  test("warns before leaving with unsaved changes, including in-app links", async ({
    page,
  }) => {
    const id = await createProjectDraft(page, {
      name: `CMS unsaved ${Date.now()}`,
      slug: uniqueSlug("unsaved"),
    });

    await page.getByLabel("Hook").fill("not saved yet");
    // Duplicating would navigate away, so it waits for a save (like Publish).
    await expect(
      page.getByRole("button", { name: "Duplicate" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Publish changes" }),
    ).toBeDisabled();
    const messages: string[] = [];

    page.once("dialog", async (dialog) => {
      messages.push(dialog.message());
      await dialog.dismiss();
    });
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Blog" })
      .click();
    await expect.poll(() => messages.length).toBe(1);
    expect(messages[0]).toMatch(/unsaved/i);
    await expect(page).toHaveURL(new RegExp(`/admin/projects/${id}$`));
    await expect(page.getByLabel("Hook")).toHaveValue("not saved yet");

    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Blog" })
      .click();
    await expect(page).toHaveURL(/\/admin\/blog$/);

    // A full reload also warns (beforeunload).
    await page.goto(`/admin/projects/${id}`);
    await page.getByLabel("Hook").fill("still not saved");
    const beforeUnload = new Promise<string>((resolve) =>
      page.once("dialog", async (dialog) => {
        resolve(dialog.type());
        await dialog.dismiss();
      }),
    );

    await page.evaluate(() => {
      window.location.href = "/admin";
    });
    expect(await beforeUnload).toBe("beforeunload");
  });

  test("lists drafts vs published, filters, trashes, restores and deletes permanently", async ({
    page,
  }) => {
    const stamp = Date.now();
    const name = `CMS lifecycle ${stamp}`;
    const slug = uniqueSlug("lifecycle");
    const id = await createProjectDraft(page, { name, slug });

    await page.goto(`/admin/projects?q=${encodeURIComponent(String(stamp))}`);
    const row = page.getByRole("row", { name: new RegExp(name) });

    await expect(row).toBeVisible();
    await expect(row).toContainText("Draft");
    await page.goto(
      `/admin/projects?q=${encodeURIComponent(String(stamp))}&status=published`,
    );
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(
      0,
    );

    // Duplicate from the list.
    await page.goto(`/admin/projects?q=${encodeURIComponent(String(stamp))}`);
    await page.getByRole("button", { name: `Duplicate ${name}` }).click();
    await expect(page.getByText(`/projects/${slug}-copy`)).toBeVisible();
    await expect(
      page.getByRole("row", { name: new RegExp(`${name} \\(copy\\)`) }),
    ).toBeVisible();

    // Trash from the editor with a named confirmation.
    await page.goto(`/admin/projects/${id}`);
    await page.getByRole("button", { name: "Move to trash" }).click();
    await confirmNamedDialog(page, name, "Move to trash");
    await expect(page).toHaveURL(/\/admin\/projects\/trash/);
    await expect(
      page.getByRole("row", { name: new RegExp(name) }),
    ).toBeVisible();
    await expect(
      page.getByRole("row", { name: new RegExp(name) }),
    ).toContainText("In trash");

    await page.goto(`/admin/projects?q=${encodeURIComponent(String(stamp))}`);
    await expect(
      page.getByRole("row", { name: new RegExp(`${name}.*${slug}(?!-copy)`) }),
    ).toHaveCount(0);

    // Restore from the trash view.
    await page.goto("/admin/projects/trash");
    await page.getByRole("button", { name: `Restore ${name}` }).click();
    await confirmNamedDialog(page, name, "Restore");
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(
      0,
    );
    await page.goto(`/admin/projects/${id}`);
    await expect(page.getByLabel("URL slug")).toHaveValue(slug);

    // Trash again and delete permanently.
    await page.getByRole("button", { name: "Move to trash" }).click();
    await confirmNamedDialog(page, name, "Move to trash");
    await page
      .getByRole("button", { name: `Delete ${name} permanently` })
      .click();
    await confirmNamedDialog(page, name, "Delete permanently");
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(
      0,
    );
    await page.goto(`/admin/projects/${id}`);
    await expect(page.getByText(/couldn.t find that project/i)).toBeVisible();
  });

  test("previews a draft through the admin preview route", async ({
    page,
    context,
    baseURL,
  }) => {
    const name = `CMS preview ${Date.now()}`;
    const slug = uniqueSlug("preview");

    await createProjectDraft(page, { name, slug });
    const [preview] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: "Preview draft" }).click(),
    ]);

    await preview.waitForLoadState();
    await expect(preview).toHaveURL(new RegExp(`/projects/${slug}$`));
    await expect(preview.getByText(name).first()).toBeVisible();
    await expectPublicStatus(baseURL!, `/projects/${slug}`, 404);
  });

  test("the case study editor rejects pasted scripts, iframes and javascript: links", async ({
    page,
  }) => {
    const id = await createProjectDraft(page, {
      name: `CMS paste ${Date.now()}`,
      slug: uniqueSlug("paste"),
    });

    await pasteHtml(page, "Case study", hostilePaste);
    await expectHostilePasteNeutralised(page, "Case study");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expectStatus(page, /Saved/);
    await page.goto(`/admin/projects/${id}`);
    await expectHostilePasteNeutralised(page, "Case study");
  });
});
