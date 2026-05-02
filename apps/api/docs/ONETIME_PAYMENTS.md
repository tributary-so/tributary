# One-Time Payments (Transfer)

## Overview

The `transfer` instruction allows users to make one-time token payments through the Tributary protocol. Unlike recurring payments (subscriptions, milestones, pay-as-you-go), transfers are immediate and do not require a payment policy. They are subject to the same fee structure: **protocol fees** and **gateway fees** are deducted from the gross amount, with optional **referral rewards** paid from the gateway's fee share.

## Key Concepts

### Gross Amount Model

The `amount` parameter is the **GROSS** amount — the total that leaves the user's wallet. Fees are deducted from this amount:

```
amount (gross) = recipient_amount + gateway_fee + protocol_fee
```

- **Protocol fee**: `amount * protocol_fee_bps / 10000` — paid to the protocol treasury
- **Gateway fee**: `amount * gateway_fee_bps / 10000` — paid to the gateway operator (minus referral rewards)
- **Referral pool**: `gateway_fee * referral_allocation_bps / 10000` — distributed to referrers (L1, L2, L3)
- **Recipient receives**: `amount - gateway_fee - protocol_fee`

### Account Requirements

| Account              | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `authority`          | User signing the transfer (must own the `from` token account) |
| `config`             | Program configuration PDA (protocol fee recipient)            |
| `gateway`            | Payment gateway PDA (gateway fee settings)                    |
| `from`               | User's token account (must be owned by authority)             |
| `mint`               | Token mint account                                            |
| `to`                 | Recipient's token account                                     |
| `gatewayFeeAccount`  | Gateway fee recipient's token account (ATA)                   |
| `protocolFeeAccount` | Protocol fee recipient's token account (ATA)                  |
| `tokenProgram`       | SPL Token program                                             |

### Remaining Accounts (Referrals)

If the gateway has referrals enabled (`featureFlags & 1 == 1`), pass referral accounts as remaining accounts:

- Pairs of `[ReferralAccount, referrer_token_account]` for up to 3 levels (L1, L2, L3)
- Order: L1 referrer account, L2 referrer account, L3 referrer account, then their respective ATAs

## SDK Usage

### Basic Transfer

```typescript
import { Tributary } from "@tributary-so/sdk";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

const sdk = new Tributary(connection, wallet);

const instructions = await sdk.transfer(
  tokenMint, // PublicKey - token mint
  recipient, // PublicKey - recipient address
  gatewayPda, // PublicKey - gateway account PDA
  new BN(1_000_000), // BN - GROSS amount (fees deducted from this)
  "Order #12345" // string or 64-byte memo
);
```

### Transfer with Referral Code

```typescript
const instructions = await sdk.transfer(
  tokenMint,
  recipient,
  gatewayPda,
  new BN(1_000_000),
  "Order #12345",
  "ABC123" // 6-char referral code
);
```

### Fee Breakdown Example

Given: `amount = 1,000,000`, `gateway_fee_bps = 200` (2%), `protocol_fee_bps = 100` (1%)

| Component     | Calculation                 | Amount      |
| ------------- | --------------------------- | ----------- |
| Gross amount  |                             | 1,000,000   |
| Gateway fee   | 1,000,000 \* 200 / 10000    | 20,000      |
| Protocol fee  | 1,000,000 \* 100 / 10000    | 10,000      |
| **Recipient** | 1,000,000 - 20,000 - 10,000 | **970,000** |

If referral is enabled with `referral_allocation_bps = 2500` (25% of gateway fee):

- Referral pool: 20,000 \* 2500 / 10000 = 5,000
- Gateway keeps: 20,000 - 5,000 = 15,000
- Referral rewards split across L1/L2/L3 tiers

## Prerequisites

1. **Token account must have sufficient balance** — at least `amount` tokens
2. **All ATAs** (recipient, gateway fee, protocol fee) are created automatically by the SDK

## Events

Each transfer emits a `PaymentRecord` event:

| Field           | Value                                    |
| --------------- | ---------------------------------------- |
| `paymentPolicy` | `PublicKey.default` (no policy)          |
| `gateway`       | Gateway PDA                              |
| `amount`        | Gross amount                             |
| `timestamp`     | Unix timestamp                           |
| `memo`          | 64-byte memo                             |
| `recordId`      | `0` (transfers have no policy record ID) |
| `payer`         | User's public key                        |
| `recipient`     | Recipient's public key                   |

## API Endpoint

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
    "paymentPolicy": "11111111111111111111111111111111",
    "gateway": "GatewayPda...",
    "amount": 1000000,
    "memo": "Payment for Order #12345",
    "recordId": 0
  },
  "timestamp": 1704067200000
}
```

**Multiple Payments (200 OK)**

```json
{
  "success": true,
  "data": [
    {
      "trackingId": "trib_1234567890_abc123def",
      "signature": "5x7...",
      "slot": 123456789,
      "timestamp": "2024-01-01T00:00:00Z",
      "paymentPolicy": "11111111111111111111111111111111",
      "gateway": "GatewayPda...",
      "amount": 1000000,
      "memo": "Payment for Order #12345",
      "recordId": 0
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

## cURL Examples

```bash
# Get one-time payment by tracking ID
curl "http://localhost:3002/v1/onetime/trib_1234567890_abc123def"

# Filter by recipient
curl "http://localhost:3002/v1/onetime/trib_1234567890_abc123def?recipient=Pubkey..."

# Paginate results
curl "http://localhost:3002/v1/onetime/trib_1234567890_abc123def?limit=10&offset=20"
```

## JavaScript/TypeScript

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

2. **Payment Execution**: The `transfer` instruction is called on-chain. The user signs directly (no delegate required). Protocol fees, gateway fees, and optional referral rewards are distributed atomically.

3. **Indexing**: The Tributary indexer captures the `PaymentRecord` event (with `paymentPolicy = PublicKey.default` and `recordId = 0` for transfers) and stores it in the PostgreSQL database.

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
- Transfers do **not** require a `UserPayment` account — any user with a token account can transfer
- The `amount` is always GROSS — fees are deducted from it, never added on top
- Gateway custom protocol fees and referral settings apply to transfers the same way they apply to recurring payments
