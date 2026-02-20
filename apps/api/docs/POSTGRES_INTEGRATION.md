# PostgreSQL + Drizzle ORM Integration

## Summary

Added read-only PostgreSQL database access using Drizzle ORM to the Tributary API with full TypeScript type support for Tributary events.

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
- `events.ts` - TypeScript type definitions for all Tributary events
- `queries.ts` - Query functions for events table (generic and typed)
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
id         | bytea       | PK
slot       | bigint      | Solana slot number
signature  | text        | Transaction signature
event_name | text        | Event type name (prefixed with tributary_)
data       | jsonb       | Event data (JSON)
timestamp  | timestamptz | Event timestamp
```

## Event Types

All Tributary events are prefixed with `tributary_`:

| Event Name                                     | Description                           |
| ---------------------------------------------- | ------------------------------------- |
| `tributary_payment_record`                     | Payment executed                      |
| `tributary_payment_policy_created`             | New payment policy created            |
| `tributary_payment_policy_deleted`             | Payment policy deleted                |
| `tributary_payment_policy_status_changed`      | Policy status changed (Active/Paused) |
| `tributary_payment_gateway_created`            | New gateway created                   |
| `tributary_payment_gateway_deleted`            | Gateway deleted                       |
| `tributary_gateway_fee_bps_changed`            | Gateway fee basis points changed      |
| `tributary_gateway_fee_recipient_changed`      | Gateway fee recipient changed         |
| `tributary_gateway_signer_changed`             | Gateway signer changed                |
| `tributary_referral_reward_distributed_record` | Referral rewards distributed          |
| `tributary_user_payment_created`               | User payment account created          |
| `tributary_program_config_created`             | Program initialized                   |

## Available Queries

### Generic Queries

- `getEventsBySignature(signature)` - Get event by transaction signature
- `getEventsBySlot(slot, options)` - Get events by Solana slot
- `getEventsByName(eventName, options)` - Get events by event type
- `getEventsByTimeRange(startTime, endTime)` - Get events in time range
- `searchEvents(filters, options)` - Search with multiple filters
- `getEventCount(filters)` - Count events matching filters
- `getUniqueEventNames()` - Get all unique event names
- `getTributaryEventNames()` - Get only Tributary event names

### Typed Queries

- `getTypedEvents(eventName, options)` - Get events with typed data
- `getPaymentRecords(options)` - Get payment records with filters
- `getPaymentStats(options)` - Get aggregated payment statistics
- `getPaymentPolicyCreatedEvents(options)` - Get policy created events
- `getPaymentPolicyDeletedEvents(options)` - Get policy deleted events
- `getPaymentPolicyStatusChangedEvents(options)` - Get status change events
- `getPaymentGatewayCreatedEvents(options)` - Get gateway created events
- `getPaymentGatewayDeletedEvents(options)` - Get gateway deleted events
- `getGatewayFeeBpsChangedEvents(options)` - Get fee BPS change events
- `getGatewayFeeRecipientChangedEvents(options)` - Get fee recipient change events
- `getGatewaySignerChangedEvents(options)` - Get signer change events
- `getReferralRewardDistributedEvents(options)` - Get referral reward events
- `getUserPaymentCreatedEvents(options)` - Get user payment created events
- `getProgramConfigCreatedEvents(options)` - Get program config events

## API Endpoints

See [API_ROUTES.md](./API_ROUTES.md) for full documentation.

### Key Endpoints

- `GET /v1/events` - Query events with filters
- `GET /v1/events/count` - Count events
- `GET /v1/events/names` - Get all event names
- `GET /v1/events/names/tributary` - Get Tributary event names
- `GET /v1/events/payments` - Get payment records
- `GET /v1/events/payments/stats` - Get payment statistics
- `GET /v1/events/policies/created` - Get policy created events
- `GET /v1/events/gateways/created` - Get gateway created events
- `GET /v1/events/typed/:eventName` - Get typed events by name

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
   curl "http://localhost:3002/v1/events/names/tributary"
   curl "http://localhost:3002/v1/events/payments?limit=10"
   ```

## Important Notes

- Database is **read-only** - no migrations are run
- Schema is defined in `src/db/schema.ts` but managed externally
- Event types are derived from the Tributary IDL
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
  getPaymentRecords,
  getPaymentStats,
} from "./db/queries";

// Get event by signature
const event = await getEventsBySignature("5x7...");

// Search with filters
const events = await searchEvents(
  {
    eventName: "tributary_payment_record",
    minSlot: 100000,
    maxSlot: 200000,
  },
  { limit: 20 }
);

// Get typed payment records
const payments = await getPaymentRecords({
  gateway: "GatewayPubkey...",
  limit: 100,
});

// Get payment statistics
const stats = await getPaymentStats({
  gateway: "GatewayPubkey...",
  startTime: new Date("2024-01-01"),
  endTime: new Date("2024-12-31"),
});
// Returns: { totalAmount: 10000000000, count: 1500 }
```
