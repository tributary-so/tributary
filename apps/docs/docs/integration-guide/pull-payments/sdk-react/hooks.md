# Hooks

For full control over the UI, use hooks directly. Each hook manages its own loading/error state and returns an async function you call when ready.

## `useTributarySDK`

> **Full example integration:** [github.com/tributary-so/tributary/showcase-payments](https://github.com/tributary-so/tributary/tree/develop/apps/showcase-payments)

Returns an initialized `Tributary` SDK instance (or `null` if the wallet isn't connected). All other payment hooks depend on this internally — use it when you need raw SDK access.

```typescript
import { useTributarySDK } from "@tributary-so/sdk-react";

function MyComponent() {
  const sdk = useTributarySDK();

  if (!sdk) return <p>Connect your wallet</p>;

  // Use sdk.createSubscription(), sdk.createMilestone(), etc. directly
  const policies = await sdk.getUserPolicies(wallet.publicKey);
}
```

**Returns:** `Tributary | null`

---

## `useCreateSubscription`

> **Full example integration:** [github.com/tributary-so/tributary/showcase-payments](https://github.com/tributary-so/tributary/tree/develop/apps/showcase-payments)

Creates a subscription policy. Handles instruction building, transaction signing, and on-chain confirmation.

```typescript
import {
  useCreateSubscription,
  PaymentInterval,
} from "@tributary-so/sdk-react";
import { PublicKey, BN } from "@solana/web3.js";

function SubscribeForm() {
  const { createSubscription, loading, error } = useCreateSubscription();

  const handleSubscribe = async () => {
    const result = await createSubscription({
      amount: new BN(10_000_000), // 10 USDC
      token: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
      recipient: new PublicKey("RECIPIENT_WALLET"),
      gateway: new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr"),
      interval: PaymentInterval.Monthly,
      memo: "Pro plan",
      executeImmediately: true,
    });

    console.log("Subscription created:", result.txId);
  };

  return (
    <button onClick={handleSubscribe} disabled={loading}>
      {loading ? "Creating..." : "Subscribe $10/mo"}
    </button>
  );
}
```

**Parameters:** `CreateSubscriptionParams`

| Field                | Type              | Required | Description                   |
| -------------------- | ----------------- | -------- | ----------------------------- |
| `amount`             | `BN`              | Yes      | Amount per cycle              |
| `token`              | `PublicKey`       | Yes      | Token mint                    |
| `recipient`          | `PublicKey`       | Yes      | Recipient wallet              |
| `gateway`            | `PublicKey`       | Yes      | Gateway address               |
| `interval`           | `PaymentInterval` | Yes      | Billing frequency             |
| `custom_interval`    | `number`          | No       | Seconds (required for Custom) |
| `maxRenewals`        | `number`          | No       | Cap on renewals               |
| `memo`               | `string`          | No       | On-chain memo                 |
| `startTime`          | `Date`            | No       | First payment date            |
| `approvalAmount`     | `BN`              | No       | Token delegation amount       |
| `executeImmediately` | `boolean`         | No       | Charge first payment now      |

**Returns:** `{ createSubscription, loading, error }`

---

## `useCreateMilestone`

> **Full example integration:** [github.com/tributary-so/tributary/showcase-payments](https://github.com/tributary-so/tributary/tree/develop/apps/showcase-payments)

Creates a milestone payment with up to 4 deliverable phases. Each milestone has its own amount and due timestamp.

```typescript
import { useCreateMilestone } from "@tributary-so/sdk-react";
import { BN } from "@coral-xyz/anchor";

function MilestoneForm() {
  const { createMilestone, loading, error } = useCreateMilestone();

  const handleCreate = async () => {
    const result = await createMilestone({
      milestoneAmounts: [
        new BN(3_000_000),
        new BN(3_000_000),
        new BN(4_000_000),
      ],
      milestoneTimestamps: [
        new BN(Math.floor(Date.now() / 1000) + 86400 * 30),
        new BN(Math.floor(Date.now() / 1000) + 86400 * 60),
        new BN(Math.floor(Date.now() / 1000) + 86400 * 90),
      ],
      releaseCondition: 0, // time-based release
      token: USDC_MINT,
      recipient: RECIPIENT,
      gateway: GATEWAY,
      memo: "Website redesign project",
      executeImmediately: true,
    });

    console.log("Milestones created:", result.txId);
  };

  return (
    <button onClick={handleCreate} disabled={loading}>
      {loading ? "Creating..." : "Start Project"}
    </button>
  );
}
```

**Parameters:** `CreateMilestoneParams`

| Field                 | Type        | Required | Description                         |
| --------------------- | ----------- | -------- | ----------------------------------- |
| `milestoneAmounts`    | `BN[]`      | Yes      | Amount per milestone (max 4)        |
| `milestoneTimestamps` | `BN[]`      | Yes      | Unix timestamps for each milestone  |
| `releaseCondition`    | `number`    | Yes      | 0=time-based, 1=manual, 2=automatic |
| `token`               | `PublicKey` | Yes      | Token mint                          |
| `recipient`           | `PublicKey` | Yes      | Recipient wallet                    |
| `gateway`             | `PublicKey` | Yes      | Gateway address                     |
| `memo`                | `string`    | No       | On-chain memo                       |
| `approvalAmount`      | `BN`        | No       | Token delegation amount             |
| `executeImmediately`  | `boolean`   | No       | Release first milestone now         |

**Returns:** `{ createMilestone, loading, error }`

---

## `useCreatePayAsYouGo`

> **Full example integration:** [github.com/tributary-so/tributary/showcase-payments](https://github.com/tributary-so/tributary/tree/develop/apps/showcase-payments)

Creates a pay-as-you-go policy with a spending cap per period. The provider claims incrementally as the user consumes.

```typescript
import { useCreatePayAsYouGo } from "@tributary-so/sdk-react";
import { BN } from "@coral-xyz/anchor";

function PayGoForm() {
  const { createPayAsYouGo, loading, error } = useCreatePayAsYouGo();

  const handleCreate = async () => {
    const result = await createPayAsYouGo({
      maxAmountPerPeriod: new BN(50_000_000), // 50 USDC per day
      maxChunkAmount: new BN(1_000_000), // Max 1 USDC per claim
      periodLengthSeconds: new BN(86400), // Daily period
      token: USDC_MINT,
      recipient: RECIPIENT,
      gateway: GATEWAY,
      memo: "API usage",
    });

    console.log("Pay-as-you-go created:", result.txId);
  };

  return (
    <button onClick={handleCreate} disabled={loading}>
      {loading ? "Creating..." : "Enable Usage Billing"}
    </button>
  );
}
```

**Parameters:** `CreatePayAsYouGoParams`

| Field                 | Type        | Required | Description                  |
| --------------------- | ----------- | -------- | ---------------------------- |
| `maxAmountPerPeriod`  | `BN`        | Yes      | Spending cap per period      |
| `maxChunkAmount`      | `BN`        | Yes      | Maximum per individual claim |
| `periodLengthSeconds` | `BN`        | Yes      | Period duration in seconds   |
| `token`               | `PublicKey` | Yes      | Token mint                   |
| `recipient`           | `PublicKey` | Yes      | Recipient wallet             |
| `gateway`             | `PublicKey` | Yes      | Gateway address              |
| `memo`                | `string`    | No       | On-chain memo                |
| `approvalAmount`      | `BN`        | No       | Token delegation amount      |

**Returns:** `{ createPayAsYouGo, loading, error }`

---

## `useCheckoutSession`

> **Full example integration:** [github.com/tributary-so/tributary/showcase-payments](https://github.com/tributary-so/tributary/tree/develop/apps/showcase-payments)

Generates checkout URLs or redirects users to the hosted Tributary checkout page. Works for both one-time payments and subscriptions. No wallet connection required — the checkout page handles that.

```typescript
import { useCheckoutSession } from "@tributary-so/sdk-react";

function CheckoutButton() {
  const { generateUrl, initiate } = useCheckoutSession(
    "https://checkout.tributary.so"
  );

  const opts = {
    mode: "subscription" as const,
    tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    recipient: "YOUR_WALLET_ADDRESS",
    gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr",
    amount: 10, // 10 USDC
    paymentFrequency: "monthly",
    trackingId: "user-pro-plan",
    memo: "Pro subscription",
  };

  return (
    <div>
      <button onClick={() => initiate(opts)}>Pay with Checkout</button>
      <a href={generateUrl(opts)}>Share payment link</a>
    </div>
  );
}
```

**Parameters:** `CheckoutOptions`

| Field              | Type                          | Required | Description                 |
| ------------------ | ----------------------------- | -------- | --------------------------- |
| `mode`             | `"payment" \| "subscription"` | Yes      | Payment type                |
| `tokenMint`        | `string`                      | Yes      | Token mint address          |
| `recipient`        | `string`                      | Yes      | Recipient wallet            |
| `gateway`          | `string`                      | No       | Gateway address             |
| `amount`           | `number`                      | Yes      | Payment amount              |
| `trackingId`       | `string`                      | No       | Your reference ID           |
| `successPath`      | `string`                      | No       | Redirect path after success |
| `cancelPath`       | `string`                      | No       | Redirect path after cancel  |
| `paymentFrequency` | `string`                      | No       | Frequency for subscriptions |
| `autoRenew`        | `boolean`                     | No       | Auto-renew (default: true)  |
| `maxRenewals`      | `number \| null`              | No       | Cap renewals                |
| `memo`             | `string`                      | No       | Payment memo                |

**Returns:** `{ generateUrl, initiate }`

- `generateUrl(opts)` — returns a checkout URL string
- `initiate(opts)` — redirects the browser to the checkout page

---

## `useTributaryToken`

> **Full example integration:** [github.com/tributary-so/tributary/showcase-payments](https://github.com/tributary-so/tributary/tree/develop/apps/showcase-payments)

Verifies a Tributary JWT token (e.g., from a checkout callback) and decodes its payload. Use this to confirm an active subscription on the client side.

```typescript
import { useTributaryToken } from "@tributary-so/sdk-react";

function SuccessPage() {
  const { token, payload, loading, error } = useTributaryToken();

  if (loading) return <p>Verifying...</p>;
  if (error) return <p>Verification failed: {error}</p>;
  if (!payload) return <p>No token found</p>;

  return (
    <div>
      <h1>Subscription Active</h1>
      <p>Status: {payload.status}</p>
      <p>Tracking ID: {payload.trackingId}</p>
    </div>
  );
}
```

The hook reads the token from the URL query parameter `?token=` by default. Pass a token string explicitly to override.

```typescript
const { payload } = useTributaryToken(myJwtToken);
```

**Parameters:** `token?: string, baseUrl?: string`

**Returns:** `{ token, payload, loading, error }`

| Field     | Type                          | Description                  |
| --------- | ----------------------------- | ---------------------------- |
| `token`   | `string \| null`              | Raw JWT string               |
| `payload` | `TributaryJWTPayload \| null` | Decoded and verified payload |
| `loading` | `boolean`                     | Verification in progress     |
| `error`   | `string \| null`              | Verification error message   |

---

## `useTrackingId`

> **Full example integration:** [github.com/tributary-so/tributary/showcase-payments](https://github.com/tributary-so/tributary/tree/develop/apps/showcase-payments)

Fetches and verifies a payment token for a given tracking ID. Use this to confirm a user's subscription status on the client side by resolving a tracking ID (set during checkout) to a verified JWT payload.

```typescript
import { useTrackingId } from "@tributary-so/sdk-react";

function SubscriptionStatus({ trackingId, recipient }) {
  const { payload, loading, error, refresh } = useTrackingId(
    trackingId,
    recipient,
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!payload) return <p>No active subscription</p>;

  return (
    <div>
      <p>Status: {payload.status}</p>
      <p>Tracking ID: {payload.trackingId}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

**Parameters:**

| Parameter    | Type     | Required | Description                                        |
| ------------ | -------- | -------- | -------------------------------------------------- |
| `trackingId` | `string` | Yes      | Your reference ID set during checkout              |
| `recipient`  | `string` | Yes      | Recipient wallet address                           |
| `tokenMint`  | `string` | No       | Token mint address to filter by                    |
| `baseUrl`    | `string` | No       | API base URL (default: `https://api.tributary.so`) |

**Returns:** `PaymentTokenState`

| Field     | Type                          | Description                      |
| --------- | ----------------------------- | -------------------------------- |
| `payload` | `TributaryJWTPayload \| null` | Decoded and verified JWT payload |
| `loading` | `boolean`                     | Token fetch in progress          |
| `error`   | `string \| null`              | Error message if fetch failed    |
| `refresh` | `() => void`                  | Re-trigger the token fetch       |
