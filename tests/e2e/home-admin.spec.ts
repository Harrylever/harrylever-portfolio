import { type Page, expect, test } from "@playwright/test";

import { signInAsAdmin } from "./helpers/admin";
import {
  type SiteProfileSnapshot,
  assertSafeE2ETarget,
  confirmNamedDialog,
  ensurePublishedSiteProfile,
  expectStatus,
  openEditorInTwoPages,
  restoreSiteProfile,
} from "./helpers/content";
import {
  type HomeSnapshot,
  adminOrder,
  cleanupE2EMedia,
  expectPublicHome,
  expectPublicSectionHidden,
  expectPublishedHomeOrder,
  insertAssetWithoutAlt,
  moveSection,
  restoreHome,
  sectionRow,
  setSectionVisibility,
  snapshotAndClearHome,
} from "./helpers/home";

/*
 * The suite snapshots the homepage rows, clears them, builds all eight
 * sections through the admin forms, and restores the snapshot exactly in
 * afterAll (see helpers/home.ts).
 */
// Multi-form flows; generous timeout for a cold `next dev` compile.
test.describe.configure({ mode: "serial", timeout: 240_000 });

const run = Date.now().toString(36);
let profile: SiteProfileSnapshot | undefined;
let home: HomeSnapshot | undefined;

test.beforeAll(async ({ browser, baseURL }) => {
  assertSafeE2ETarget(baseURL);
  profile = await ensurePublishedSiteProfile(browser, baseURL);
  home = await snapshotAndClearHome(baseURL);
});

test.afterAll(async ({ baseURL }) => {
  await restoreHome(home, baseURL);
  await cleanupE2EMedia(baseURL);
  if (profile) await restoreSiteProfile(profile, baseURL);
});

async function saveSection(page: Page) {
  await page.getByRole("button", { name: "Save draft" }).click();
  await expectStatus(page, /^Saved/);
}

/**
 * Native HTML5 drag events (dragstart → dragover → drop → dragend) with a
 * shared DataTransfer. Dispatched directly: Playwright's mouse-driven drag
 * emulation didn't deliver drop reliably to these rows in Chromium.
 */
async function dragSection(page: Page, source: string, target: string) {
  await expect(page.locator('ol.adm-order[data-ready="true"]')).toBeVisible();
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  const from = sectionRow(page, source);
  const to = sectionRow(page, target);

  await from.dispatchEvent("dragstart", { dataTransfer });
  await to.dispatchEvent("dragover", { dataTransfer });
  await to.dispatchEvent("drop", { dataTransfer });
  await from.dispatchEvent("dragend", { dataTransfer });
}

const heading = (page: Page) => page.getByLabel("Heading", { exact: true });

async function createSections(page: Page) {
  await page.goto("/admin/home/intro");
  await page.getByLabel("Fragment 1", { exact: true }).fill("I build");
  await page.getByRole("button", { name: "Add fragment" }).click();
  await page.getByLabel("Fragment 2", { exact: true }).fill("odd things");
  await page.getByLabel("Emphasise fragment 2").check();
  await page.getByLabel("Lede").fill(`Intro lede ${run}`);
  await page.getByLabel("Placeholder slot").fill("intro-portrait");
  await page.getByLabel("Placeholder aspect ratio").fill("4 / 5");
  await saveSection(page);

  await page.goto("/admin/home/now");
  await heading(page).fill(`Right now ${run}`);
  await page.getByLabel("Label 1").fill("Work");
  await page.getByLabel("Body 1").fill("Building a CMS");
  await saveSection(page);

  await page.goto("/admin/home/built");
  await heading(page).fill("Things I've built");
  await page.getByLabel("Button label").fill("Read the write-ups");
  await saveSection(page);

  await page.goto("/admin/home/commits");
  await heading(page).fill("Commits");
  await page.getByLabel("GitHub username").fill("harrylever");
  await saveSection(page);

  await page.goto("/admin/home/frames");
  await heading(page).fill(`Off the screen ${run}`);
  await page.getByRole("button", { name: "Add figure" }).click();
  await page.getByLabel("Figure 1 slot").fill("frame-desk");
  await page.getByLabel("Figure 1 aspect ratio").fill("3 / 4");
  await page.getByLabel("Figure 1 caption").fill("The desk");
  await saveSection(page);

  await page.goto("/admin/home/reach");
  await heading(page).fill("What I reach for");
  await page.getByLabel("Group 1 label").fill("Web");
  await page.getByLabel("Group 1 items").fill("React\nNext.js");
  await saveSection(page);

  await page.goto("/admin/home/loop");
  await heading(page).fill("AI in the loop");
  await page.getByLabel("Intro", { exact: true }).fill("How I use AI");
  await page.getByLabel("Tool 1", { exact: true }).fill("Claude");
  await page.getByLabel("Use 1").fill("Pairing");
  await page.getByLabel("Frequency 1").selectOption("Every day");
  await saveSection(page);

  await page.goto("/admin/home/say");
  await heading(page).fill(`Say hello ${run}`);
  await page.getByLabel("Email").fill("e2e@example.invalid");
  await saveSection(page);
}

test("creates all eight fixed sections through their forms", async ({
  page,
}) => {
  await signInAsAdmin(page, "/admin/home");
  await expect(
    page.getByRole("heading", { name: "Homepage", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish homepage" }),
  ).toBeDisabled();

  // Field-level validation on an empty form.
  await page.goto("/admin/home/now");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("#home-heading-error")).toHaveText("Required.");
  await expect(page.locator("#home-items-0-label-error")).toHaveText(
    "Required.",
  );

  await createSections(page);
  await page.goto("/admin/home");
  expect(await adminOrder(page)).toEqual([
    "Intro",
    "Now",
    "Built",
    "Commits",
    "Frames",
    "Reach",
    "Loop",
    "Say",
  ]);
  await expect(sectionRow(page, "Now")).toContainText("Not published");
});

test("publishes homepage order and visibility as one snapshot", async ({
  page,
  baseURL,
}) => {
  await signInAsAdmin(page, "/admin/home");
  // Native drag and drop: Now onto Built.
  await dragSection(page, "Now", "Built");
  await expect
    .poll(() => adminOrder(page))
    .toEqual([
      "Intro",
      "Built",
      "Now",
      "Commits",
      "Frames",
      "Reach",
      "Loop",
      "Say",
    ]);
  await moveSection(page, "Now", "up");
  await expect
    .poll(() => adminOrder(page))
    .toEqual([
      "Intro",
      "Now",
      "Built",
      "Commits",
      "Frames",
      "Reach",
      "Loop",
      "Say",
    ]);
  // Keyboard path: move buttons keep focus on the moved section.
  await moveSection(page, "Commits", "up");
  await expect(
    sectionRow(page, "Commits").getByRole("button", {
      name: "Move Commits up",
    }),
  ).toBeFocused();
  await moveSection(page, "Commits", "down");
  await setSectionVisibility(page, "Frames", false);

  // Nothing is public before publishing.
  await expectPublicHome(baseURL!, `Right now ${run}`, false);

  await page.getByRole("button", { name: "Publish homepage" }).click();
  await confirmNamedDialog(page, "the homepage", "Publish homepage");
  await expect(page.getByRole("status").first()).toContainText(
    "Published. The public homepage is updated.",
    { timeout: 45_000 },
  );
  await expectPublishedHomeOrder(baseURL!, ["intro", "now", "built"]);
  await expectPublicSectionHidden(baseURL!, "frames");
  await expect(sectionRow(page, "Frames")).toContainText("Hidden");
  await expect(
    page.getByRole("button", { name: "Publish homepage" }),
  ).toBeDisabled();
});

test("keeps section edits private until publish and previews the draft", async ({
  page,
  baseURL,
}) => {
  await signInAsAdmin(page, "/admin/home/now");
  const draftHeading = `Draft heading ${run}`;

  await heading(page).fill(draftHeading);
  await page.getByLabel("Show on the homepage").check();
  await saveSection(page);
  await expectPublicHome(baseURL!, draftHeading, false);

  const preview = page.getByRole("link", { name: "Preview draft" });

  await expect(preview).toHaveAttribute("href", "/api/admin/preview?type=home");
  await page.goto("/api/admin/preview?type=home");
  await expect(page.getByText(draftHeading)).toBeVisible();
  await expectPublicHome(baseURL!, draftHeading, false);

  await page.goto("/admin/home");
  await expect(sectionRow(page, "Now")).toContainText("Changes not published");
  await page.getByRole("button", { name: "Publish homepage" }).click();
  await confirmNamedDialog(page, "the homepage", "Publish homepage");
  await expect(page.getByRole("status").first()).toContainText("Published", {
    timeout: 45_000,
  });
  await expectPublicHome(baseURL!, draftHeading, true);
});

test("reports an atomic publish failure and publishes nothing", async ({
  page,
  baseURL,
}) => {
  const assetId = await insertAssetWithoutAlt(baseURL);
  const sayHeading = `Say changed ${run}`;

  await signInAsAdmin(page, "/admin/home/say");
  await heading(page).fill(sayHeading);
  await saveSection(page);

  // Attach an image that has no alt text to a frames figure.
  await page.goto("/admin/home/frames");
  await page.getByRole("button", { name: "Add figure" }).click();
  await page
    .getByRole("group", { name: "Figure 2 source" })
    .getByLabel("Uploaded image")
    .check();
  await page.getByLabel("Figure 2 aspect ratio").fill("1 / 1");
  await page.getByLabel("Figure 2 caption").fill("No alt yet");
  await page
    .getByRole("group", { name: "Figure 2 image" })
    .getByRole("button", { name: "Choose image" })
    .click();
  const picker = page.getByRole("dialog");

  await picker.locator(`input[value="${assetId}"]`).check();
  await expect(picker).toContainText("This image has no alt text yet");
  await picker.getByRole("button", { name: "Use image" }).click();
  await saveSection(page);

  await page.goto("/admin/home");
  await page.getByRole("button", { name: "Publish homepage" }).click();
  await confirmNamedDialog(page, "the homepage", "Publish homepage");
  // Next's route announcer is also an alert; pick ours by its text.
  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Nothing was published" });

  await expect(alert).toBeVisible({ timeout: 45_000 });
  await expect(alert).toContainText("Frames");
  await expectPublicHome(baseURL!, sayHeading, false);

  // Fix it in the media library, then publish again.
  await page.goto(`/admin/media?asset=${assetId}`);
  const details = page.getByRole("region", { name: "Image details" });

  await details
    .getByLabel("Alt text", { exact: true })
    .fill("A desk with a lamp");
  await details.getByRole("button", { name: "Save details" }).click();
  await expectStatus(page, "Details saved");

  await page.goto("/admin/home");
  await page.getByRole("button", { name: "Publish homepage" }).click();
  await confirmNamedDialog(page, "the homepage", "Publish homepage");
  await expect(page.getByRole("status").first()).toContainText("Published", {
    timeout: 45_000,
  });
  await expectPublicHome(baseURL!, sayHeading, true);
});

test("never overwrites a section changed in another tab", async ({
  context,
}) => {
  const setup = await context.newPage();

  await signInAsAdmin(setup, "/admin/home");
  await setup.close();
  const [first, second] = await openEditorInTwoPages(
    context,
    "/admin/home/built",
  );

  await heading(first).fill(`First tab ${run}`);
  await saveSection(first);

  await heading(second).fill(`Second tab ${run}`);
  await second.getByRole("button", { name: "Save draft" }).click();
  await expectStatus(second, /changed in another tab/);
  await expect(
    second.getByRole("button", { name: "Save draft" }),
  ).toBeDisabled();

  await second.reload();
  await expect(heading(second)).toHaveValue(`First tab ${run}`);

  // Unsaved edits warn before leaving through an in-app link.
  await heading(second).fill("Unsaved");
  second.once("dialog", (dialog) => void dialog.dismiss());
  await second.getByRole("link", { name: "All sections" }).click();
  await expect(second).toHaveURL(/\/admin\/home\/built$/);
});
