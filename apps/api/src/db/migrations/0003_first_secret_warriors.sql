CREATE SCHEMA "api";
--> statement-breakpoint
-- DROP TABLE "events" CASCADE;--> statement-breakpoint
ALTER TABLE "public"."signing_keys" SET SCHEMA "api";
--> statement-breakpoint
ALTER TABLE "public"."webhooks" SET SCHEMA "api";
