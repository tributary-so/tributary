# @tributary-so/api

Modular Express API for Tributary subscription and payment services. Provides RESTful endpoints for subscription management, event querying, webhook handling, and real-time WebSocket notifications for payment events.

## Key Features

- **Modular Architecture**: Clean separation of routes, middleware, services, and types designed for easy microservice splitting
- **RESTful API Design**: Standard REST endpoints with `/api/v1` prefix for consistent versioning
- **WebSocket Support**: Real-time payment notifications via Socket.IO at `/ws/v1`
- **Kafka Integration**: Consumes on-chain payment events and pushes real-time notifications to subscribed clients
- **Webhook Management**: Register and manage webhooks for payment event notifications
- **Event Querying**: Comprehensive event database queries with filtering and pagination
- **Subscription Status Tracking**: Check subscription status by tracking ID using PaymentTracker
- **Health Monitoring**: Built-in health check endpoint
- **Error Handling**: Centralized error handling with custom ApiError class
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Scalability**: Redis-backed WebSocket adapter for multi-server deployments

## Tech Stack

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 20+
- **Framework**: Express 4.18+
- **Database**: PostgreSQL with Drizzle ORM
- **WebSocket**: Socket.IO 4.8+ with Redis adapter for horizontal scaling
- **Message Queue**: Kafka (optional) for event streaming
- **Caching**: Redis 5+ (optional, for WebSocket scaling)
- **Blockchain**: Solana Web3.js 1.95+ with SPL Token library
- **Package Manager**: pnpm
- **Testing**: Jest with ts-jest
- **Build Tool**: TypeScript Compiler (tsc)
- **Linting**: (Inherited from workspace configuration)

## Prerequisites

- Node.js 20 or higher
- pnpm (recommended) or npm
- PostgreSQL 15+ or Docker for database
- Redis 5+ (optional, for WebSocket scaling)
- Kafka 2.8+ (optional, for event streaming)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/tributary.git
cd tributary/apps/api
```

### 2. Install Dependencies

From the repository root:

```bash
pnpm install
```

This installs dependencies for all workspace packages including `@tributary-so/sdk` and `@tributary-so/payments`.

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the following variables:

| Variable        | Description                     | Example                                           | Required           |
| --------------- | ------------------------------- | ------------------------------------------------- | ------------------ |
| `DATABASE_URL`  | PostgreSQL connection string    | `postgresql://user:pass@localhost:5432/tributary` | Yes                |
| `PORT`          | Server port                     | `3002`                                            | No (default: 3002) |
| `SOLANA_RPC`    | Solana RPC URL                  | `https://api.mainnet-beta.solana.com`             | No                 |
| `REDIS_URL`     | Redis URL for WebSocket adapter | `redis://localhost:6379/0`                        | No                 |
| `KAFKA_BROKERS` | Comma-separated Kafka brokers   | `localhost:9092,localhost:9093`                   | No                 |

### 4. Database Setup

Start PostgreSQL (if using Docker):

```bash
docker run --name tributary-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tributary \
  -p 5432:5432 \
  -d postgres:16
```

Run database migrations:

```bash
pnpm db:push
```

This pushes the Drizzle schema to PostgreSQL. For production, use migrations:

```bash
pnpm db:generate  # Generate migration from schema
pnpm db:push    # Apply to database
```

### 5. Test Database Connection

Verify database setup:

```bash
pnpm db:test
```

### 6. Start Development Server

```bash
pnpm dev
```

Or build and run:

```bash
pnpm build
pnpm start
```

The API will start at `http://localhost:3002` with:

- Health check: `http://localhost:3002/v1/health`
- WebSocket endpoint: `ws://localhost:3002/ws/v1`
- Drizzle Studio (optional): Run `pnpm db:studio` for database GUI

## Architecture

### Directory Structure

```
api/
├── src/
│   ├── routes/                  # Express route modules
│   │   ├── health.ts           # Health check endpoint
│   │   ├── skill.ts            # Lando skill markdown generation
│   │   ├── subscription.ts     # Subscription status queries
│   │   ├── onetime.ts         # One-time payment queries
│   │   ├── events.ts          # Event database queries
│   │   ├── webhooks.ts        # Webhook CRUD operations
│   │   └── index.ts          # Route aggregation
│   ├── middleware/             # Express middleware
│   │   ├── errorHandler.ts    # Centralized error handling
│   │   ├── requestLogger.ts   # Request logging with timing
│   │   └── index.ts          # Middleware exports
│   ├── services/               # Business logic services
│   │   ├── solana.ts         # Solana connection and token operations
│   │   ├── subscription.ts    # Subscription status via PaymentTracker
│   │   ├── onetime.ts        # One-time payment queries
│   │   ├── webhookForwarder.ts # Webhook delivery with retries
│   │   ├── kafkaConsumer.ts  # Kafka payment event consumer
│   │   ├── websocket.ts      # WebSocket connection management
│   │   └── paymentNotifications.ts # Payment notification helpers
│   ├── db/                    # Database layer
│   │   ├── schema.ts         # Drizzle schema definitions
│   │   ├── queries.ts        # Database query functions
│   │   ├── events.ts         # Event type definitions
│   │   ├── webhooks.ts       # Webhook CRUD functions
│   │   ├── index.ts          # Database connection management
│   │   └── migrations/       # Drizzle migration files
│   ├── types/                 # TypeScript types
│   │   └── index.ts          # Shared API types
│   ├── __tests__/             # Test files
│   │   ├── setup.ts          # Jest test setup
│   │   ├── *.test.ts         # Route and service tests
│   │   ├── fixtures/         # Test data fixtures
│   │   └── mocks/            # Test mocks
│   ├── examples/              # Example implementations
│   │   ├── kafka-integration.ts
│   │   └── websocket-test-client.ts
│   ├── test-db.ts            # Database connection test
│   └── index.ts              # Application entry point
├── package.json
├── tsconfig.json
├── jest.config.ts
├── drizzle.config.ts
├── Dockerfile
└── .env.example
```

### Request Lifecycle

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Express Server (port 3002)         │
├─────────────────────────────────────┤
│ 1. CORS Middleware                │
│ 2. JSON Body Parser              │
│ 3. Request Logger (timing)        │
│ 4. Route Handler (/v1/*)         │
└──────┬──────────────────────────┘
       │
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
┌─────────────┐                   ┌──────────────────┐
│   Routes    │                   │    WebSocket     │
│  (REST)     │                   │  (Socket.IO)     │
└──────┬──────┘                   └────────┬─────────┘
       │                                   │
       ▼                                   │
┌─────────────┐                           │
│  Services   │                           │
└──────┬──────┘                           │
       │                                   │
       ├───────────┬───────────┬───────────┤
       │           │           │           │
       ▼           ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐
│Solana   │ │Database │ │  Kafka   │ │ WebSocket │
│Connection│ │(Drizzle)│ │ Consumer │ │  Service  │
└─────────┘ └─────────┘ └──────────┘ └───────────┘
       │           │           │           │
       └───────────┴───────────┴───────────┘
                   │
                   ▼
           ┌───────────────┐
           │ Response      │
           └───────────────┘
```

### Data Flow

**REST API Request:**

```
Client → Express → Route → Service → (Solana/DB) → Response
```

**WebSocket Payment Notification:**

```
Kafka Event → Kafka Consumer → Decode Memo → WebSocket Service → Client
```

**Webhook Delivery:**

```
Kafka Event → Kafka Consumer → WebhookService → HTTP POST → External Endpoint
```

### Key Components

**Route Handlers (`src/routes/`)**

- Modular Express routers for each API endpoint group
- Use `asyncHandler` wrapper for error handling in async functions
- Centralized in `src/routes/index.ts` with `/v1` prefix

**Middleware (`src/middleware/`)**

- `requestLogger`: Logs all requests with method, path, IP, user-agent, and response time
- `errorHandler`: Centralized error handling with ApiError support
- `notFoundHandler`: 404 handler for undefined routes
- `asyncHandler`: Wrapper to catch errors in async route handlers

**Services (`src/services/`)**

- `solana.ts`: Solana RPC connection management and token mint operations
- `subscription.ts`: PaymentTracker integration for subscription status queries
- `onetime.ts`: One-time payment details retrieval
- `websocket.ts`: Socket.IO server with Redis adapter for multi-server deployments
- `kafkaConsumer.ts`: Kafka consumer for `tributary_PaymentRecord` events
- `webhookForwarder.ts`: Webhook delivery with retry logic (max 3 retries)
- `paymentNotifications.ts`: Payment notification helpers

**Database Layer (`src/db/`)**

- `schema.ts`: Drizzle ORM schema definitions (events, webhooks)
- `queries.ts`: Comprehensive query functions for events with filtering
- `events.ts`: TypeScript type definitions for all Tributary events
- `webhooks.ts`: CRUD operations for webhooks
- `index.ts`: Singleton PostgreSQL connection with connection pooling

### Database Schema

**Events Table:**

```sql
events (
  id BYTEA PRIMARY KEY,           -- Event ID as bytes
  slot BIGINT NOT NULL,           -- Solana slot number
  signature TEXT NOT NULL,         -- Transaction signature
  event_name TEXT NOT NULL,        -- Event name (e.g., PaymentRecord)
  data JSONB NOT NULL,            -- Event data
  timestamp TIMESTAMPTZ NOT NULL  -- Event timestamp with timezone
)
```

**Webhooks Table:**

```sql
webhooks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  gateway_pubkey TEXT NOT NULL,   -- Gateway public key
  endpoint_url TEXT NOT NULL,      -- Webhook URL
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

## API Endpoints

### Health Check

**GET /v1/health**

Check API health status.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "tributary-api",
    "version": "1.0.0"
  },
  "timestamp": 1699876543210
}
```

### Skill Generation

**GET /v1/skill/:encoded**

Generate Lando skill markdown from encoded subscription parameters.

**Path Parameters:**

- `encoded` (string, required): Base64-encoded subscription parameters

**Response:** `text/markdown`

### Subscription Management

**GET /v1/subscriptions**

Get subscription details by various lookup options.

**Query Parameters:**

- `trackingId` (string): Subscription tracking ID
- `userPublicKey` (string): User's public key
- `gatewayPublicKey` (string): Gateway's public key
- `walletPublicKey` (string): Wallet public key (requires tokenMint)
- `tokenMint` (string): Token mint address (requires walletPublicKey)
- `recipient` (string): Recipient public key

**Constraints:**

- Must provide at least one lookup parameter
- `walletPublicKey` and `tokenMint` must be provided together
- Maximum 3 query parameters allowed

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "userPayment": "PublicKey",
      "recipient": "PublicKey",
      "gateway": "PublicKey",
      "policyId": 1,
      "policyType": {
        "subscription": {
          "amount": 1000000,
          "autoRenew": true,
          "maxRenewals": null,
          "paymentFrequency": { "Monthly": null },
          "nextPaymentDue": 1699876543
        }
      },
      "memo": "tracking-id",
      "totalPaid": 5000000,
      "createdAt": 1699876543,
      "updatedAt": 1699876543
    }
  ],
  "timestamp": 1699876543210
}
```

### One-Time Payments

**GET /v1/onetime/:trackingId**

Get one-time payment details by tracking ID.

**Path Parameters:**

- `trackingId` (string, required): Payment tracking ID

**Query Parameters:**

- `recipient` (string, optional): Filter by recipient public key
- `limit` (number, optional): Maximum results (default: 100)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "data": {
    "trackingId": "tracking-id",
    "recipient": "PublicKey",
    "amount": 1000000,
    "timestamp": 1699876543
  },
  "timestamp": 1699876543210
}
```

### Event Queries

**GET /v1/events**

Query events with various filters.

**Query Parameters:**

- `signature` (string): Filter by transaction signature
- `slot` (number): Filter by Solana slot
- `eventName` (string): Filter by event name
- `trackingId` (string): Filter by tracking ID (encoded as memo)
- `startTime` (ISO-8601): Filter events after this time
- `endTime` (ISO-8601): Filter events before this time
- `minSlot` (number): Minimum slot number
- `maxSlot` (number): Maximum slot number
- `limit` (number, default: 100): Maximum results
- `offset` (number, default: 0): Pagination offset

**Response:**

```json
[
  {
    "id": "<bytes>",
    "slot": 123456789,
    "signature": "TransactionSignature",
    "eventName": "PaymentRecord",
    "data": { ... },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
]
```

**GET /v1/events/count**

Count events matching filters.

**Query Parameters:**

- `eventName` (string, optional): Event name filter
- `startTime` (ISO-8601, optional): Start time filter
- `endTime` (ISO-8601, optional): End time filter

**Response:**

```json
{
  "count": 1234
}
```

**GET /v1/events/names**

Get all unique event names.

**Response:**

```json
[
  "PaymentRecord",
  "PaymentPolicyCreated",
  "PaymentGatewayCreated",
  ...
]
```

**GET /v1/events/names/tributary**

Get all Tributary program event names.

**GET /v1/events/payments**

Get payment records with filters.

**Query Parameters:**

- `gateway` (string, optional): Gateway public key
- `paymentPolicy` (string, optional): Payment policy public key
- `limit` (number, optional): Max results (default: 100)
- `offset` (number, optional): Pagination offset (default: 0)

**GET /v1/events/payments/stats**

Get payment statistics.

**Query Parameters:**

- `gateway` (string, optional): Gateway public key
- `startTime` (ISO-8601, optional): Start time
- `endTime` (ISO-8601, optional): End time

**GET /v1/events/policies/created**

Get payment policy created events.

**Query Parameters:**

- `gateway` (string, optional): Gateway public key
- `recipient` (string, optional): Recipient public key
- `userPayment` (string, optional): User payment public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/policies/deleted**

Get payment policy deleted events.

**Query Parameters:**

- `paymentPolicy` (string, optional): Payment policy public key
- `owner` (string, optional): Owner public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/policies/status-changed**

Get payment policy status changed events.

**Query Parameters:**

- `paymentPolicy` (string, optional): Payment policy public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/gateways/created**

Get payment gateway created events.

**Query Parameters:**

- `authority` (string, optional): Authority public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/gateways/deleted**

Get payment gateway deleted events.

**Query Parameters:**

- `gateway` (string, optional): Gateway public key
- `authority` (string, optional): Authority public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/gateways/fee-bps-changed**

Get gateway fee bps changed events.

**Query Parameters:**

- `gateway` (string, optional): Gateway public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/gateways/fee-recipient-changed**

Get gateway fee recipient changed events.

**Query Parameters:**

- `gateway` (string, optional): Gateway public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/gateways/signer-changed**

Get gateway signer changed events.

**Query Parameters:**

- `gateway` (string, optional): Gateway public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/referrals/rewards**

Get referral reward distributed events.

**Query Parameters:**

- `gateway` (string, optional): Gateway public key
- `paymentPolicy` (string, optional): Payment policy public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/user-payments/created**

Get user payment created events.

**Query Parameters:**

- `owner` (string, optional): Owner public key
- `tokenMint` (string, optional): Token mint address
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/program/config-created**

Get program config created events.

**Query Parameters:**

- `admin` (string, optional): Admin public key
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/events/typed/:eventName**

Get typed events by event name.

**Path Parameters:**

- `eventName` (string, required): Event name

**Query Parameters:**

- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

### Webhooks

**POST /v1/webhooks**

Create a new webhook.

**Request Body:**

```json
{
  "gateway_pubkey": "GatewayPublicKey",
  "endpoint_url": "https://example.com/webhook",
  "active": true
}
```

**Response:**

```json
{
  "id": 1,
  "gatewayPubkey": "GatewayPublicKey",
  "endpointUrl": "https://example.com/webhook",
  "active": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**GET /v1/webhooks**

Get all webhooks with optional filters.

**Query Parameters:**

- `active_only` (boolean, optional): Filter only active webhooks
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset

**GET /v1/webhooks/gateway/:gatewayPubkey**

Get webhooks by gateway public key.

**Path Parameters:**

- `gatewayPubkey` (string, required): Gateway public key

**Query Parameters:**

- `active_only` (boolean, optional): Filter only active webhooks

**GET /v1/webhooks/:id**

Get webhook by ID.

**Path Parameters:**

- `id` (number, required): Webhook ID

**PUT /v1/webhooks/:id**

Update webhook active status.

**Path Parameters:**

- `id` (number, required): Webhook ID

**Request Body:**

```json
{
  "active": false
}
```

**DELETE /v1/webhooks/:id**

Delete webhook by ID.

**Path Parameters:**

- `id` (number, required): Webhook ID

**Response:** 204 No Content

**DELETE /v1/webhooks/gateway/:gatewayPubkey**

Delete all webhooks for a gateway.

**Path Parameters:**

- `gatewayPubkey` (string, required): Gateway public key

**Response:** 204 No Content

## WebSocket API

### Connection

**Endpoint:** `ws://localhost:3002/ws/v1`

Connect via Socket.IO client:

```javascript
const io = require("socket.io-client");

const socket = io("http://localhost:3002", {
  path: "/ws/v1",
  transports: ["websocket"],
});
```

### Client-to-Server Events

**subscribe**

Subscribe to payment notifications for a tracking ID.

```javascript
socket.emit("subscribe", { trackingId: "your-tracking-id" });
```

**unsubscribe**

Unsubscribe from payment notifications.

```javascript
socket.emit("unsubscribe", { trackingId: "your-tracking-id" });
```

### Server-to-Client Events

**payment**

Payment notification received.

```json
{
  "type": "payment_notification",
  "data": {
    "trackingId": "your-tracking-id",
    "amount": 1000000,
    "timestamp": 1699876543,
    "status": "executed",
    "signature": "TransactionSignature"
  },
  "timestamp": 1699876543210
}
```

**ack**

Acknowledgment message.

```json
{
  "type": "ack",
  "data": "Subscribed to trackingId: your-tracking-id",
  "timestamp": 1699876543210
}
```

**error**

Error message.

```json
{
  "type": "error",
  "data": {
    "code": "INVALID_TRACKING_ID",
    "message": "Tracking ID is required and must be a string"
  },
  "timestamp": 1699876543210
}
```

### Example Usage

```javascript
const io = require("socket.io-client");

const socket = io("http://localhost:3002", {
  path: "/ws/v1",
  transports: ["websocket"],
});

// Subscribe to payment notifications
socket.emit("subscribe", { trackingId: "my-subscription-id" });

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

// Unsubscribe when done
socket.emit("unsubscribe", { trackingId: "my-subscription-id" });
```

## Kafka Integration

### Configuration

Set `KAFKA_BROKERS` environment variable to enable Kafka integration:

```bash
KAFKA_BROKERS=localhost:9092,localhost:9093
```

### How It Works

1. **Kafka Consumer**: Subscribes to `tributary_PaymentRecord` topic with group ID `tributary-api-payments`
2. **Event Processing**: When a payment is made on-chain, event is received from Kafka
3. **Memo Decoding**: Extracts trackingId directly from payment event's memo field
4. **WebSocket Notification**: Pushes payment notification to all clients subscribed to that trackingId
5. **Webhook Forwarding**: Forwards payment records to registered webhooks with retry logic

### Kafka Message Format

The consumer expects messages in this format:

```json
{
  "_id": "ObjectId",
  "slot": 123456789,
  "signature": "transaction-signature",
  "program_id": "program-public-key",
  "event_name": "PaymentRecord",
  "discriminator": "event-discriminator",
  "data": {
    "payment_policy": "policy-public-key",
    "gateway": "gateway-public-key",
    "amount": "1000000",
    "timestamp": 1234567890,
    "memo": [116, 114, 97, 99, 107, 105, 110, 103, 45, 105, 100],
    "record_id": 1
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Payment Flow

```
On-chain Payment → Kafka Event → API Consumer (decode memo)
    → WebSocket Push → Client Notification
    → Webhook Forwarding → External Endpoints
```

### Webhook Delivery

The `WebhookService` forwards payment records to registered webhooks:

- **Max Retries**: 3 attempts with exponential backoff (1s, 2s, 3s)
- **Timeout**: 10 seconds per request
- **Headers**: `Content-Type: application/json`, `User-Agent: Tributary-Webhook-Forwarder/1.0`
- **Concurrent Delivery**: Webhooks are delivered in parallel using `Promise.allSettled`

**Webhook Payload:**

```json
{
  "event": "tributary_PaymentRecord",
  "data": {
    "payment_policy": "policy-public-key",
    "gateway": "gateway-public-key",
    "amount": 1000000,
    "timestamp": 1234567890,
    "memo": [116, 114, 97, 99, 107, 105, 110, 103, 45, 105, 100],
    "record_id": 1
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Environment Variables

### Required

| Variable       | Description                  | How to Get             |
| -------------- | ---------------------------- | ---------------------- |
| `DATABASE_URL` | PostgreSQL connection string | Your database provider |

### Optional

| Variable        | Description                     | Default                               |
| --------------- | ------------------------------- | ------------------------------------- |
| `PORT`          | Server port                     | `3002`                                |
| `SOLANA_RPC`    | Solana RPC URL                  | `https://api.mainnet-beta.solana.com` |
| `REDIS_URL`     | Redis URL for WebSocket adapter | None (single server mode)             |
| `KAFKA_BROKERS` | Comma-separated Kafka brokers   | None (no Kafka integration)           |

### Environment Examples

**Development:**

```bash
DATABASE_URL=postgresql://localhost:5432/tributary
PORT=3002
SOLANA_RPC=https://api.devnet.solana.com
REDIS_URL=redis://localhost:6379/0
KAFKA_BROKERS=localhost:9092
```

**Production:**

```bash
DATABASE_URL=postgresql://user:pass@prod-db:5432/tributary
PORT=3002
SOLANA_RPC=https://api.mainnet-beta.solana.com
REDIS_URL=redis://prod-redis:6379/0
KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
```

## Available Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `pnpm dev`           | Start development server with hot reload |
| `pnpm build`         | Build TypeScript to JavaScript           |
| `pnpm start`         | Start production server                  |
| `pnpm test`          | Run all tests                            |
| `pnpm test:watch`    | Run tests in watch mode                  |
| `pnpm test:coverage` | Run tests with coverage report           |
| `pnpm db:test`       | Test database connection and queries     |
| `pnpm db:generate`   | Generate database migration              |
| `pnpm db:push`       | Push schema to database                  |
| `pnpm db:studio`     | Open Drizzle Studio (database GUI)       |

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test -- health.route.test.ts
```

### Test Structure

```
src/__tests__/
├── setup.ts                    # Jest test setup
├── utils/                      # Test utilities
│   └── test-helpers.ts        # Helper functions
├── mocks/                      # Test mocks
│   ├── database-mock.ts       # Database mocks
│   └── query-mocks.ts        # Query mocks
├── fixtures/                   # Test data
│   ├── payment-events.ts       # Payment event fixtures
│   └── subscription-events.ts # Subscription event fixtures
├── health.route.test.ts        # Health route tests
├── subscription.route.test.ts   # Subscription route tests
├── onetime.route.test.ts       # One-time route tests
├── skill.route.test.ts         # Skill route tests
└── onetime.service.test.ts     # One-time service tests
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import app from "../index";

describe("Health Route", () => {
  it("should return health status", async () => {
    const response = await request(app).get("/v1/health").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });
});
```

### Coverage

Coverage reports are generated in `coverage/` directory:

- `coverage/lcov.info`: LCOV format for CI/CD
- `coverage/index.html`: HTML report for viewing in browser

## Deployment

### Docker

Build and run with Docker:

```bash
# Build image
docker build -t tributary-api .

# Run container
docker run -p 3002:3002 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e KAFKA_BROKERS=kafka:9092 \
  tributary-api
```

### Manual/VPS Deployment

```bash
# On server:

# Pull latest code
git pull origin main

# Install dependencies
cd apps/api
pnpm install

# Build TypeScript
pnpm build

# Run database migrations
pnpm db:push

# Start server (use PM2 or systemd for production)
pnpm start
```

### Systemd Service (Production)

Create `/etc/systemd/system/tributary-api.service`:

```ini
[Unit]
Description=Tributary API
After=network.target

[Service]
Type=simple
User=tributary
WorkingDirectory=/home/tributary/tributary/apps/api
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://..."
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable tributary-api
sudo systemctl start tributary-api
sudo systemctl status tributary-api
```

### Health Checks

The API exposes a health check endpoint for load balancers and orchestrators:

```bash
curl http://localhost:3002/v1/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "tributary-api",
    "version": "1.0.0"
  },
  "timestamp": 1699876543210
}
```

### Multi-Server Deployment

For horizontal scaling with WebSocket support:

1. Deploy multiple API instances behind a load balancer
2. Configure Redis URL in all instances
3. Use sticky sessions if load balancer supports it
4. Kafka consumer runs independently on each instance

**Example nginx.conf:**

```nginx
upstream tributary_api {
  ip_hash;  # Sticky sessions for WebSocket
  server api1:3002;
  server api2:3002;
  server api3:3002;
}

server {
  listen 80;
  server_name api.tributary.so;

  location / {
    proxy_pass http://tributary_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Troubleshooting

### Database Connection Issues

**Error:** `DATABASE_URL environment variable is not set`

**Solution:**

```bash
# Set DATABASE_URL in .env
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/tributary" >> .env
```

**Error:** `connection refused`

**Solution:**

1. Verify PostgreSQL is running: `pg_isready` or `docker ps`
2. Check connection string format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
3. Ensure database exists: `createdb tributary`

### Kafka Connection Issues

**Error:** `Failed to start Kafka consumer`

**Solution:**

1. Verify Kafka brokers are running: `nc -zv localhost 9092`
2. Check `KAFKA_BROKERS` format: `host1:9092,host2:9092`
3. Check Kafka topic exists: `kafka-topics --list --bootstrap-server localhost:9092`

### WebSocket Issues

**Error:** WebSocket connection fails

**Solution:**

1. Ensure path is `/ws/v1`, not `/socket.io/`
2. Check CORS configuration in `src/services/websocket.ts`
3. If using Redis adapter, verify `REDIS_URL` is correct
4. Check firewall allows WebSocket connections

### Build Issues

**Error:** TypeScript compilation errors

**Solution:**

```bash
# Check TypeScript errors
pnpm build

# Fix issues and rebuild
pnpm build
```

### Test Failures

**Error:** Tests fail with database connection errors

**Solution:**

1. Ensure `DATABASE_URL` is set in `.env`
2. Run `pnpm db:push` to sync schema
3. Run `pnpm db:test` to verify database connection

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3002`

**Solution:**

```bash
# Find process using port 3002
lsof -i :3002

# Kill process or change PORT in .env
echo "PORT=3003" >> .env
```

### Webhook Delivery Failures

**Error:** Webhooks not being delivered

**Solution:**

1. Check webhook endpoint is accessible: `curl -X POST https://example.com/webhook`
2. Verify webhook is active: `GET /v1/webhooks/gateway/:gatewayPubkey`
3. Check API logs for webhook delivery errors
4. Verify Kafka consumer is receiving payment events

## Microservice Splitting

The modular structure makes it easy to split individual APIs into separate microservices:

### Architecture

Each route module (`src/routes/*.ts`) is self-contained with:

- Route handlers
- Service dependencies
- Type definitions
- Middleware

### Example: Split `/v1/subscriptions` into separate service

1. **Copy route module:**

   ```bash
   cp apps/api/src/routes/subscription.ts services/subscription-service/src/routes/
   ```

2. **Copy required services:**

   ```bash
   cp apps/api/src/services/subscription.ts services/subscription-service/src/services/
   cp apps/api/src/services/solana.ts services/subscription-service/src/services/
   ```

3. **Copy types:**

   ```bash
   cp apps/api/src/types/index.ts services/subscription-service/src/types/
   ```

4. **Copy middleware:**

   ```bash
   cp apps/api/src/middleware/* services/subscription-service/src/middleware/
   ```

5. **Adjust imports** in copied files to reference local paths

6. **Update package.json** with dependencies:

   ```json
   {
     "dependencies": {
       "@tributary-so/sdk": "workspace:*",
       "@tributary-so/payments": "workspace:*",
       "@solana/web3.js": "^1.95.0",
       "@solana/spl-token": "^0.4.0",
       "express": "^4.18.2",
       "cors": "^2.8.5"
     }
   }
   ```

7. **Deploy independently** with its own infrastructure

### Benefits

- **Independent Scaling**: Scale each service based on load
- **Isolated Failures**: Failure in one service doesn't affect others
- **Team Autonomy**: Different teams can own different services
- **Technology Flexibility**: Each service can use different stack if needed

## Error Codes

### API Errors

| Status Code | Error                 | Description                |
| ----------- | --------------------- | -------------------------- |
| 400         | Bad Request           | Invalid request parameters |
| 404         | Not Found             | Resource not found         |
| 500         | Internal Server Error | Server-side error          |

### WebSocket Error Codes

| Code                  | Description                                  |
| --------------------- | -------------------------------------------- |
| `INVALID_TRACKING_ID` | Tracking ID is required and must be a string |
| `CONNECTION_ERROR`    | WebSocket connection error                   |

### Common Errors

**"Must specify one of trackingId, userPublicKey, gatewayPublicKey, recipient, or (walletPublicKey & tokenMint)!"**

Solution: Provide at least one valid query parameter when calling `/v1/subscriptions`.

**"If you provide either walletPublicKey or tokenMint, you have to provide both!"**

Solution: Both `walletPublicKey` and `tokenMint` must be provided together.

**"Too many filters specified. Up to 3 query args allowed."**

Solution: Limit query parameters to 3 or fewer when calling `/v1/subscriptions`.

## Performance Considerations

### Database Queries

- Use indexed columns for filters: `signature`, `slot`, `eventName`, `timestamp`
- Limit result sets with `limit` and `offset` parameters
- Use specific event endpoints (e.g., `/v1/events/payments`) instead of generic `/v1/events` when possible

### WebSocket Scaling

- Use Redis adapter for multi-server deployments
- Implement connection limits per tracking ID if needed
- Monitor active connections: `wsService.getActiveConnectionsCount()`

### Webhook Delivery

- Webhooks are delivered in parallel
- Failed webhooks retry up to 3 times with exponential backoff
- Consider implementing rate limiting on webhook endpoints

### Kafka Consumer

- Kafka consumer runs in a separate process
- Each API instance runs its own consumer
- Configure appropriate consumer group for your use case

## License

MIT
