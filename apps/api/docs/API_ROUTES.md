# API Routes

## `/v1/events`

Query events from the PostgreSQL database with various filters.

### Query Parameters

| Parameter | Type   | Description                              |
| --------- | ------ | ---------------------------------------- |
| signature | string | Filter by transaction signature          |
| slot      | number | Filter by Solana slot number             |
| eventName | string | Filter by event name                     |
| startTime | date   | Filter events after this timestamp       |
| endTime   | date   | Filter events before this timestamp      |
| minSlot   | number | Filter events after this slot            |
| maxSlot   | number | Filter events before this slot           |
| limit     | number | Maximum results to return (default: 100) |
| offset    | number | Number of results to skip (pagination)   |

### Examples

```bash
# Get event by signature
curl "http://localhost:3002/v1/events?signature=5x7..."

# Get events for a specific slot
curl "http://localhost:3002/v1/events?slot=123456789"

# Get events by event name with pagination
curl "http://localhost:3002/v1/events?eventName=Payment&limit=50&offset=0"

# Get events in time range
curl "http://localhost:3002/v1/events?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z"

# Search with multiple filters
curl "http://localhost:3002/v1/events?eventName=Transfer&minSlot=100000&maxSlot=200000&limit=20"
```

## `/v1/events/count`

Count events matching filters.

### Query Parameters

| Parameter | Type   | Description                        |
| --------- | ------ | ---------------------------------- |
| eventName | string | Filter by event name               |
| startTime | date   | Count events after this timestamp  |
| endTime   | date   | Count events before this timestamp |

### Examples

```bash
# Count all events
curl "http://localhost:3002/v1/events/count"

# Count events by name
curl "http://localhost:3002/v1/events/count?eventName=Payment"

# Count events in time range
curl "http://localhost:3002/v1/events/count?startTime=2024-01-01&endTime=2024-01-31"
```

## `/v1/events/names`

Get all unique event names in the database.

### Examples

```bash
curl "http://localhost:3002/v1/events/names"
```

Response:

```json
["Payment", "Transfer", "AccountCreated", "SubscriptionUpdated"]
```
