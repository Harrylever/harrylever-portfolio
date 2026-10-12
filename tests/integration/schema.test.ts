import { afterAll, describe, expect, test } from "bun:test";
import { isCuid } from "@paralleldrive/cuid2";
import { getTableColumns } from "drizzle-orm";

import { createId } from "@/server/db/id";
import {
  contentEvents,
  homeSections,
  mediaAssets,
  mediaUsage,
  posts,
  projects,
  siteProfile,
} from "@/server/db/schema/content";
import {
  foreignKeyTargets,
  indexDefinition,
  primaryKeyType,
  tableNames,
  testPool,
  timestampType,
  withRollback,
} from "../helpers/database";

const removedAuthTables = [
  "account",
  "rate_limit",
  "session",
  "user",
  "verification",
] as const;

const requiredTables = [
  "content_events",
  "home_sections",
  "media_assets",
  "media_usage",
  "posts",
  "projects",
  "site_profile",
] as const;

const contentTables = [
  "site_profile",
  "home_sections",
  "projects",
  "posts",
  "media_assets",
  "media_usage",
  "content_events",
] as const;

const contentModels = [
  siteProfile,
  homeSections,
  projects,
  posts,
  mediaAssets,
  mediaUsage,
  contentEvents,
] as const;

describe("CMS database schema", () => {
  afterAll(async () => {
    await testPool.end();
  });

  test("creates the CMS schema without database-backed auth", async () => {
    const tables = await tableNames(testPool);

    expect(tables).toEqual(expect.arrayContaining([...requiredTables]));
    for (const table of removedAuthTables) expect(tables).not.toContain(table);

    for (const table of requiredTables) {
      expect(await primaryKeyType(testPool, table)).toBe("text");
    }

    for (const table of contentTables) {
      expect(await timestampType(testPool, table, "created_at")).toBe(
        "timestamp with time zone",
      );
    }

    expect(await timestampType(testPool, "projects", "updated_at")).toBe(
      "timestamp with time zone",
    );
    expect(await foreignKeyTargets(testPool, "content_events")).toEqual([]);
    expect(await foreignKeyTargets(testPool, "media_usage")).toContain(
      "media_assets.id",
    );
  }, 30_000);

  test("uses partial unique indexes for active project and post slugs", async () => {
    for (const indexName of [
      "projects_active_slug_unique",
      "posts_active_slug_unique",
    ]) {
      const definition = await indexDefinition(testPool, indexName);

      expect(definition).toContain("UNIQUE INDEX");
      expect(definition).toContain("WHERE (deleted_at IS NULL)");
    }
  });

  test("generates CUID2 primary keys for every CMS record", () => {
    for (const table of contentModels) {
      const id = getTableColumns(table).id.defaultFn?.();

      expect(typeof id === "string" && isCuid(id)).toBe(true);
    }
  });

  test("enforces singleton section types and active slugs", async () => {
    await withRollback(async (database) => {
      const firstSectionId = createId();
      const duplicateSectionId = createId();

      await database.query(
        `insert into home_sections
           (id, type, draft_content, draft_visible, draft_position)
         values ($1, 'intro', '{}'::jsonb, true, 0)`,
        [firstSectionId],
      );

      await expect(
        database.query(
          `insert into home_sections
             (id, type, draft_content, draft_visible, draft_position)
           values ($1, 'intro', '{}'::jsonb, true, 1)`,
          [duplicateSectionId],
        ),
      ).rejects.toThrow();
    });

    await withRollback(async (database) => {
      const firstProjectId = createId();
      const duplicateProjectId = createId();

      await database.query(
        `insert into projects (id, slug, draft_content)
         values ($1, 'same-active-slug', '{}'::jsonb)`,
        [firstProjectId],
      );

      await expect(
        database.query(
          `insert into projects (id, slug, draft_content)
           values ($1, 'same-active-slug', '{}'::jsonb)`,
          [duplicateProjectId],
        ),
      ).rejects.toThrow();
    });
  });
});
