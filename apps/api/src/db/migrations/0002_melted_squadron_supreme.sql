CREATE SCHEMA "pools";
--> statement-breakpoint
CREATE TABLE "pools"."pools" (
	"address" text NOT NULL,
	"venue" text NOT NULL,
	"mint_a" text NOT NULL,
	"mint_b" text NOT NULL,
	"symbol_a" text,
	"symbol_b" text,
	"tvl" numeric NOT NULL,
	"fee_rate" numeric,
	"stars" smallint DEFAULT 0 NOT NULL,
	"tier1" boolean DEFAULT false NOT NULL,
	"extras" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pools_venue_address_pk" PRIMARY KEY("venue","address")
);
--> statement-breakpoint
CREATE TABLE "pools"."tokens" (
	"mint" text PRIMARY KEY NOT NULL,
	"known" boolean DEFAULT false NOT NULL,
	"tier" text,
	"symbol" text,
	"name" text,
	"decimals" integer,
	"logo_uri" text,
	"refreshed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pools_symbol_a_idx" ON "pools"."pools" USING btree ("symbol_a");--> statement-breakpoint
CREATE INDEX "pools_symbol_b_idx" ON "pools"."pools" USING btree ("symbol_b");--> statement-breakpoint
CREATE INDEX "pools_mints_idx" ON "pools"."pools" USING btree ("mint_a","mint_b");--> statement-breakpoint
CREATE INDEX "pools_rank_idx" ON "pools"."pools" USING btree ("stars" DESC NULLS LAST,"tvl" DESC NULLS LAST);