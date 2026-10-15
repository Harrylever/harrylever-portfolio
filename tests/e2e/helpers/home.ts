import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type Page,
  expect,
  request as playwrightRequest,
} from "@playwright/test";

import { fakeCloudinary } from "./cloudinary-fake";
import { assertSafeE2ETarget, testPool } from "./content";

/** Public DOM ids of the homepage sections (see src/page-sections). */
export const publicSectionIds = {
  intro: "top",
  now: "now",
  built: "built",
  commits: "ship",
  frames: "frames",
  reach: "reach",
  loop: "loop",
  say: "say",
} as const;

export type HomeType = keyof typeof publicSectionIds;

type Row = Record<string, unknown>;

export type HomeSnapshot = {
  sections: Row[];
  usage: Row[];
  eventIds: string[];
};

const recoveryFile = join(
  tmpdir(),
  "harrylever-portfolio-e2e-home-snapshot.json",
);

/**
 * Snapshots every homepage row (and its media usage and events), then
 * clears the homepage so the suite starts from a known state. The snapshot
 * is also written to a recovery file in the OS temp dir in case teardown
 * never runs.
 */
export async function snapshotAndClearHome(
  baseURL: string | undefined,
): Promise<HomeSnapshot> {
  assertSafeE2ETarget(baseURL);
  const pool = testPool();

  try {
    const sections = (await pool.query("select * from home_sections")).rows;
    const usage = (
      await pool.query(
        "select * from media_usage where content_type = 'home_section'",
      )
    ).rows;
    const eventIds = (
      await pool.query<{ id: string }>(
        "select id from content_events where content_type = 'home_section'",
      )
    ).rows.map((row) => row.id);
    const snapshot = { sections, usage, eventIds };

    writeFileSync(recoveryFile, JSON.stringify(snapshot, null, 2));
    await pool.query(
      "delete from media_usage where content_type = 'home_section'",
    );
    await pool.query("delete from home_sections");

    return snapshot;
  } finally {
    await pool.end();
  }
}

/** Puts back exactly the rows captured by snapshotAndClearHome. */
export async function restoreHome(
  snapshot: HomeSnapshot | undefined,
  baseURL: string | undefined,
) {
  if (!snapshot) return;
  assertSafeE2ETarget(baseURL);
  const pool = testPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      "delete from media_usage where content_type = 'home_section'",
    );
    await client.query(
      `delete from content_events
        where content_type = 'home_section' and not (id = any($1))`,
      [snapshot.eventIds],
    );
    await client.query("delete from home_sections");
    for (const row of snapshot.sections) {
      await client.query(
        `insert into home_sections
           (id, type, draft_content, published_content, draft_visible,
            published_visible, draft_position, published_position,
            first_published_at, published_at, created_at, updated_at)
         values ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          row.id,
          row.type,
          JSON.stringify(row.draft_content),
          row.published_content === null
            ? null
            : JSON.stringify(row.published_content),
          row.draft_visible,
          row.published_visible,
          row.draft_position,
          row.published_position,
          row.first_published_at,
          row.published_at,
          row.created_at,
          row.updated_at,
        ],
      );
    }
    for (const row of snapshot.usage) {
      await client.query(
        `insert into media_usage
           (id, media_asset_id, content_type, content_id, snapshot, field, created_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          row.id,
          row.media_asset_id,
          row.content_type,
          row.content_id,
          row.snapshot,
          row.field,
          row.created_at,
        ],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Removes media rows in the fake E2E Cloudinary folder (and any usage of
 * them). Only the suite ever registers assets in that folder.
 */
export async function cleanupE2EMedia(baseURL: string | undefined) {
  assertSafeE2ETarget(baseURL);
  const pool = testPool();

  try {
    const pattern = `${fakeCloudinary.folder}/%`;

    await pool.query(
      `delete from media_usage where media_asset_id in
         (select id from media_assets where public_id like $1)`,
      [pattern],
    );
    await pool.query("delete from media_assets where public_id like $1", [
      pattern,
    ]);
  } finally {
    await pool.end();
  }
}

function e2eId() {
  let id = "e";

  while (id.length < 24) id += Math.random().toString(36).slice(2);

  return id.slice(0, 24);
}

/** A registered image with no alt text (the admin UI can't create one). */
export async function insertAssetWithoutAlt(baseURL: string | undefined) {
  assertSafeE2ETarget(baseURL);
  const pool = testPool();
  const id = e2eId();
  const publicId = `${fakeCloudinary.folder}/e2e-cms-noalt-${id}`;

  try {
    await pool.query(
      `insert into media_assets
         (id, public_id, resource_type, secure_url, width, height, bytes, format, alt_text)
       values ($1, $2, 'image', $3, 4, 3, 100, 'png', '')`,
      [
        id,
        publicId,
        `https://res.cloudinary.com/${fakeCloudinary.cloudName}/image/upload/v1/${publicId}.png`,
      ],
    );
  } finally {
    await pool.end();
  }

  return id;
}

export async function queryRows<T extends Row>(
  baseURL: string | undefined,
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  assertSafeE2ETarget(baseURL);
  const pool = testPool();

  try {
    return (await pool.query<T>(text, values)).rows;
  } finally {
    await pool.end();
  }
}

/** The public homepage as an anonymous visitor sees it. */
async function anonymousHome(baseURL: string) {
  const anonymous = await playwrightRequest.newContext({ baseURL });

  try {
    const response = await anonymous.get("/", { failOnStatusCode: false });

    return { status: response.status(), html: await response.text() };
  } finally {
    await anonymous.dispose();
  }
}

function visibleOrder(html: string) {
  return (Object.entries(publicSectionIds) as [HomeType, string][])
    .map(([type, id]) => ({ type, index: html.indexOf(`id="${id}"`) }))
    .filter((item) => item.index !== -1)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.type);
}

/** Polls until the public homepage shows `types` first, in that order. */
export async function expectPublishedHomeOrder(
  baseURL: string,
  types: HomeType[],
) {
  await expect
    .poll(
      async () => {
        const { status, html } = await anonymousHome(baseURL);

        return status === 200
          ? visibleOrder(html).slice(0, types.length)
          : status;
      },
      // Publishing invalidates the cached homepage; the dev server is slow.
      { timeout: 45_000 },
    )
    .toEqual(types);
}

export async function expectPublicSectionHidden(
  baseURL: string,
  type: HomeType,
) {
  await expect
    .poll(
      async () => {
        const { status, html } = await anonymousHome(baseURL);

        return status === 200 && !visibleOrder(html).includes(type);
      },
      // Publishing invalidates the cached homepage; the dev server is slow.
      { timeout: 45_000 },
    )
    .toBe(true);
}

export async function expectPublicHome(
  baseURL: string,
  text: string,
  present: boolean,
) {
  await expect
    .poll(
      async () => {
        const { status, html } = await anonymousHome(baseURL);

        // No published homepage (404) shows nothing either.
        return status === 200 && html.includes(text);
      },
      // Publishing invalidates the cached homepage; the dev server is slow.
      { timeout: 45_000 },
    )
    .toBe(present);
}

/** The running-order row for a section on /admin/home. */
export function sectionRow(page: Page, name: string) {
  return page.getByRole("listitem").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });
}

export async function moveSection(
  page: Page,
  name: string,
  direction: "up" | "down",
) {
  await sectionRow(page, name)
    .getByRole("button", {
      name: `Move ${name} ${direction === "up" ? "up" : "down"}`,
    })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    `${name} moved to position`,
    // Reorder rewrites all eight rows in one transaction; give it time.
    { timeout: 45_000 },
  );
}

export async function setSectionVisibility(
  page: Page,
  name: string,
  visible: boolean,
) {
  const toggle = sectionRow(page, name).getByRole("checkbox", {
    name: `Show ${name} on the homepage`,
  });

  if (visible) await toggle.check();
  else await toggle.uncheck();
  await expect(toggle).toBeEnabled({ timeout: 45_000 });
  await expect(toggle).toBeChecked({ checked: visible });
}

export async function adminOrder(page: Page) {
  return page
    .getByRole("list", { name: "Homepage running order" })
    .getByRole("heading", { level: 2 })
    .allTextContents();
}
