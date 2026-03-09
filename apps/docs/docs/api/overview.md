# API Overview

The Tributary API provides a RESTful interface for querying subscription status, payment events, and managing webhooks, along with real-time WebSocket notifications for payment events.

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
- **Webhook Management** - Register and manage webhooks for notifications
- **Subscription Tracking** - Check subscription status by tracking ID
- **One-Time Payments** - Track one-time payments alongside subscriptions

## Authentication

The API is currently open for read operations. Write operations (webhooks) require gateway authentication.

## Rate Limits

- Standard rate limits apply to prevent abuse
- WebSocket connections limited per tracking ID
- Webhooks retry up to 3 times with exponential backoff

## Base URL

| Environment | Base URL                          |
| ----------- | --------------------------------- |
| Production  | `https://api.tributary.so`        |
| Devnet      | `https://devnet.api.tributary.so` |

## SDK Integration

The API is fully integrated with the Tributary SDK:

```typescript
import { Tributary } from "@tributary-so/sdk";

const tributary = new Tributary({
  apiUrl: "https://api.tributary.so",
});

// Get subscription status
const subscription = await tributary.getSubscription({
  trackingId: "my-subscription",
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

## Data Flow

```
┌─────────────┐      ┌───────────┐      ┌─────────┐      ┌──────────┐
│  On-chain   │─────▶│ Soltrace  │─────▶│  Kafka  │─────▶│   API    │
│   Payment   │      │  Indexer  │      │  Queue  │      │ Consumer │
└─────────────┘      └───────────┘      └─────────┘      └────┬─────┘
                                                             │
                                                             │
                                               ┌─────────────┴─────────────┐
                                               │                           │
                                               ▼                           ▼
                                          ┌─────────┐                ┌──────────┐
                                          │   REST  │                │WebSocket │
                                          │   API   │                │ Clients  │
                                          └─────────┘                └──────────┘
```

## Next Steps

- [REST API Reference](./rest-api.md) - Complete endpoint documentation
- [WebSocket API](./websocket.md) - Real-time notifications
- [Examples](./examples.md) - Code examples and use cases
