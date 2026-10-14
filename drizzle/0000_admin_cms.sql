CREATE TYPE "public"."content_event_type" AS ENUM('create', 'update', 'publish', 'unpublish', 'trash', 'restore', 'permanent_delete');--> statement-breakpoint
CREATE TYPE "public"."content_snapshot" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('site_profile', 'home_section', 'project', 'post');--> statement-breakpoint
CREATE TYPE "public"."home_section_type" AS ENUM('intro', 'now', 'built', 'commits', 'frames', 'reach', 'loop', 'say');--> statement-breakpoint
CREATE TYPE "public"."content_lifecycle_status" AS ENUM('draft', 'published', 'unpublished');--> statement-breakpoint
CREATE TYPE "public"."media_resource_type" AS ENUM('image', 'video', 'raw');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"content_type" "content_type" NOT NULL,
	"content_id" text NOT NULL,
	"event_type" "content_event_type" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "home_section_type" NOT NULL,
	"draft_content" jsonb NOT NULL,
	"published_content" jsonb,
	"draft_visible" boolean DEFAULT true NOT NULL,
	"published_visible" boolean DEFAULT false NOT NULL,
	"draft_position" integer NOT NULL,
	"published_position" integer,
	"first_published_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"resource_type" "media_resource_type" NOT NULL,
	"secure_url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" bigint NOT NULL,
	"format" text NOT NULL,
	"alt_text" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"media_asset_id" text NOT NULL,
	"content_type" "content_type" NOT NULL,
	"content_id" text NOT NULL,
	"snapshot" "content_snapshot" NOT NULL,
	"field" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"draft_content" jsonb NOT NULL,
	"published_content" jsonb,
	"status" "content_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"first_published_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"draft_content" jsonb NOT NULL,
	"published_content" jsonb,
	"status" "content_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"featured_order" integer,
	"first_published_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"singleton_key" text DEFAULT 'site' NOT NULL,
	"draft_content" jsonb NOT NULL,
	"published_content" jsonb,
	"first_published_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_profile_singleton_key_check" CHECK ("site_profile"."singleton_key" = 'site')
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_events" ADD CONSTRAINT "content_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_usage" ADD CONSTRAINT "media_usage_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "content_events_content_idx" ON "content_events" USING btree ("content_type","content_id","created_at");--> statement-breakpoint
CREATE INDEX "content_events_actor_idx" ON "content_events" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "home_sections_type_unique" ON "home_sections" USING btree ("type");--> statement-breakpoint
CREATE INDEX "home_sections_draft_position_idx" ON "home_sections" USING btree ("draft_position");--> statement-breakpoint
CREATE INDEX "home_sections_published_position_idx" ON "home_sections" USING btree ("published_position");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_public_id_unique" ON "media_assets" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_usage_reference_unique" ON "media_usage" USING btree ("media_asset_id","content_type","content_id","snapshot","field");--> statement-breakpoint
CREATE INDEX "media_usage_content_idx" ON "media_usage" USING btree ("content_type","content_id","snapshot");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_active_slug_unique" ON "posts" USING btree ("slug") WHERE "posts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_active_slug_unique" ON "projects" USING btree ("slug") WHERE "projects"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "projects_public_order_idx" ON "projects" USING btree ("status","display_order");--> statement-breakpoint
CREATE INDEX "projects_featured_order_idx" ON "projects" USING btree ("featured","featured_order");--> statement-breakpoint
CREATE UNIQUE INDEX "site_profile_singleton_unique" ON "site_profile" USING btree ("singleton_key");