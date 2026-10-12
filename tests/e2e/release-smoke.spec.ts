import { type APIRequestContext, expect, test } from "@playwright/test";

import { signInAsAdmin } from "./helpers/admin";
import {
  type SiteProfileSnapshot,
  cleanupE2EContent,
  confirmNamedDialog,
  createPostDraft,
  createProjectDraft,
  ensurePublishedSiteProfile,
  expectPublicStatus,
  expectStatus,
  publicHtml,
  restoreSiteProfile,
  uniqueSlug,
} from "./helpers/content";

/*
 * Release acceptance (Task 15): the owner's complete publishing flow against
 * the local TEST database. Covers public HTML, page metadata, sitemap
 * inclusion/exclusion and preview authorization for a project and a post.
 * Homepage publication is covered by home-admin.spec.ts; media delivery by
 * media-admin.spec.ts (fake Cloudinary only: a real upload/destroy is a
 * manual production smoke step, see docs/admin-cms-handoff.md).
 */
test.describe.configure({ mode: "serial", timeout: 240_000 });

let profileSnapshot: SiteProfileSnapshot = { touched: false };

test.beforeAll(async ({ browser, baseURL }) => {
  // Refuses non-local targets and a non-test database.
  profileSnapshot = await ensurePublishedSiteProfile(browser, baseURL);
});

test.afterAll(async ({ baseURL }) => {
  await cleanupE2EContent(baseURL);
  await restoreSiteProfile(profileSnapshot, baseURL);
});

/** Paths listed in /sitemap.xml (absolute URLs use the production domain). */
async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  const response = await request.get("/sitemap.xml");

  expect(response.status()).toBe(200);

  const locs = (await response.text()).match(/<loc>[^<]+<\/loc>/g) ?? [];

  return locs.map((loc) => new URL(loc.replace(/<\/?loc>/g, "")).pathname);
}

async function expectInSitemap(
  request: APIRequestContext,
  path: string,
  included: boolean,
) {
  await expect
    .poll(async () => (await sitemapPaths(request)).includes(path), {
      timeout: 45_000,
    })
    .toBe(included);
}

function titleOf(html: string) {
  return html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
}

test("ships the complete owner publishing flow for a project", async ({
  page,
  request,
  baseURL,
}) => {
  await signInAsAdmin(page);
  const name = `Release smoke project ${Date.now()}`;
  const slug = uniqueSlug("smoke-project");
  const path = `/projects/${slug}`;

  await createProjectDraft(page, { name, slug });
  await expectPublicStatus(baseURL!, path, 404);
  await expectInSitemap(request, path, false);

  // Anonymous visitors cannot enable draft mode.
  const anonymousPreview = await request.get(
    `/api/admin/preview?type=project&slug=${slug}`,
    { maxRedirects: 0, failOnStatusCode: false },
  );

  expect([401, 403]).toContain(anonymousPreview.status());
  await expectPublicStatus(baseURL!, path, 404);

  await page.getByRole("button", { name: "Publish changes" }).click();
  await confirmNamedDialog(page, name, "Publish");
  await expectStatus(page, /Published/);
  await expectPublicStatus(baseURL!, path, 200, name);
  expect(titleOf(await publicHtml(baseURL!, path))).toContain(name);
  expect(await publicHtml(baseURL!, path)).not.toContain(
    'name="robots" content="noindex',
  );
  await expectInSitemap(request, path, true);

  await page.getByRole("button", { name: "Unpublish" }).click();
  await confirmNamedDialog(page, name, "Unpublish");
  await expectStatus(page, /Unpublished/);
  await expectPublicStatus(baseURL!, path, 404);
  await expectInSitemap(request, path, false);
});

test("ships the complete owner publishing flow for a post", async ({
  page,
  context,
  request,
  baseURL,
}) => {
  await signInAsAdmin(page);
  const title = `Release smoke post ${Date.now()}`;
  const slug = uniqueSlug("smoke-post");
  const path = `/blog/${slug}`;

  await createPostDraft(page, { title, slug });

  // The signed-in owner can preview the draft; the public still gets 404.
  const [preview] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: "Preview draft" }).click(),
  ]);

  await preview.waitForLoadState();
  await expect(preview.getByText(title).first()).toBeVisible();
  await preview.close();
  await expectPublicStatus(baseURL!, path, 404);
  await expectInSitemap(request, path, false);

  await page.getByRole("button", { name: "Publish changes" }).click();
  await confirmNamedDialog(page, title, "Publish");
  await expectStatus(page, /Published/);
  await expectPublicStatus(baseURL!, path, 200, title);
  expect(titleOf(await publicHtml(baseURL!, path))).toContain(title);
  await expectInSitemap(request, path, true);

  await page.getByRole("button", { name: "Unpublish" }).click();
  await confirmNamedDialog(page, title, "Unpublish");
  await expectPublicStatus(baseURL!, path, 404);
  await expectInSitemap(request, path, false);
});
