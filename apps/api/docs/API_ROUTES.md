# API Routes

## Event Query Endpoints

### GET `/v1/events`

Query events from the PostgreSQL database with various filters.

#### Query Parameters

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

#### Examples

```bash
# Get event by signature
curl "http://localhost:3002/v1/events?signature=5x7..."

# Get events for a specific slot
curl "http://localhost:3002/v1/events?slot=123456789"

# Get events by event name with pagination
curl "http://localhost:3002/v1/events?eventName=tributary_payment_record&limit=50&offset=0"

# Get events in time range
curl "http://localhost:3002/v1/events?startTime=2024-01-01T00:00:00Z&endTime=2024-01-31T23:59:59Z"

# Search with multiple filters
curl "http://localhost:3002/v1/events?eventName=tributary_payment_record&minSlot=100000&maxSlot=200000&limit=20"
```

---

### GET `/v1/events/count`

Count events matching filters.

#### Query Parameters

| Parameter | Type   | Description                        |
| --------- | ------ | ---------------------------------- |
| eventName | string | Filter by event name               |
| startTime | date   | Count events after this timestamp  |
| endTime   | date   | Count events before this timestamp |

---

### GET `/v1/events/names`

Get all unique event names in the database.

---

### GET `/v1/events/names/tributary`

Get all unique Tributary event names (prefixed with `tributary_`).

---

## Payment-Specific Endpoints

### GET `/v1/events/payments`

Get payment records with optional filters.

#### Query Parameters

| Parameter     | Type   | Description                     |
| ------------- | ------ | ------------------------------- |
| gateway       | string | Filter by gateway pubkey        |
| paymentPolicy | string | Filter by payment policy pubkey |
| limit         | number | Max results (default: 100)      |
| offset        | number | Pagination offset               |

#### Response

```json
[
  {
    "id": "...",
    "slot": 123456789,
    "signature": "5x7...",
    "eventName": "tributary_payment_record",
    "data": {
      "payment_policy": "...",
      "gateway": "...",
      "amount": 1000000,
      "timestamp": 1704067200,
      "memo": [0, 0, ...],
      "record_id": 1
    },
    "timestamp": "2024-01-01T00:00:00Z"
  }
]
```

---

### GET `/v1/events/payments/stats`

Get aggregated payment statistics.

#### Query Parameters

| Parameter | Type   | Description              |
| --------- | ------ | ------------------------ |
| gateway   | string | Filter by gateway pubkey |
| startTime | date   | Start of time range      |
| endTime   | date   | End of time range        |

#### Response

```json
{
  "totalAmount": 10000000000,
  "count": 1500
}
```

---

## Policy Endpoints

### GET `/v1/events/policies/created`

Get payment policy created events.

#### Query Parameters

| Parameter   | Type   | Description                |
| ----------- | ------ | -------------------------- |
| gateway     | string | Filter by gateway pubkey   |
| recipient   | string | Filter by recipient pubkey |
| userPayment | string | Filter by user payment     |
| limit       | number | Max results (default: 100) |
| offset      | number | Pagination offset          |

---

### GET `/v1/events/policies/deleted`

Get payment policy deleted events.

#### Query Parameters

| Parameter     | Type   | Description                     |
| ------------- | ------ | ------------------------------- |
| paymentPolicy | string | Filter by payment policy pubkey |
| owner         | string | Filter by owner pubkey          |
| limit         | number | Max results (default: 100)      |
| offset        | number | Pagination offset               |

---

### GET `/v1/events/policies/status-changed`

Get payment policy status changed events.

#### Query Parameters

| Parameter     | Type   | Description                     |
| ------------- | ------ | ------------------------------- |
| paymentPolicy | string | Filter by payment policy pubkey |
| limit         | number | Max results (default: 100)      |
| offset        | number | Pagination offset               |

---

## Gateway Endpoints

### GET `/v1/events/gateways/created`

Get payment gateway created events.

#### Query Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| authority | string | Filter by authority pubkey |
| limit     | number | Max results (default: 100) |
| offset    | number | Pagination offset          |

---

### GET `/v1/events/gateways/deleted`

Get payment gateway deleted events.

#### Query Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| gateway   | string | Filter by gateway pubkey   |
| authority | string | Filter by authority pubkey |
| limit     | number | Max results (default: 100) |
| offset    | number | Pagination offset          |

---

### GET `/v1/events/gateways/fee-bps-changed`

Get gateway fee basis points changed events.

#### Query Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| gateway   | string | Filter by gateway pubkey   |
| limit     | number | Max results (default: 100) |
| offset    | number | Pagination offset          |

---

### GET `/v1/events/gateways/fee-recipient-changed`

Get gateway fee recipient changed events.

#### Query Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| gateway   | string | Filter by gateway pubkey   |
| limit     | number | Max results (default: 100) |
| offset    | number | Pagination offset          |

---

### GET `/v1/events/gateways/signer-changed`

Get gateway signer changed events.

#### Query Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| gateway   | string | Filter by gateway pubkey   |
| limit     | number | Max results (default: 100) |
| offset    | number | Pagination offset          |

---

## Referral Endpoints

### GET `/v1/events/referrals/rewards`

Get referral reward distributed events.

#### Query Parameters

| Parameter     | Type   | Description                     |
| ------------- | ------ | ------------------------------- |
| gateway       | string | Filter by gateway pubkey        |
| paymentPolicy | string | Filter by payment policy pubkey |
| limit         | number | Max results (default: 100)      |
| offset        | number | Pagination offset               |

---

## User Payment Endpoints

### GET `/v1/events/user-payments/created`

Get user payment created events.

#### Query Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| owner     | string | Filter by owner pubkey     |
| tokenMint | string | Filter by token mint       |
| limit     | number | Max results (default: 100) |
| offset    | number | Pagination offset          |

---

## Program Config Endpoints

### GET `/v1/events/program/config-created`

Get program config created events.

#### Query Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| admin     | string | Filter by admin pubkey     |
| limit     | number | Max results (default: 100) |
| offset    | number | Pagination offset          |

---

## Generic Typed Event Endpoint

### GET `/v1/events/typed/:eventName`

Get events of a specific type by name.

#### URL Parameters

| Parameter | Type   | Description         |
| --------- | ------ | ------------------- |
| eventName | string | Event name to query |

#### Query Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| limit     | number | Max results (default: 100) |
| offset    | number | Pagination offset          |

#### Example

```bash
curl "http://localhost:3002/v1/events/typed/tributary_payment_record?limit=10"
```

---

## Event Types Reference

All Tributary events are prefixed with `tributary_`:

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

---

## TypeScript Types

The API provides full TypeScript type definitions for all event data structures in `src/db/events.ts`:

```typescript
import type {
  TributaryPaymentRecord,
  TributaryPaymentPolicyCreated,
  TributaryPaymentGatewayCreated,
  PaymentStatus,
  PaymentFrequency,
  PolicyType,
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
```
