# API Overview

The Tributary API provides RESTful endpoints for querying subscriptions, payment events, and managing webhooks, plus real-time WebSocket notifications.

**Base URL:** `https://api.tributary.so`

## Quick Start

```bash
# Health check
curl https://api.tributary.so/v1/health

# Get subscription status
curl "https://api.tributary.so/v1/subscriptions?trackingId=my-subscription"

# Get payment events
curl "https://api.tributary.so/v1/events?trackingId=my-subscription"
```

## Key Features

- **RESTful API** - Standard HTTP endpoints with JSON responses
- **WebSocket Support** - Real-time payment notifications via Socket.IO
- **Event Querying** - Comprehensive database queries with filtering
- **Webhook Management** - Register webhooks for payment notifications
- **Subscription Tracking** - Check status by tracking ID, user, or gateway
- **One-Time Payments** - Track one-time payments alongside subscriptions

## Endpoints Overview

| Endpoint                      | Description                  |
| ----------------------------- | ---------------------------- |
| `GET /v1/health`              | Health check                 |
| `GET /v1/subscriptions`       | Query subscription status    |
| `GET /v1/onetime/:trackingId` | Get one-time payment details |
| `GET /v1/events`              | Query payment events         |
| `GET /v1/events/payments`     | Get payment records          |
| `POST /v1/webhooks`           | Create webhook               |
| `GET /v1/webhooks`            | List webhooks                |
| `WS /ws/v1`                   | WebSocket endpoint           |

## Authentication

Read operations are open. Write operations (webhooks) require gateway authentication.

## Rate Limits

- Standard rate limits apply
- WebSocket connections limited per tracking ID
- Webhooks retry up to 3 times with exponential backoff

## Environments

| Environment | Base URL                          |
| ----------- | --------------------------------- |
| Production  | `https://api.tributary.so`        |
| Devnet      | `https://devnet.api.tributary.so` |

## SDK Integration

```typescript
import { PaymentsClient } from "@tributary-so/payments";
import { Tributary } from "@tributary-so/sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const tributary = new Tributary(connection, wallet);
const stripe = new PaymentsClient(connection, tributary);

// Check subscription status
const status = await stripe.subscriptions.checkStatus({
  trackingId: "my-subscription",
  userPublicKey: "USER_PUBLIC_KEY",
});
```

## WebSocket Connection

```typescript
import { io } from "socket.io-client";

const socket = io("https://api.tributary.so", {
  path: "/ws/v1",
  transports: ["websocket"],
});

// Subscribe to payment notifications
socket.emit("subscribe", { trackingId: "my-subscription" });

// Listen for payments
socket.on("payment", (message) => {
  console.log("Payment received:", message.data);
});
```

## Webhook Integration

```bash
# Create webhook
curl -X POST https://api.tributary.so/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "gateway_pubkey": "YOUR_GATEWAY",
    "endpoint_url": "https://yourserver.com/webhook",
    "active": true
  }'
```

Webhooks are delivered with:

- Max 3 retries with exponential backoff (1s, 2s, 3s)
- 10 second timeout per request
- `Content-Type: application/json` header

## Data Flow

```
On-chain Payment → Soltrace Indexer → Kafka Queue → API Consumer
                                                   ↓
                                          ┌────────┴────────┐
                                          ↓                 ↓
                                     REST API          WebSocket
                                                       Clients
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": 1699876543210
}
```

Error responses:

```json
{
  "success": false,
  "error": "Detailed error message",
  "timestamp": 1699876543210
}
```

## Next Steps

- [REST API Reference](./rest-api.md) - Complete endpoint documentation
- [WebSocket API](./websocket.md) - Real-time notifications
- [Examples](./examples.md) - Code examples and use cases
