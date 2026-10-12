import {
  type Browser,
  type BrowserContext,
  type Page,
  expect,
  request as playwrightRequest,
} from "@playwright/test";
import { Pool } from "pg";

import { assertSafeTestDatabase } from "../../helpers/safe-database";

import { signInAsAdmin } from "./admin";

/** Every record the admin E2E specs create uses this slug prefix. */
export const e2eSlugPrefix = "e2e-cms-";

export function uniqueSlug(label: string) {
  return `${e2eSlugPrefix}${label}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function testPool() {
  process.env.TEST_DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL_UNPOOLED;
  assertSafeTestDatabase();

  return new Pool({
    connectionString: process.env.TEST_DATABASE_URL_UNPOOLED,
    max: 1,
  });
}

/**
 * Public project/post pages 404 without a published site profile. When the
 * dev branch has none, publish a test profile through the real settings
 * form (which also invalidates the cached profile). Returns whether one was
 * created so `removeTestSiteProfile` can clean it up.
 */
export async function ensurePublishedSiteProfile(browser: Browser) {
  const pool = testPool();
  let published = false;

  try {
    const { rows } = await pool.query<{ published: boolean }>(
      "select published_content is not null as published from site_profile limit 1",
    );

    published = rows[0]?.published ?? false;
  } finally {
    await pool.end();
  }
  if (published) return false;

  const page = await browser.newPage();

  try {
    await signInAsAdmin(page, "/admin/settings");
    await page.getByLabel("Name", { exact: true }).fill("E2E Test Profile");
    await page.getByLabel("Location").fill("Test City");
    await page
      .getByLabel("Tagline")
      .fill("A temporary profile for admin E2E tests");
    await page
      .getByLabel("Introduction")
      .fill("Created by the admin E2E suite.");
    await page.getByLabel("Public email").fill("e2e@example.invalid");
    await page.getByLabel("GitHub username").fill("e2e-test");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toHaveText(/Saved/);
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(/Published/);
  } finally {
    await page.close();
  }

  return true;
}

export async function removeTestSiteProfile(created: boolean) {
  if (!created) return;
  const pool = testPool();

  try {
    await pool.query(
      "delete from content_events where content_type = 'site_profile'",
    );
    await pool.query("delete from site_profile");
  } finally {
    await pool.end();
  }
}

/**
 * Removes every project/post (and their events and media usage) whose slug
 * starts with the E2E prefix. Refuses to run unless the database guard
 * confirms a non-production Neon branch.
 */
export async function cleanupE2EContent() {
  const pool = testPool();

  try {
    for (const table of ["projects", "posts"] as const) {
      const type = table === "projects" ? "project" : "post";
      const { rows } = await pool.query<{ id: string }>(
        `select id from ${table} where slug like $1`,
        [`${e2eSlugPrefix}%`],
      );
      const ids = rows.map((row) => row.id);

      if (!ids.length) continue;
      await pool.query(
        "delete from media_usage where content_type = $1 and content_id = any($2)",
        [type, ids],
      );
      await pool.query(
        "delete from content_events where content_type = $1 and content_id = any($2)",
        [type, ids],
      );
      await pool.query(`delete from ${table} where id = any($1)`, [ids]);
    }
  } finally {
    await pool.end();
  }
}

/** Fetches a public path with no cookies (no admin session, no draft mode). */
export async function expectPublicStatus(
  baseURL: string,
  path: string,
  status: number,
  contains?: string,
) {
  const anonymous = await playwrightRequest.newContext({ baseURL });

  try {
    await expect
      .poll(
        async () => {
          const response = await anonymous.get(path, {
            failOnStatusCode: false,
            maxRedirects: 0,
          });

          if (response.status() !== status) return response.status();
          if (contains && !(await response.text()).includes(contains)) {
            return `missing ${contains}`;
          }

          return response.status();
        },
        { timeout: 30_000 },
      )
      .toBe(status);
  } finally {
    await anonymous.dispose();
  }
}

export async function publicHtml(baseURL: string, path: string) {
  const anonymous = await playwrightRequest.newContext({ baseURL });

  try {
    return await (
      await anonymous.get(path, { failOnStatusCode: false })
    ).text();
  } finally {
    await anonymous.dispose();
  }
}

/** Confirms a dialog that must name the item it acts on. */
export async function confirmNamedDialog(
  page: Page,
  name: string,
  action?: string | RegExp,
) {
  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(name);
  await dialog
    .getByRole("button", { name: action ?? /^(?!Cancel)/ })
    .last()
    .click();
  await expect(dialog).toBeHidden();
}

export async function expectStatus(page: Page, text: string | RegExp) {
  await expect(
    page.getByRole("status").filter({ hasText: text }),
  ).toBeVisible();
}

export type ProjectFields = { name: string; slug: string; hook?: string };

export async function fillProjectForm(page: Page, fields: ProjectFields) {
  await page.getByLabel("Name", { exact: true }).fill(fields.name);
  await page.getByLabel("URL slug").fill(fields.slug);
  await page.getByLabel("Hook").fill(fields.hook ?? `${fields.name} hook`);
  await page.getByLabel("Homepage story").fill(`${fields.name} story`);
  await page.getByLabel("Year").fill("2026");
  await page.getByLabel("Role").fill("Engineer");
  await page.getByLabel("Status label").fill("Shipped");
  await page.getByLabel("Stack").fill("TypeScript\nPostgres");
  await page.getByLabel("SEO title").fill(fields.name);
  await page.getByLabel("SEO description").fill(`${fields.name} description`);
}

export async function createProjectDraft(page: Page, fields: ProjectFields) {
  await page.goto("/admin/projects/new");
  await fillProjectForm(page, fields);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/projects\/[a-z0-9]{24}$/);
  await expectStatus(page, /Saved/);

  return page.url().split("/").pop()!;
}

export type PostFields = { title: string; slug: string };

export async function fillPostForm(page: Page, fields: PostFields) {
  await page.getByLabel("Title", { exact: true }).fill(fields.title);
  await page.getByLabel("URL slug").fill(fields.slug);
  await page.getByLabel("Summary").fill(`${fields.title} summary`);
  await page.getByLabel("Tag").fill("Notes");
  await page.getByLabel("SEO title").fill(fields.title);
  await page.getByLabel("SEO description").fill(`${fields.title} description`);
}

export async function createPostDraft(page: Page, fields: PostFields) {
  await page.goto("/admin/blog/new");
  await fillPostForm(page, fields);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/blog\/[a-z0-9]{24}$/);
  await expectStatus(page, /Saved/);

  return page.url().split("/").pop()!;
}

/** Two tabs on the same editor URL (the context is already signed in). */
export async function openEditorInTwoPages(
  context: BrowserContext,
  path: string,
) {
  const first = await context.newPage();

  await first.goto(path);
  const second = await context.newPage();

  await second.goto(path);

  return [first, second] as const;
}

/** Pastes HTML into the rich-text editor through a real paste event. */
export async function pasteHtml(page: Page, label: string, html: string) {
  const editor = page.getByRole("textbox", { name: label });

  await editor.click();
  await editor.evaluate((element, markup) => {
    const data = new DataTransfer();

    data.setData("text/html", markup);
    data.setData("text/plain", "fallback");
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, html);
}

export const hostilePaste = `<p>Safe pasted text</p>
<script>window.__pwned = 1</script>
<iframe src="https://evil.example/frame"></iframe>
<object data="https://evil.example/x.swf"></object>
<p><a href="javascript:window.__pwned=2">bad link</a> and <a href="https://example.com/ok">good link</a></p>
<img src="https://evil.example/x.png" onerror="window.__pwned=3">
<p onclick="window.__pwned=4" style="color:red">styled</p>`;

export async function expectHostilePasteNeutralised(page: Page, label: string) {
  const editor = page.getByRole("textbox", { name: label });

  await expect(editor).toContainText("Safe pasted text");
  await expect(editor).toContainText("bad link");
  await expect(
    editor.locator("script, iframe, object, embed, img"),
  ).toHaveCount(0);
  await expect(editor.locator('a[href^="javascript"]')).toHaveCount(0);
  await expect(editor.locator("a", { hasText: "bad link" })).toHaveCount(0);
  await expect(editor.locator('a[href="https://example.com/ok"]')).toHaveCount(
    1,
  );
  await expect(editor.locator("[onclick], [style]")).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as { __pwned?: number }).__pwned),
  ).toBeUndefined();
}
