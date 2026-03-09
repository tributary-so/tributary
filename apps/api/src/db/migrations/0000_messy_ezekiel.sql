-- CREATE TABLE "events" (
-- 	"id" "bytea" PRIMARY KEY NOT NULL,
-- 	"slot" bigint NOT NULL,
-- 	"signature" text NOT NULL,
-- 	"event_name" text NOT NULL,
-- 	"data" jsonb NOT NULL,
-- 	"timestamp" timestamp with time zone NOT NULL
-- );
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhooks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"gateway_pubkey" text NOT NULL,
	"endpoint_url" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
