import { expect, test } from "@playwright/test";

import { signInAsAdmin } from "./helpers/admin";
import {
  cleanupE2EContent,
  confirmNamedDialog,
  ensurePublishedSiteProfile,
  removeTestSiteProfile,
  createPostDraft,
  expectHostilePasteNeutralised,
  expectPublicStatus,
  expectStatus,
  hostilePaste,
  openEditorInTwoPages,
  pasteHtml,
  publicHtml,
  uniqueSlug,
} from "./helpers/content";

test.describe.configure({ mode: "serial" });

let createdProfile = false;

test.beforeAll(async ({ browser }) => {
  createdProfile = await ensurePublishedSiteProfile(browser);
});

test.afterAll(async () => {
  await cleanupE2EContent();
  await removeTestSiteProfile(createdProfile);
});

test.describe("blog administration", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test("runs the full post lifecycle with named confirmations", async ({
    page,
    baseURL,
  }) => {
    const stamp = Date.now();
    const title = `CMS test post ${stamp}`;
    const slug = uniqueSlug("post");
    const id = await createPostDraft(page, { title, slug });

    await expectPublicStatus(baseURL!, `/blog/${slug}`, 404);

    await page.getByRole("textbox", { name: "Post body" }).click();
    await page.keyboard.type("The first published paragraph.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expectStatus(page, /Saved/);

    await page.getByRole("button", { name: "Publish changes" }).click();
    await confirmNamedDialog(page, title, "Publish");
    await expectPublicStatus(
      baseURL!,
      `/blog/${slug}`,
      200,
      "The first published paragraph.",
    );
    await expect(page.getByLabel("URL slug")).toHaveCount(0);
    await expect(page.getByText(`/blog/${slug}`)).toBeVisible();

    // Draft edits after publication stay private.
    await page.getByLabel("Summary").fill("A secret new summary");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expectStatus(page, /Saved/);
    expect(await publicHtml(baseURL!, `/blog/${slug}`)).not.toContain(
      "A secret new summary",
    );

    // Lists show published-with-changes state and filter by it.
    await page.goto(`/admin/blog?q=${stamp}&status=changes`);
    const row = page.getByRole("row", { name: new RegExp(title) });

    await expect(row).toContainText("Published");
    await expect(row).toContainText(/Draft changes not published/i);
    await page.goto(`/admin/blog?q=${stamp}&status=draft`);
    await expect(
      page.getByRole("row", { name: new RegExp(title) }),
    ).toHaveCount(0);

    await page.goto(`/admin/blog/${id}`);
    await page.getByRole("button", { name: "Unpublish" }).click();
    await confirmNamedDialog(page, title, "Unpublish");
    await expectPublicStatus(baseURL!, `/blog/${slug}`, 404);

    await page.getByRole("button", { name: "Move to trash" }).click();
    await confirmNamedDialog(page, title, "Move to trash");
    await expect(page).toHaveURL(/\/admin\/blog\/trash/);
    await page.goto(`/admin/blog?q=${stamp}`);
    await expect(
      page.getByRole("row", { name: new RegExp(title) }),
    ).toHaveCount(0);

    await page.goto("/admin/blog/trash");
    await page.getByRole("button", { name: `Restore ${title}` }).click();
    await confirmNamedDialog(page, title, "Restore");
    await expect(
      page.getByRole("row", { name: new RegExp(title) }),
    ).toHaveCount(0);
    await page.goto(`/admin/blog?q=${stamp}`);
    await expect(
      page.getByRole("row", { name: new RegExp(title) }),
    ).toBeVisible();

    await page.goto(`/admin/blog/${id}`);
    await page.getByRole("button", { name: "Move to trash" }).click();
    await confirmNamedDialog(page, title, "Move to trash");
    await page
      .getByRole("button", { name: `Delete ${title} permanently` })
      .click();
    await confirmNamedDialog(page, title, "Delete permanently");
    await expect(
      page.getByRole("row", { name: new RegExp(title) }),
    ).toHaveCount(0);
  });

  test("shows a conflict instead of overwriting a newer save", async ({
    context,
  }) => {
    // beforeEach signed this context in through the `page` fixture.
    const setup = await context.newPage();

    const id = await createPostDraft(setup, {
      title: `CMS post conflict ${Date.now()}`,
      slug: uniqueSlug("post-conflict"),
    });

    await setup.close();
    const [first, second] = await openEditorInTwoPages(
      context,
      `/admin/blog/${id}`,
    );

    await first.getByLabel("Tag").fill("newer");
    await first.getByRole("button", { name: "Save draft" }).click();
    await expectStatus(first, /Saved/);
    await second.getByLabel("Tag").fill("stale");
    await second.getByRole("button", { name: "Save draft" }).click();
    await expect(second.getByText(/changed in another tab/i)).toBeVisible();
    // Reloading discards the stale edits explicitly (no unload prompt).
    await second.getByRole("button", { name: "Reload latest" }).click();
    await expect(second.getByLabel("Tag")).toHaveValue("newer");
  });

  test("previews a draft post and warns about unsaved changes", async ({
    page,
    context,
    baseURL,
  }) => {
    const title = `CMS post preview ${Date.now()}`;
    const slug = uniqueSlug("post-preview");

    await createPostDraft(page, { title, slug });
    const [preview] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("link", { name: "Preview draft" }).click(),
    ]);

    await preview.waitForLoadState();
    await expect(preview).toHaveURL(new RegExp(`/blog/${slug}$`));
    await expect(preview.getByText(title).first()).toBeVisible();
    await preview.close();
    await expectPublicStatus(baseURL!, `/blog/${slug}`, 404);

    await page.getByLabel("Summary").fill("unsaved summary");
    await expectStatus(page, "Unsaved changes");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Projects" })
      .click();
    await expect(page).toHaveURL(/\/admin\/blog\/[a-z0-9]{24}$/);
  });

  test("the post editor rejects pasted scripts, iframes and javascript: links", async ({
    page,
  }) => {
    const id = await createPostDraft(page, {
      title: `CMS post paste ${Date.now()}`,
      slug: uniqueSlug("post-paste"),
    });

    await pasteHtml(page, "Post body", hostilePaste);
    await expectHostilePasteNeutralised(page, "Post body");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expectStatus(page, /Saved/);
    await page.goto(`/admin/blog/${id}`);
    await expectHostilePasteNeutralised(page, "Post body");
  });
});
