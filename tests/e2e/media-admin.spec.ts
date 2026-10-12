import { type Page, expect, test } from "@playwright/test";

import { signInAsAdmin } from "./helpers/admin";
import {
  destroyedPublicIds,
  failNextRegistration,
  fakeCloudinary,
  installCloudinaryFake,
  pngBytes,
  resetFakeCloudinary,
} from "./helpers/cloudinary-fake";
import {
  assertSafeE2ETarget,
  cleanupE2EContent,
  confirmNamedDialog,
  createProjectDraft,
  expectStatus,
  uniqueSlug,
} from "./helpers/content";
import { cleanupE2EMedia, queryRows } from "./helpers/home";

/*
 * Cloudinary is faked (see helpers/cloudinary-fake.ts): the browser upload
 * is intercepted by Playwright and the server's verification lookup reads
 * the fake store. Everything else (signature route, server action,
 * verification, database registration, usage, deletion) is real.
 */
// Multi-form flows; generous timeout for a cold `next dev` compile.
test.describe.configure({ mode: "serial", timeout: 240_000 });

const run = Date.now().toString(36);

test.beforeAll(({ baseURL }) => {
  assertSafeE2ETarget(baseURL);
  resetFakeCloudinary();
});

test.afterAll(async ({ baseURL }) => {
  await cleanupE2EContent(baseURL);
  await cleanupE2EMedia(baseURL);
  resetFakeCloudinary();
});

async function assertFakeCloud(page: Page) {
  const response = await page.request.get("/api/admin/media/signature");

  expect(response.ok()).toBe(true);
  const body = await response.json();

  // Refuse to upload anywhere but the fake cloud and test folder.
  expect(body.cloudName).toBe(fakeCloudinary.cloudName);
  expect(body.folder).toBe(fakeCloudinary.folder);
  expect(body.maxBytes).toBe(10 * 1024 * 1024);
  expect(JSON.stringify(body)).not.toContain(fakeCloudinary.apiSecret);
}

function chooseFile(
  page: Page,
  name: string,
  buffer: Buffer,
  mimeType = "image/png",
) {
  return page
    .getByLabel("Image file")
    .setInputFiles({ name, mimeType, buffer });
}

async function upload(page: Page, alt: string) {
  await chooseFile(page, `${alt}.png`, pngBytes(8, 6));
  await page.getByLabel("Describe this image").fill(alt);
  await page.getByRole("button", { name: "Upload image" }).click();
}

function assetCard(page: Page, alt: string) {
  return page
    .getByRole("list", { name: "Images" })
    .getByRole("listitem")
    .filter({ hasText: alt });
}

test("uploads directly to Cloudinary and registers only verified metadata", async ({
  page,
  baseURL,
}) => {
  const log = await installCloudinaryFake(page);

  await signInAsAdmin(page, "/admin/media");
  await assertFakeCloud(page);

  // Alt text is required before anything is sent.
  await chooseFile(page, "desk.png", pngBytes());
  await page.getByRole("button", { name: "Upload image" }).click();
  await expect(page.locator("#media-upload-alt-error")).toHaveText(
    "Describe the image for people who can't see it.",
  );
  // Files over 10 MiB are refused in the browser.
  await chooseFile(page, "huge.png", Buffer.alloc(10 * 1024 * 1024 + 1));
  await expect(page.locator("#media-upload-file-error")).toContainText(
    "The limit is 10 MB per image.",
  );
  expect(log.uploads).toHaveLength(0);

  // A response that disagrees with Cloudinary's record is rejected.
  log.tamperNextResponse = true;
  await upload(page, `Tampered ${run}`);
  await expect(
    page.getByRole("alert").filter({ hasText: "Cloudinary" }),
  ).toContainText("Cloudinary couldn't confirm this upload", {
    timeout: 45_000,
  });

  const alt = `Desk at night ${run}`;

  await upload(page, alt);
  await expectStatus(page, /Uploaded/);
  await expect(assetCard(page, alt)).toBeVisible();

  // The signed parameters reached Cloudinary; the secret never left the server.
  expect(log.uploads).toHaveLength(2);
  expect(log.uploads[1].fields.folder).toBe(fakeCloudinary.folder);
  for (const body of log.rawBodies) {
    expect(body).not.toContain(fakeCloudinary.apiSecret);
  }
  const rows = await queryRows<{
    public_id: string;
    width: number;
    alt_text: string;
  }>(
    baseURL,
    "select public_id, width, alt_text from media_assets where public_id like $1",
    [`${fakeCloudinary.folder}/%`],
  );

  expect(rows).toEqual([
    { public_id: log.uploads[1].publicId, width: 8, alt_text: alt },
  ]);
});

test("retries an upload whose registration was orphaned", async ({
  page,
  baseURL,
}) => {
  const log = await installCloudinaryFake(page);
  const alt = `Retry me ${run}`;

  await signInAsAdmin(page, "/admin/media");
  failNextRegistration();
  await upload(page, alt);
  await expect(
    page.getByRole("alert").filter({ hasText: "registered" }),
  ).toContainText("could not be registered", { timeout: 45_000 });
  const orphan = log.uploads.at(-1)!.publicId;

  expect(destroyedPublicIds()).toContain(orphan);
  await page.getByRole("button", { name: "Retry upload" }).click();
  await expectStatus(page, /Uploaded/);
  await expect(assetCard(page, alt)).toBeVisible();

  const rows = await queryRows<{ public_id: string }>(
    baseURL,
    "select public_id from media_assets where alt_text = $1",
    [alt],
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].public_id).not.toBe(orphan);
});

test("edits alt text and caption, and copies the URL", async ({
  page,
  context,
}) => {
  await installCloudinaryFake(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const alt = `Desk at night ${run}`;

  await signInAsAdmin(page, "/admin/media");
  await assetCard(page, alt).getByRole("button", { name: "Open" }).click();
  const details = page.getByRole("region", { name: "Image details" });

  await details.getByLabel("Alt text", { exact: true }).fill("");
  await details.getByRole("button", { name: "Save details" }).click();
  await expect(details.locator("#media-alt-error")).toHaveText(
    "Describe the image for people who can't see it.",
  );
  const newAlt = `Desk lamp ${run}`;

  await details.getByLabel("Alt text", { exact: true }).fill(newAlt);
  await details.getByLabel("Caption", { exact: true }).fill("Late night");
  await details.getByRole("button", { name: "Save details" }).click();
  await expectStatus(page, "Details saved");
  await expect(assetCard(page, newAlt)).toBeVisible();

  await details.getByRole("button", { name: "Copy URL" }).click();
  await expectStatus(page, "URL copied");
  const url = await details.getByLabel("Image URL").inputValue();

  expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\/e2e-fake-cloud\//);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
});

test("blocks deletion of an attached asset, then deletes it once unused", async ({
  page,
  baseURL,
}) => {
  const log = await installCloudinaryFake(page);
  const name = `Media user ${run}`;
  const alt = `Cover via picker ${run}`;

  await signInAsAdmin(page, "/admin/projects");
  const projectId = await createProjectDraft(page, {
    name,
    slug: uniqueSlug("media-user"),
  });

  // Upload through the picker's upload slot, then use it as the cover.
  await page
    .getByRole("group", { name: "Cover image" })
    .getByRole("button", { name: "Choose image" })
    .click();
  const picker = page.getByRole("dialog");

  await picker.getByText("Upload a new image").click();
  await picker.getByLabel("Image file").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: pngBytes(10, 5),
  });
  await picker.getByLabel("Describe this image").fill(alt);
  await picker.getByRole("button", { name: "Upload image" }).click();
  await expect(picker.getByRole("radio", { checked: true })).toBeVisible();
  await picker.getByRole("button", { name: "Use image" }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expectStatus(page, /Saved/);
  const publicId = log.uploads.at(-1)!.publicId;
  const [asset] = await queryRows<{ id: string }>(
    baseURL,
    "select id from media_assets where public_id = $1",
    [publicId],
  );

  // Usage is listed and deletion is refused with a "used by" message.
  await page.goto(`/admin/media?asset=${asset.id}`);
  const details = page.getByRole("region", { name: "Image details" });

  await expect(
    details.getByRole("link", { name: `Project “${name}”` }),
  ).toHaveAttribute("href", `/admin/projects/${projectId}`);
  await details.getByRole("button", { name: "Delete permanently" }).click();
  await expect(details.getByText(/used by/i)).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(destroyedPublicIds()).not.toContain(publicId);

  // Detach it, then delete permanently (no trash for media).
  await page.goto(`/admin/projects/${projectId}`);
  await page
    .getByRole("group", { name: "Cover image" })
    .getByRole("button", { name: "Remove image" })
    .click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expectStatus(page, /Saved/);

  await page.goto(`/admin/media?asset=${asset.id}`);
  await expect(details).toContainText("Not used");
  await details.getByRole("button", { name: "Delete permanently" }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog).toContainText("can't be undone");
  await expect(dialog).toContainText("no trash");
  await confirmNamedDialog(page, alt, "Delete permanently");
  await expectStatus(page, /Deleted/);
  await expect(assetCard(page, alt)).toHaveCount(0);
  expect(destroyedPublicIds()).toContain(publicId);
  expect(
    await queryRows(baseURL, "select id from media_assets where id = $1", [
      asset.id,
    ]),
  ).toHaveLength(0);
});
