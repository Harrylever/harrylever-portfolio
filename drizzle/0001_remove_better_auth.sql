-- Replace Better Auth with environment-preset single-admin auth.
-- Drop the actor FK first: dropping "user" with CASCADE would otherwise remove
-- it implicitly and make an explicit DROP CONSTRAINT fail. Existing actor_id
-- values are kept as plain text history.
ALTER TABLE "content_events" DROP CONSTRAINT "content_events_actor_id_user_id_fk";--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "rate_limit" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "verification" CASCADE;--> statement-breakpoint
DROP TABLE "user" CASCADE;
