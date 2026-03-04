# One-Time Payments API

## Overview

The one-time payments endpoint allows you to track and retrieve details about single payments made through the Tributary protocol using a tracking ID embedded in the payment memo.

## Endpoint

### GET `/v1/onetime/:trackingId`

Retrieves one-time payment details based on the tracking ID stored in the payment memo field.

#### URL Parameters

| Parameter  | Type   | Required | Description                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| trackingId | string | Yes      | Unique tracking identifier for the payment |

#### Query Parameters

| Parameter | Type   | Default | Description                            |
| --------- | ------ | ------- | -------------------------------------- |
| recipient | string | -       | Filter by recipient public key         |
| limit     | number | 100     | Maximum number of results to return    |
| offset    | number | 0       | Number of results to skip (pagination) |

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "trackingId": "trib_1234567890_abc123def",
    "signature": "5x7...",
    "slot": 123456789,
    "timestamp": "2024-01-01T00:00:00Z",
    "paymentPolicy": "Pubkey...",
    "gateway": "Pubkey...",
    "amount": 1000000,
    "memo": "Payment for Order #12345",
    "recordId": 1
  },
  "timestamp": 1704067200000
}
```

**Multiple Payments (200 OK)**

If multiple payments match the tracking ID:

```json
{
  "success": true,
  "data": [
    {
      "trackingId": "trib_1234567890_abc123def",
      "signature": "5x7...",
      "slot": 123456789,
      "timestamp": "2024-01-01T00:00:00Z",
      "paymentPolicy": "Pubkey...",
      "gateway": "Pubkey...",
      "amount": 1000000,
      "memo": "Payment for Order #12345",
      "recordId": 1
    },
    {
      "trackingId": "trib_1234567890_abc123def",
      "signature": "6y8...",
      "slot": 123456790,
      "timestamp": "2024-01-01T01:00:00Z",
      "paymentPolicy": "Pubkey...",
      "gateway": "Pubkey...",
      "amount": 500000,
      "memo": "Payment for Order #12345",
      "recordId": 2
    }
  ],
  "timestamp": 1704067200000
}
```

**Not Found (404)**

```json
{
  "success": false,
  "error": "One-time payment not found",
  "timestamp": 1704067200000
}
```

**Bad Request (400)**

```json
{
  "success": false,
  "error": "Missing trackingId parameter",
  "timestamp": 1704067200000
}
```

## Usage Examples

### cURL

```bash
# Get one-time payment by tracking ID
curl "http://localhost:3002/v1/onetime/trib_1234567890_abc123def"

# Filter by recipient
curl "http://localhost:3002/v1/onetime/trib_1234567890_abc123def?recipient=Pubkey..."

# Paginate results
curl "http://localhost:3002/v1/onetime/trib_1234567890_abc123def?limit=10&offset=20"
```

### JavaScript/TypeScript

```typescript
const trackingId = "trib_1234567890_abc123def";
const response = await fetch(
  `https://api.tributary.so/v1/onetime/${trackingId}`
);
const payment = await response.json();

if (payment.success) {
  console.log("Payment found:", payment.data);
  console.log("Amount:", payment.data.amount);
  console.log("Timestamp:", payment.data.timestamp);
} else {
  console.error("Payment not found:", payment.error);
}
```

## How It Works

1. **Payment Creation**: When creating a one-time payment through the Tributary checkout flow, a unique tracking ID is generated and embedded in the transaction memo.

2. **Payment Execution**: The payment is executed on the Solana blockchain, creating a `tributary_PaymentRecord` event with the memo containing the tracking ID.

3. **Indexing**: The Tributary indexer captures the payment event and stores it in the PostgreSQL database.

4. **Lookup**: The `/v1/onetime/:trackingId` endpoint queries the database for payment records where the memo field contains the specified tracking ID.

5. **Response**: The API returns the payment details including transaction signature, amount, timestamp, and other relevant information.

## Use Cases

- **Payment Confirmation**: Verify that a one-time payment was successfully processed
- **Order Tracking**: Associate payments with specific orders or transactions
- **Audit Trail**: Maintain a record of all payments made with a specific tracking ID
- **Webhook Integration**: Use with webhook infrastructure to trigger notifications when payments are detected

## Notes

- The tracking ID must be embedded in the payment memo during the checkout session creation
- Multiple payments can share the same tracking ID if the same checkout link is used multiple times
- The endpoint returns all matching payments, allowing you to see the complete history for a tracking ID
- Results are ordered by timestamp (most recent first)
