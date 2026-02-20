# PostgreSQL + Drizzle ORM Integration

## Summary

Added read-only PostgreSQL database access using Drizzle ORM to the Tributary API.

## What Was Added

### Dependencies

- `drizzle-orm` - ORM library
- `postgres` - PostgreSQL driver
- `drizzle-kit` - CLI tool for schema management (dev)
- `dotenv` - Environment variable loader (dev)

### Core Files

**Database Layer** (`src/db/`):

- `schema.ts` - Schema definition matching existing database
- `index.ts` - Database client singleton (connection pooling)
- `queries.ts` - Query functions for events table
- `migrations/README.md` - Note about read-only access

**API Routes**:

- `routes/events.ts` - REST API endpoints for querying events
- Updated `routes/index.ts` - Registered events routes
- Updated `index.ts` - Added endpoint documentation and dotenv import

**Configuration**:

- `drizzle.config.ts` - Drizzle ORM configuration with dotenv import
- `.env.example` - Environment variable template

**Documentation**:

- `DATABASE.md` - Database setup and configuration guide
- `API_ROUTES.md` - API endpoint documentation
- `DRIZZLE.md` - Complete setup guide

**Testing**:

- `src/test-db.ts` - Database connection test script with dotenv import

### Updated Files

- `package.json` - Added dependencies and scripts
- `src/index.ts` - Updated root endpoint documentation

## Database Schema

Events table (read-only, externally managed):

```
id         | bytea    | PK
slot       | bigint    | Solana slot number
signature  | text      | Transaction signature
event_name | text      | Event type name
data       | jsonb     | Event data (JSON)
timestamp  | timestamptz | Event timestamp
```

## Available Queries

- `getEventsBySignature(signature)` - Get event by transaction signature
- `getEventsBySlot(slot, options)` - Get events by Solana slot
- `getEventsByName(eventName, options)` - Get events by event type
- `getEventsByTimeRange(startTime, endTime)` - Get events in time range
- `searchEvents(filters, options)` - Search with multiple filters
- `getEventCount(filters)` - Count events matching filters
- `getUniqueEventNames()` - Get all unique event names

## API Endpoints

### GET `/v1/events`

Query events with filters and pagination.

Query params: `signature`, `slot`, `eventName`, `startTime`, `endTime`, `minSlot`, `maxSlot`, `limit`, `offset`

### GET `/v1/events/count`

Count events matching filters.

Query params: `eventName`, `startTime`, `endTime`

### GET `/v1/events/names`

Get all unique event names.

## Setup Instructions

1. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env and add DATABASE_URL
   ```

2. **Test connection**:

   ```bash
   pnpm run db:test
   ```

3. **Start server**:

   ```bash
   pnpm run dev
   ```

4. **Query events**:

   ```bash
   curl "http://localhost:3002/v1/events?eventName=Payment&limit=10"
   ```

## Important Notes

- Database is **read-only** - no migrations are run
- Schema is defined in `src/db/schema.ts` but managed externally
- Use read-only database credentials for security
- SSL required for production (`sslmode=require`)

## Scripts

```bash
# Development
pnpm run dev          # Start dev server
pnpm run build         # Build TypeScript
pnpm run db:test       # Test database connection

# Drizzle (schema management)
pnpm run db:generate   # Generate migrations (not used for read-only)
pnpm run db:push       # Push schema to DB (not used for read-only)
pnpm run db:studio     # Open Drizzle Studio (schema viewer)
```

## Example Usage

```typescript
import {
  getEventsBySignature,
  searchEvents,
  getEventCount,
} from "./db/queries";

// Get event by signature
const event = await getEventsBySignature("5x7...");

// Search with filters
const events = await searchEvents(
  {
    eventName: "Payment",
    minSlot: 100000,
    maxSlot: 200000,
  },
  { limit: 20 }
);

// Count events
const count = await getEventCount({ eventName: "Payment" });
```

## Pre-existing Issues

There is a TypeScript error in `src/routes/skill.ts:91` (line 91) that existed before this change and is unrelated to the database integration.
