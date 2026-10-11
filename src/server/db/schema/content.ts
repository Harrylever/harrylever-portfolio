import type { HomeSectionContent } from "@/domain/content/home";
import type { MediaAssetInput } from "@/domain/content/media";
import type { PostContent } from "@/domain/content/post";
import type { ProjectContent } from "@/domain/content/project";
import type { SiteProfileContent } from "@/domain/content/site-profile";

import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { homeSectionTypes } from "@/domain/content/home";
import { createId } from "@/server/db/id";
import { user } from "@/server/db/schema/auth";

const timestampColumn = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true });

export const lifecycleStatusEnum = pgEnum("content_lifecycle_status", [
  "draft",
  "published",
  "unpublished",
]);

export const homeSectionTypeEnum = pgEnum(
  "home_section_type",
  homeSectionTypes,
);

export const mediaResourceTypeEnum = pgEnum("media_resource_type", [
  "image",
  "video",
  "raw",
] as const satisfies readonly MediaAssetInput["resourceType"][]);

export const contentTypeEnum = pgEnum("content_type", [
  "site_profile",
  "home_section",
  "project",
  "post",
]);

export const contentSnapshotEnum = pgEnum("content_snapshot", [
  "draft",
  "published",
]);

export const contentEventTypeEnum = pgEnum("content_event_type", [
  "create",
  "update",
  "publish",
  "unpublish",
  "trash",
  "restore",
  "permanent_delete",
]);

export const siteProfile = pgTable(
  "site_profile",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    singletonKey: text("singleton_key").default("site").notNull(),
    draftContent: jsonb("draft_content").$type<SiteProfileContent>().notNull(),
    publishedContent: jsonb("published_content").$type<SiteProfileContent>(),
    firstPublishedAt: timestampColumn("first_published_at"),
    publishedAt: timestampColumn("published_at"),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    updatedAt: timestampColumn("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("site_profile_singleton_unique").on(table.singletonKey),
    check(
      "site_profile_singleton_key_check",
      sql`${table.singletonKey} = 'site'`,
    ),
  ],
);

export const homeSections = pgTable(
  "home_sections",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    type: homeSectionTypeEnum("type").notNull(),
    draftContent: jsonb("draft_content").$type<HomeSectionContent>().notNull(),
    publishedContent: jsonb("published_content").$type<HomeSectionContent>(),
    draftVisible: boolean("draft_visible").default(true).notNull(),
    publishedVisible: boolean("published_visible").default(false).notNull(),
    draftPosition: integer("draft_position").notNull(),
    publishedPosition: integer("published_position"),
    firstPublishedAt: timestampColumn("first_published_at"),
    publishedAt: timestampColumn("published_at"),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    updatedAt: timestampColumn("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("home_sections_type_unique").on(table.type),
    index("home_sections_draft_position_idx").on(table.draftPosition),
    index("home_sections_published_position_idx").on(table.publishedPosition),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    slug: text("slug").notNull(),
    draftContent: jsonb("draft_content").$type<ProjectContent>().notNull(),
    publishedContent: jsonb("published_content").$type<ProjectContent>(),
    status: lifecycleStatusEnum("status").default("draft").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    featured: boolean("featured").default(false).notNull(),
    featuredOrder: integer("featured_order"),
    firstPublishedAt: timestampColumn("first_published_at"),
    publishedAt: timestampColumn("published_at"),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    updatedAt: timestampColumn("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestampColumn("deleted_at"),
  },
  (table) => [
    uniqueIndex("projects_active_slug_unique")
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    index("projects_public_order_idx").on(table.status, table.displayOrder),
    index("projects_featured_order_idx").on(
      table.featured,
      table.featuredOrder,
    ),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    slug: text("slug").notNull(),
    draftContent: jsonb("draft_content").$type<PostContent>().notNull(),
    publishedContent: jsonb("published_content").$type<PostContent>(),
    status: lifecycleStatusEnum("status").default("draft").notNull(),
    firstPublishedAt: timestampColumn("first_published_at"),
    publishedAt: timestampColumn("published_at"),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    updatedAt: timestampColumn("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestampColumn("deleted_at"),
  },
  (table) => [
    uniqueIndex("posts_active_slug_unique")
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    index("posts_published_at_idx").on(table.status, table.publishedAt),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    publicId: text("public_id").notNull(),
    resourceType: mediaResourceTypeEnum("resource_type").notNull(),
    secureUrl: text("secure_url").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bytes: bigint("bytes", { mode: "number" }).notNull(),
    format: text("format").notNull(),
    altText: text("alt_text").notNull(),
    caption: text("caption"),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    updatedAt: timestampColumn("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("media_assets_public_id_unique").on(table.publicId)],
);

export const mediaUsage = pgTable(
  "media_usage",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    mediaAssetId: text("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    contentType: contentTypeEnum("content_type").notNull(),
    contentId: text("content_id").notNull(),
    snapshot: contentSnapshotEnum("snapshot").notNull(),
    field: text("field").notNull(),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("media_usage_reference_unique").on(
      table.mediaAssetId,
      table.contentType,
      table.contentId,
      table.snapshot,
      table.field,
    ),
    index("media_usage_content_idx").on(
      table.contentType,
      table.contentId,
      table.snapshot,
    ),
  ],
);

export const contentEvents = pgTable(
  "content_events",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    contentType: contentTypeEnum("content_type").notNull(),
    contentId: text("content_id").notNull(),
    eventType: contentEventTypeEnum("event_type").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("content_events_content_idx").on(
      table.contentType,
      table.contentId,
      table.createdAt,
    ),
    index("content_events_actor_idx").on(table.actorId, table.createdAt),
  ],
);
