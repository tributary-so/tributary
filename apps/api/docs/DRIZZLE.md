# PostgreSQL Integration with Drizzle ORM

This project includes read-only access to an existing PostgreSQL database using Drizzle ORM with typed event data structures.

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
   curl "http://localhost:3002/v1/events/names/tributary"
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

## Event Types

All Tributary events are prefixed with `tributary_` and have typed data structures:

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

```typescript
import {
  getEventsBySignature,
  getEventsBySlot,
  getEventsByName,
  getEventsByTimeRange,
  searchEvents,
  getEventCount,
  getUniqueEventNames,
  getTributaryEventNames,
} from "./db/queries";

// Get event by signature
const event = await getEventsBySignature("5x7...");

// Get events by slot
const events = await getEventsBySlot(123456789, { limit: 50 });

// Get events by event name
const payments = await getEventsByName("tributary_payment_record");

// Get events in time range
const events = await getEventsByTimeRange(
  new Date("2024-01-01"),
  new Date("2024-01-31")
);

// Search with multiple filters
const results = await searchEvents(
  {
    eventName: "tributary_payment_record",
    minSlot: 100000,
    maxSlot: 200000,
  },
  { limit: 20 }
);

// Count events
const count = await getEventCount({ eventName: "tributary_payment_record" });

// Get all unique event names
const names = await getUniqueEventNames();

// Get only Tributary event names
const tributaryNames = await getTributaryEventNames();
```

### Typed Event Queries

```typescript
import {
  getTypedEvents,
  getPaymentRecords,
  getPaymentPolicyCreatedEvents,
  getPaymentStats,
  getGatewayFeeBpsChangedEvents,
  getReferralRewardDistributedEvents,
} from "./db/queries";

// Get typed events by name
const payments = await getTypedEvents("tributary_payment_record", {
  limit: 50,
});

// Get payment records with filters
const payments = await getPaymentRecords({
  gateway: "GatewayPubkey...",
  paymentPolicy: "PolicyPubkey...",
  limit: 100,
});

// Get payment statistics
const stats = await getPaymentStats({
  gateway: "GatewayPubkey...",
  startTime: new Date("2024-01-01"),
  endTime: new Date("2024-12-31"),
});
// Returns: { totalAmount: number; count: number }

// Get policy created events
const policies = await getPaymentPolicyCreatedEvents({
  gateway: "GatewayPubkey...",
  recipient: "RecipientPubkey...",
});

// Get gateway fee changes
const feeChanges = await getGatewayFeeBpsChangedEvents({
  gateway: "GatewayPubkey...",
});

// Get referral reward distributions
const rewards = await getReferralRewardDistributedEvents({
  gateway: "GatewayPubkey...",
});
```

## TypeScript Types

All event data types are defined in `src/db/events.ts`:

```typescript
import type {
  // Event data types
  TributaryPaymentRecord,
  TributaryPaymentPolicyCreated,
  TributaryPaymentGatewayCreated,
  TributaryGatewayFeeBpsChanged,
  // ... more event types

  // Supporting types
  PaymentStatus,
  PaymentFrequency,
  PolicyType,
  SubscriptionPolicy,
  MilestonePolicy,
  PayAsYouGoPolicy,

  // Utility types
  TributaryEventName,
  TributaryEventDataMap,
} from "./db/events";
```

### Key Types

#### PaymentStatus

```typescript
type PaymentStatus = "Active" | "Paused";
```

#### PaymentFrequency

```typescript
type PaymentFrequency =
  | { Daily: null }
  | { Weekly: null }
  | { Monthly: null }
  | { Quarterly: null }
  | { SemiAnnually: null }
  | { Annually: null }
  | { Custom: number };
```

#### PolicyType

```typescript
type PolicyType =
  | { Subscription: SubscriptionPolicy }
  | { Milestone: MilestonePolicy }
  | { PayAsYouGo: PayAsYouGoPolicy };

interface SubscriptionPolicy {
  amount: number;
  auto_renew: boolean;
  max_renewals: number | null;
  payment_frequency: PaymentFrequency;
  next_payment_due: number;
}
```

## API Routes

See [API_ROUTES.md](./API_ROUTES.md) for detailed API documentation.

### Quick Examples

```bash
# Get events
curl "http://localhost:3002/v1/events?eventName=tributary_payment_record&limit=10"

# Get payment records
curl "http://localhost:3002/v1/events/payments?gateway=GatewayPubkey..."

# Get payment statistics
curl "http://localhost:3002/v1/events/payments/stats?gateway=GatewayPubkey..."

# Get tributary event names
curl "http://localhost:3002/v1/events/names/tributary"

# Get policy created events
curl "http://localhost:3002/v1/events/policies/created?recipient=RecipientPubkey..."
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
- Database code should compile without errors

## Files

- `src/db/schema.ts` - Database schema definition
- `src/db/index.ts` - Database client singleton
- `src/db/events.ts` - Event type definitions
- `src/db/queries.ts` - Query functions (generic and typed)
- `src/routes/events.ts` - API routes for events
- `src/test-db.ts` - Database connection test script
- `src/index.ts` - Main application entry with dotenv import
- `drizzle.config.ts` - Drizzle configuration with dotenv import
- `DATABASE.md` - Database documentation
- `API_ROUTES.md` - API route documentation
