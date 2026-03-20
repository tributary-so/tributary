# REST API Reference

Complete reference for all Tributary REST API endpoints.

**Base URL:** `https://api.tributary.so/v1`

## Health Check

### GET /health

Check API health status.

```bash
curl https://api.tributary.so/v1/health
```

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

## Skill Generation

### GET /skill/:encoded

Generate Lando skill markdown from encoded subscription parameters. Used by AI agents to create payment subscription instructions.

**Path Parameters:**

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| `encoded` | string | Yes      | Base64-encoded subscription parameters |

**Response:** `text/markdown`

## Subscriptions

### GET /subscriptions

Get subscription details by various lookup options.

**Query Parameters:**

| Parameter          | Type   | Required | Description                                   |
| ------------------ | ------ | -------- | --------------------------------------------- |
| `trackingId`       | string | No\*     | Subscription tracking ID                      |
| `userPublicKey`    | string | No\*     | User's public key                             |
| `gatewayPublicKey` | string | No\*     | Gateway's public key                          |
| `walletPublicKey`  | string | No\*     | Wallet public key (requires tokenMint)        |
| `tokenMint`        | string | No\*     | Token mint address (requires walletPublicKey) |
| `recipient`        | string | No\*     | Recipient public key                          |

\*Must provide at least one parameter. `walletPublicKey` and `tokenMint` must be provided together. Maximum 3 query parameters allowed.

**Example:**

```bash
curl "https://api.tributary.so/v1/subscriptions?trackingId=my-subscription"
```

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

## One-Time Payments

### GET /onetime/:trackingId

Get one-time payment details by tracking ID.

**Path Parameters:**

| Parameter    | Type   | Required | Description         |
| ------------ | ------ | -------- | ------------------- |
| `trackingId` | string | Yes      | Payment tracking ID |

**Query Parameters:**

| Parameter   | Type   | Required | Description                    |
| ----------- | ------ | -------- | ------------------------------ |
| `recipient` | string | No       | Filter by recipient public key |
| `limit`     | number | No       | Maximum results (default: 100) |
| `offset`    | number | No       | Pagination offset (default: 0) |

**Example:**

```bash
curl "https://api.tributary.so/v1/onetime/order-12345"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "trackingId": "order-12345",
    "signature": "TransactionSignature",
    "slot": 245678901,
    "timestamp": "2025-03-09T10:30:00Z",
    "paymentPolicy": "7Rmx...",
    "gateway": "9Wz2...",
    "amount": 1000000,
    "memo": "order-12345",
    "recordId": 42
  },
  "timestamp": 1773052298109
}
```

## Events

### GET /events

Query events with various filters.

**Query Parameters:**

| Parameter    | Type     | Required | Description                     |
| ------------ | -------- | -------- | ------------------------------- |
| `signature`  | string   | No       | Filter by transaction signature |
| `slot`       | number   | No       | Filter by Solana slot           |
| `eventName`  | string   | No       | Filter by event name            |
| `trackingId` | string   | No       | Filter by tracking ID           |
| `startTime`  | ISO-8601 | No       | Filter events after this time   |
| `endTime`    | ISO-8601 | No       | Filter events before this time  |
| `minSlot`    | number   | No       | Minimum slot number             |
| `maxSlot`    | number   | No       | Maximum slot number             |
| `limit`      | number   | No       | Maximum results (default: 100)  |
| `offset`     | number   | No       | Pagination offset (default: 0)  |

**Example:**

```bash
curl "https://api.tributary.so/v1/events?trackingId=my-subscription&limit=10"
```

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

### GET /events/count

Count events matching filters.

**Query Parameters:**

| Parameter   | Type     | Required | Description       |
| ----------- | -------- | -------- | ----------------- |
| `eventName` | string   | No       | Event name filter |
| `startTime` | ISO-8601 | No       | Start time filter |
| `endTime`   | ISO-8601 | No       | End time filter   |

**Response:**

```json
{
  "count": 1234
}
```

### GET /events/names

Get all unique event names.

**Response:**

```json
[
  "PaymentRecord",
  "PaymentPolicyCreated",
  "PaymentGatewayCreated",
  "PaymentPolicyDeleted",
  "PaymentGatewayDeleted",
  "PaymentPolicyStatusChanged",
  "GatewayFeeBpsChanged",
  "GatewayFeeRecipientChanged",
  "GatewaySignerChanged",
  "UserPaymentCreated",
  "ProgramConfigCreated",
  "ReferralRewardDistributed"
]
```

### GET /events/names/tributary

Get all Tributary program event names.

### GET /events/payments

Get payment records with filters.

**Query Parameters:**

| Parameter       | Type   | Required | Description                    |
| --------------- | ------ | -------- | ------------------------------ |
| `gateway`       | string | No       | Gateway public key             |
| `paymentPolicy` | string | No       | Payment policy public key      |
| `limit`         | number | No       | Max results (default: 100)     |
| `offset`        | number | No       | Pagination offset (default: 0) |

### GET /events/payments/stats

Get payment statistics.

**Query Parameters:**

| Parameter   | Type     | Required | Description        |
| ----------- | -------- | -------- | ------------------ |
| `gateway`   | string   | No       | Gateway public key |
| `startTime` | ISO-8601 | No       | Start time         |
| `endTime`   | ISO-8601 | No       | End time           |

### GET /events/policies/created

Get payment policy created events.

**Query Parameters:**

| Parameter     | Type   | Required | Description             |
| ------------- | ------ | -------- | ----------------------- |
| `gateway`     | string | No       | Gateway public key      |
| `recipient`   | string | No       | Recipient public key    |
| `userPayment` | string | No       | User payment public key |
| `limit`       | number | No       | Max results             |
| `offset`      | number | No       | Pagination offset       |

### GET /events/policies/deleted

Get payment policy deleted events.

**Query Parameters:**

| Parameter       | Type   | Required | Description               |
| --------------- | ------ | -------- | ------------------------- |
| `paymentPolicy` | string | No       | Payment policy public key |
| `owner`         | string | No       | Owner public key          |
| `limit`         | number | No       | Max results               |
| `offset`        | number | No       | Pagination offset         |

### GET /events/policies/status-changed

Get payment policy status changed events.

**Query Parameters:**

| Parameter       | Type   | Required | Description               |
| --------------- | ------ | -------- | ------------------------- |
| `paymentPolicy` | string | No       | Payment policy public key |
| `limit`         | number | No       | Max results               |
| `offset`        | number | No       | Pagination offset         |

### GET /events/gateways/created

Get payment gateway created events.

**Query Parameters:**

| Parameter   | Type   | Required | Description          |
| ----------- | ------ | -------- | -------------------- |
| `authority` | string | No       | Authority public key |
| `limit`     | number | No       | Max results          |
| `offset`    | number | No       | Pagination offset    |

### GET /events/gateways/deleted

Get payment gateway deleted events.

**Query Parameters:**

| Parameter   | Type   | Required | Description          |
| ----------- | ------ | -------- | -------------------- |
| `gateway`   | string | No       | Gateway public key   |
| `authority` | string | No       | Authority public key |
| `limit`     | number | No       | Max results          |
| `offset`    | number | No       | Pagination offset    |

### GET /events/gateways/fee-bps-changed

Get gateway fee bps changed events.

**Query Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `gateway` | string | No       | Gateway public key |
| `limit`   | number | No       | Max results        |
| `offset`  | number | No       | Pagination offset  |

### GET /events/gateways/fee-recipient-changed

Get gateway fee recipient changed events.

**Query Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `gateway` | string | No       | Gateway public key |
| `limit`   | number | No       | Max results        |
| `offset`  | number | No       | Pagination offset  |

### GET /events/gateways/signer-changed

Get gateway signer changed events.

**Query Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `gateway` | string | No       | Gateway public key |
| `limit`   | number | No       | Max results        |
| `offset`  | number | No       | Pagination offset  |

### GET /events/referrals/rewards

Get referral reward distributed events.

**Query Parameters:**

| Parameter       | Type   | Required | Description               |
| --------------- | ------ | -------- | ------------------------- |
| `gateway`       | string | No       | Gateway public key        |
| `paymentPolicy` | string | No       | Payment policy public key |
| `limit`         | number | No       | Max results               |
| `offset`        | number | No       | Pagination offset         |

### GET /events/user-payments/created

Get user payment created events.

**Query Parameters:**

| Parameter   | Type   | Required | Description        |
| ----------- | ------ | -------- | ------------------ |
| `owner`     | string | No       | Owner public key   |
| `tokenMint` | string | No       | Token mint address |
| `limit`     | number | No       | Max results        |
| `offset`    | number | No       | Pagination offset  |

### GET /events/program/config-created

Get program config created events.

**Query Parameters:**

| Parameter | Type   | Required | Description       |
| --------- | ------ | -------- | ----------------- |
| `admin`   | string | No       | Admin public key  |
| `limit`   | number | No       | Max results       |
| `offset`  | number | No       | Pagination offset |

### GET /events/typed/:eventName

Get typed events by event name.

**Path Parameters:**

| Parameter   | Type   | Required | Description |
| ----------- | ------ | -------- | ----------- |
| `eventName` | string | Yes      | Event name  |

**Query Parameters:**

| Parameter | Type   | Required | Description       |
| --------- | ------ | -------- | ----------------- |
| `limit`   | number | No       | Max results       |
| `offset`  | number | No       | Pagination offset |

## Webhooks

### POST /webhooks

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

### GET /webhooks

Get all webhooks with optional filters.

**Query Parameters:**

| Parameter     | Type    | Required | Description                 |
| ------------- | ------- | -------- | --------------------------- |
| `active_only` | boolean | No       | Filter only active webhooks |
| `limit`       | number  | No       | Max results                 |
| `offset`      | number  | No       | Pagination offset           |

### GET /webhooks/gateway/:gatewayPubkey

Get webhooks by gateway public key.

**Path Parameters:**

| Parameter       | Type   | Required | Description        |
| --------------- | ------ | -------- | ------------------ |
| `gatewayPubkey` | string | Yes      | Gateway public key |

**Query Parameters:**

| Parameter     | Type    | Required | Description                 |
| ------------- | ------- | -------- | --------------------------- |
| `active_only` | boolean | No       | Filter only active webhooks |

### GET /webhooks/:id

Get webhook by ID.

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `id`      | number | Yes      | Webhook ID  |

### PUT /webhooks/:id

Update webhook active status.

**Path Parameters:**

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `id`      | number | Yes      | Webhook ID  |

**Request Body:**

```json
{
  "active": false
}
```

### DELETE /webhooks/:id

Delete webhook by ID.

**Response:** 204 No Content

### DELETE /webhooks/gateway/:gatewayPubkey

Delete all webhooks for a gateway.

**Path Parameters:**

| Parameter       | Type   | Required | Description        |
| --------------- | ------ | -------- | ------------------ |
| `gatewayPubkey` | string | Yes      | Gateway public key |

**Response:** 204 No Content

## Webhook Delivery

Webhooks are delivered with:

- **Max retries**: 3 attempts with exponential backoff (1s, 2s, 3s)
- **Timeout**: 10 seconds per request
- **Headers**: `Content-Type: application/json`, `User-Agent: Tributary-Webhook-Forwarder/1.0`

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

## Error Codes

| Status Code | Error                 | Description                |
| ----------- | --------------------- | -------------------------- |
| 400         | Bad Request           | Invalid request parameters |
| 404         | Not Found             | Resource not found         |
| 500         | Internal Server Error | Server-side error          |

**Error Response Format:**

```json
{
  "success": false,
  "error": "Detailed error message",
  "timestamp": 1773052298109
}
```

## Common Errors

**"Must specify one of trackingId, userPublicKey, gatewayPublicKey, recipient, or (walletPublicKey & tokenMint)!"**

Solution: Provide at least one valid query parameter.

**"If you provide either walletPublicKey or tokenMint, you have to provide both!"**

Solution: Both parameters must be provided together.

**"Too many filters specified. Up to 3 query args allowed."**

Solution: Limit query parameters to 3 or fewer.
