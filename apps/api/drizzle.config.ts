import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: ["./src/db/schema.ts", "./src/db/schema-pools.ts"],
  out: "./src/db/migrations",
  dialect: "postgresql",
  // Only manage schemas apps/api owns. The `events` table (owned by the
  // indexer, schema `public`) is excluded here so db:push never tries to
  // reconcile or drop it. `events` is still queryable at runtime via the
  // definition in schema-events.ts.
  schemaFilter: ["api", "pools"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
