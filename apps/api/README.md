# @tributary-so/api

Modular Express API for Tributary subscription and payment services.

## Features

- **Modular Architecture**: Clean separation of routes, middleware, services, and types
- **Easy to Split**: Designed to easily split individual API endpoints into separate microservices
- **RESTful Design**: Standard REST API with `/api/v1` prefix
- **WebSocket Support**: Real-time payment notifications via WebSocket at `/ws/v1`
- **Subscription Status**: Check subscription status by tracking ID using the PaymentTracker
- **Health Monitoring**: Built-in health check endpoint
- **Error Handling**: Centralized error handling and logging
- **Type Safety**: Full TypeScript support with comprehensive types
- **Scalable**: Redis-backed WebSocket adapter for multi-server deployments

## Project Structure

```
api/
├── src/
│   ├── routes/          # Individual route modules (easy to split into separate services)
│   │   ├── health.ts   # Health check endpoint
│   │   ├── skill.ts    # Lando skill markdown generation
│   │   └── subscription.ts  # Subscription status checking
│   ├── middleware/      # Shared middleware
│   │   ├── errorHandler.ts
│   │   └── requestLogger.ts
│   ├── services/       # Business logic services
│   │   ├── solana.ts      # Solana connection management
│   │   ├── subscription.ts # Subscription status tracking
│   │   ├── websocket.ts   # WebSocket connection management
│   │   └── paymentNotifications.ts # Payment notification helpers
│   ├── types/          # TypeScript types
│   └── index.ts        # Main application entry point
├── package.json
├── tsconfig.json
└── Dockerfile
```

## API Endpoints

### Health

- `GET /api/v1/health` - Health check endpoint

### Skill

- `GET /api/v1/skill/:encoded` - Generate Lando skill markdown from encoded subscription data

### Subscription

- `GET /api/v1/subscription/status/:trackingId` - Check subscription status
  - Query params:
    - `userPublicKey` (optional): User's public key for user-based lookup
    - `gatewayPublicKey` (optional): Gateway's public key for gateway-based lookup
    - `tokenMint` (optional): Token mint address
- `GET /api/v1/subscription/:trackingId` - Get full subscription details
  - Query params:
    - `userPublicKey` (optional): User's public key for user-based lookup
    - `gatewayPublicKey` (optional): Gateway's public key for gateway-based lookup
    - `tokenMint` (optional): Token mint address

### One-Time Payments

- `GET /api/v1/onetime/:trackingId` - Get one-time payment details by tracking ID
  - Query params:
    - `recipient` (optional): Filter by recipient public key
    - `limit` (optional): Maximum number of results (default: 100)
    - `offset` (optional): Pagination offset (default: 0)

### WebSocket

- **Endpoint**: `ws://localhost:3002/ws/v1` (WebSocket connection)
- **Purpose**: Real-time payment notifications for subscribed tracking IDs

#### Connection

Connect via WebSocket client to `/ws/v1`. Supports multiple concurrent connections.

#### Client-to-Server Messages

**Subscribe to Payment Notifications:**

```json
{
  "event": "subscribe",
  "data": {
    "trackingId": "your-tracking-id-here"
  }
}
```

**Unsubscribe from Notifications:**

```json
{
  "event": "unsubscribe",
  "data": {
    "trackingId": "your-tracking-id-here"
  }
}
```

#### Server-to-Client Messages

**Payment Notification:**

```json
{
  "event": "payment",
  "data": {
    "type": "payment_notification",
    "data": {
      "trackingId": "your-tracking-id",
      "policyId": "policy-public-key",
      "amount": 1000000,
      "tokenMint": "token-mint-address",
      "recipient": "recipient-public-key",
      "timestamp": 1234567890,
      "status": "executed",
      "signature": "transaction-signature"
    },
    "timestamp": 1234567890
  }
}
```

**Acknowledgment:**

```json
{
  "event": "ack",
  "data": {
    "type": "ack",
    "data": "Subscribed to trackingId: your-tracking-id",
    "timestamp": 1234567890
  }
}
```

**Error:**

```json
{
  "event": "error",
  "data": {
    "type": "error",
    "data": {
      "code": "INVALID_TRACKING_ID",
      "message": "Tracking ID is required and must be a string"
    },
    "timestamp": 1234567890
  }
}
```

#### Example Usage (JavaScript)

```javascript
const io = require("socket.io-client");

const socket = io("http://localhost:3002", {
  path: "/ws/v1",
  transports: ["websocket"],
});

// Subscribe to payment notifications
socket.emit("subscribe", { trackingId: "your-tracking-id" });

// Listen for payment events
socket.on("payment", (message) => {
  console.log("Payment received:", message.data);
});

// Listen for acknowledgments
socket.on("ack", (message) => {
  console.log("Ack:", message.data);
});

// Listen for errors
socket.on("error", (message) => {
  console.error("Error:", message.data);
});

// Unsubscribe
socket.emit("unsubscribe", { trackingId: "your-tracking-id" });
```

## Development

### Install Dependencies

```bash
cd api
pnpm install
```

### Development Mode

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Start Server

```bash
pnpm start
```

## Environment Variables

- `PORT` - Server port (default: 3002)
- `SOLANA_RPC` - Solana RPC URL (default: <https://api.mainnet-beta.solana.com>)
- `REDIS_URL` - Redis URL for WebSocket adapter (optional, enables multi-server scaling)

## Microservice Splitting

The modular structure makes it easy to split individual APIs into separate projects:

1. Each route module (`src/routes/*.ts`) is self-contained
2. Services and types can be extracted into shared packages
3. Middleware can be reused across services
4. Each endpoint can be deployed independently

Example: To split `/api/v1/subscription` into a separate service:

1. Copy `src/routes/subscription.ts` to new project
2. Copy required services (`src/services/subscription.ts`, `src/services/solana.ts`)
3. Copy types (`src/types/index.ts`)
4. Copy middleware (`src/middleware/*`)
5. Adjust imports and deploy

## License

MIT
