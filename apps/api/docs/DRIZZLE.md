# PostgreSQL Integration with Drizzle ORM

This project includes read-only access to an existing PostgreSQL database using Drizzle ORM.

## Setup

1. **Install dependencies** (already done):

   ```bash
   pnpm add drizzle-orm postgres
   pnpm add -D drizzle-kit dotenv
   ```

2. **Configure environment variables**:

   Copy `.env.example` to `.env` and add your database connection string:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```bash
   DATABASE_URL=postgresql://readonly:password@localhost:5432/tributary?sslmode=require
   ```

3. **Verify connection**:

   ```bash
   pnpm run dev
   ```

   The API will start on port 3002 and you can query events:

   ```bash
   curl "http://localhost:3002/v1/events/names"
   ```

## Database Schema

The existing `events` table structure:

| Column     | Type                     | Nullable | Description           |
| ---------- | ------------------------ | -------- | --------------------- |
| id         | bytea                    | NO       | Primary key (binary)  |
| slot       | bigint                   | NO       | Solana slot number    |
| signature  | text                     | NO       | Transaction signature |
| event_name | text                     | NO       | Event type name       |
| data       | jsonb                    | NO       | Event data (JSON)     |
| timestamp  | timestamp with time zone | NO       | Event timestamp       |

## Available Queries

```typescript
import {
  getEventsBySignature,
  getEventsBySlot,
  getEventsByName,
  getEventsByTimeRange,
  searchEvents,
  getEventCount,
  getUniqueEventNames,
} from "./db/queries";

// Get event by signature
const event = await getEventsBySignature("5x7...");

// Get events by slot
const events = await getEventsBySlot(123456789, { limit: 50 });

// Get events by event name
const payments = await getEventsByName("Payment");

// Get events in time range
const events = await getEventsByTimeRange(
  new Date("2024-01-01"),
  new Date("2024-01-31")
);

// Search with multiple filters
const results = await searchEvents(
  {
    eventName: "Payment",
    minSlot: 100000,
    maxSlot: 200000,
  },
  { limit: 20 }
);

// Count events
const count = await getEventCount({ eventName: "Payment" });

// Get all unique event names
const names = await getUniqueEventNames();
```

## API Routes

See [API_ROUTES.md](./API_ROUTES.md) for detailed API documentation.

### Quick Examples

```bash
# Get events
curl "http://localhost:3002/v1/events?eventName=Payment&limit=10"

# Count events
curl "http://localhost:3002/v1/events/count?eventName=Transfer"

# Get event names
curl "http://localhost:3002/v1/events/names"
```

## Database Configuration

### Drizzle Config

`drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";
import "dotenv/config"; // Loads .env file

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Environment Loading

The following files import `"dotenv/config"` to ensure `.env` is loaded:

- `drizzle.config.ts` - For Drizzle CLI commands
- `src/index.ts` - For the main API application
- `src/test-db.ts` - For the database test script

This ensures `DATABASE_URL` from `.env` is available before any database operations.

### Schema Definition

`src/db/schema.ts` defines the existing database structure. Since this is a read-only connection to an externally managed database, no migrations are run.

## Security Notes

- Database connection should use **read-only** credentials
- Use SSL for production connections (`sslmode=require`)
- Never commit database credentials to version control
- Use environment variables for sensitive data

## Troubleshooting

### Connection Errors

If you see "connection refused" or "authentication failed":

- Verify `DATABASE_URL` is set correctly
- Check if database server is accessible
- Verify credentials have read permissions
- Check firewall/network settings

### Type Errors

If you see TypeScript errors:

- Run `pnpm run build` to check compilation
- Only the pre-existing `skill.ts` error should appear
- Database code should compile without errors

## Files

- `src/db/schema.ts` - Database schema definition
- `src/db/index.ts` - Database client singleton
- `src/db/queries.ts` - Query functions
- `src/routes/events.ts` - API routes for events
- `src/test-db.ts` - Database connection test script
- `src/index.ts` - Main application entry with dotenv import
- `drizzle.config.ts` - Drizzle configuration with dotenv import
- `DATABASE.md` - Database documentation
- `API_ROUTES.md` - API route documentation
