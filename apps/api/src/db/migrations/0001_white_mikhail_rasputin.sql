CREATE TABLE "signing_keys" (
	"kid" text PRIMARY KEY NOT NULL,
	"private_key" text NOT NULL,
	"public_jwk" jsonb NOT NULL,
	"algorithm" text NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"rotated_at" timestamp with time zone
);
