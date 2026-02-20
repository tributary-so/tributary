# Database Configuration

## PostgreSQL Connection (Read-Only)

The API connects to an existing PostgreSQL database in read-only mode for querying event data.

### Environment Variables

```bash
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

### Connection String Format

- **Protocol**: `postgresql://`
- **User**: Database username (read-only permissions recommended)
- **Password**: Database password
- **Host**: Database server hostname or IP
- **Port**: Database port (default: 5432)
- **Database**: Database name
- **SSL Mode**: `require` (recommended for production), `disable` (dev only)

### Example

```bash
# Local development
DATABASE_URL=postgresql://readonly:password@localhost:5432/tributary

# Production with SSL
DATABASE_URL=postgresql://readonly:password@db.example.com:5432/tributary?sslmode=require

# Cloud database (e.g., Supabase, Neon, Railway)
DATABASE_URL=postgresql://postgres.project-id.region.aws.neon.tech/tributary?sslmode=require
```

### Database Schema

The existing `events` table structure:

| Column     | Type                     | Nullable | Description           |
| ---------- | ------------------------ | -------- | --------------------- |
| id         | bytea                    | NO       | Primary key (binary)  |
| slot       | bigint                   | NO       | Solana slot number    |
| signature  | text                     | NO       | Transaction signature |
| event_name | text                     | NO       | Event type name       |
| data       | jsonb                    | NO       | Event data (JSON)     |
| timestamp  | timestamp with time zone | NO       | Event timestamp       |

### Available Queries

- `getEventsBySignature(signature)` - Get event by transaction signature
- `getEventsBySlot(slot, options)` - Get events by Solana slot
- `getEventsByName(eventName, options)` - Get events by event type
- `getEventsByTimeRange(startTime, endTime)` - Get events in time range
- `searchEvents(filters, options)` - Search with multiple filters
- `getEventCount(filters)` - Count events matching filters
- `getUniqueEventNames()` - Get all unique event names

All queries support pagination with `limit` and `offset` options.
