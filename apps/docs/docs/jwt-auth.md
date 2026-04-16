# JWT Authentication & JWKS

After a user completes checkout, the merchant needs to know: _Did the payment actually happen? Is a subscription active?_ Tributary answers with **cryptographically signed JWTs** that carry verifiable on-chain payment claims — no backend, no Solana SDK, no blockchain integration required.

## Why JWTs?

The core problem: a checkout page redirects back to the merchant's site, but the merchant has no way to trust that redirect. They could query the blockchain directly, but that requires Solana RPC knowledge, PDA derivation, and account deserialization — a heavy lift for a simple "did this user pay?" check.

JWTs solve this by packaging on-chain payment state into a **signed, verifiable token** that any web developer can validate with standard libraries. The merchant never talks to Solana — they just verify a JWT.

### Benefits of This Approach

| Benefit                   | Explanation                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **No backend required**   | Merchants can validate tokens client-side using the `jose` library. A static success page with JavaScript is enough.                                                                       |
| **No Solana code**        | JWT verification is supported in every language. No Solana SDK, no RPC calls, no PDA derivation, no account deserialization.                                                               |
| **Stateless**             | Tokens are issued from on-chain data — no server-side sessions, no database lookups, no state to manage.                                                                                   |
| **Self-contained**        | All payment claims (amount, status, transaction signatures, next payment due) are inside the token. No extra API calls needed.                                                             |
| **Automatic expiry**      | Token TTL is tied to the next payment due date. A token for a monthly subscription expires just before the next payment — naturally prompting a refresh that fetches fresh on-chain state. |
| **Key rotation built in** | JWKS with automatic 30-day rotation. Merchants fetch public keys from a well-known endpoint. Old keys stay valid for 24 hours during rotation — zero downtime.                             |
| **Self-hostable**         | Every component — checkout page, API server, indexer, signing keys — can run on your own infrastructure. Start hosted, migrate when ready.                                                 |
| **Two payment models**    | Same JWT flow handles both recurring subscriptions and one-time payments. The verification code is identical.                                                                              |
| **SDK provided**          | `TributaryVerifier` from `@tributary-so/payments` handles JWKS fetching, signature verification, and payment matching in one call.                                                         |

### How It Works

```
┌──────────┐    sign tx    ┌──────────┐   POST /v1/tokens/issue   ┌──────────┐
│  Checkout │─────────────►│  Solana   │──────────────────────────►│ Tributary │
│  Page     │              │  Blockchain│                          │ API       │
└──────────┘              └──────────┘                            └──────────┘
     │                            │                                     │
     │                    tx confirmed                          signs JWT
     │                            │                                     │
     │  ◄──── redirect with JWT ──┘                                     │
     │                            │                                     │
     ▼                            ▼                                     │
┌──────────┐   verify via JWKS    ┌──────────────────────────┐         │
│ Merchant │─────────────────────►│ GET /.well-known/jwks.json│◄────────┘
│ Success  │                      └──────────────────────────┘
│ Page     │  ◄── payment confirmed (recipient, wallet, memo matched)
└──────────┘
```

1. User completes checkout → on-chain subscription created **or** one-time payment executed
2. Checkout app requests a JWT from the Tributary API
3. API reads on-chain state, builds payment claims, signs with ES256 key
4. User is redirected to the merchant's `successUrl` with `?token=<jwt>`
5. Merchant calls `TributaryVerifier.verifyPayment()` or `verifySubscription()`
6. Verifier fetches JWKS, validates signature, matches payment claims — one call

## Two Token Types

Tributary issues JWTs for two payment models. Both share the same JWKS infrastructure, signing keys, and verification flow. The difference is what's inside:

| Token Type           | When Issued                    | Claims                                                       |
| -------------------- | ------------------------------ | ------------------------------------------------------------ |
| **Subscription**     | After on-chain policy creation | `subscriptions[]` (on-chain policy state) + `lastPayments[]` |
| **One-Time Payment** | After a single USDC transfer   | `lastPayments[]` only (no recurring policy)                  |

### Subscription Token

Issued after a user creates a recurring subscription on-chain. Contains the policy state and recent payment history:

```json
{
  "sub": "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
  "iss": "https://api.tributary.so",
  "aud": "tributary-checkout",
  "iat": 1743465600,
  "exp": 1743469200,
  "kid": "trib-2026-03-31-a",
  "subscriptions": [
    {
      "policyAddress": "DxL...3kP",
      "policyId": 1,
      "recipient": "BxKp...9mVq",
      "gateway": "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4",
      "amount": "100000",
      "paymentFrequency": "monthly",
      "totalPayments": 3,
      "nextPaymentDue": 1746057600,
      "status": "paid",
      "autoRenew": true,
      "maxRenewals": null,
      "createdAt": 1740787200
    }
  ],
  "lastPayments": [
    {
      "signature": "5UfK2hZ8rN3mQ9pL7wX1vB4cY6dA0eT2gR8nJ5sF3oH9kM7uP",
      "slot": 245123456,
      "timestamp": 1743465590,
      "policyAddress": "DxL...3kP",
      "amount": "100000",
      "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "payer": "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
      "recipient": "BxKp...9mVq",
      "gateway": "6ntm5rWqDFefET8RFyZV73FcdqxPMdc7Tso3pCMWk4w4",
      "memo": "user_123_monthly_premium",
      "recordId": 3
    }
  ]
}
```

### One-Time Payment Token

Issued after a single USDC transfer. Contains only the verified payment event — no recurring policy data:

```json
{
  "sub": "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
  "iss": "https://api.tributary.so",
  "aud": "tributary-checkout",
  "iat": 1743465600,
  "exp": 1743469200,
  "kid": "trib-2026-03-31-a",
  "subscriptions": [],
  "lastPayments": [
    {
      "signature": "5UfK2hZ8rN3mQ9pL7wX1vB4cY6dA0eT2gR8nJ5sF3oH9kM7uP",
      "slot": 245123456,
      "timestamp": 1743465590,
      "policyAddress": "11111111111111111111111111111111",
      "amount": "499900",
      "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "payer": "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
      "recipient": "BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq",
      "gateway": "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4",
      "memo": "order_12345",
      "recordId": 0
    }
  ]
}
```

A one-time payment token has an empty `subscriptions` array and a single entry in `lastPayments`. The `policyAddress` is the system program address (all ones) since there's no recurring policy.

## Verifying Payments (Recommended)

Use `TributaryVerifier` from `@tributary-so/payments` to verify JWTs. It handles JWKS fetching, signature verification, and payment matching in one call. No need to understand JWT claims, JWKS endpoints, or on-chain data structures.

### Install

```bash
pnpm add @tributary-so/payments
```

No Solana libraries required. `jose` is included as a dependency.

### Initialize

```typescript
import { TributaryVerifier } from "@tributary-so/payments";

// Uses TRIBUTARY_BASE_URL env var, defaults to https://api.tributary.so
const verifier = new TributaryVerifier();

// Or configure explicitly (for self-hosted instances)
const verifier = new TributaryVerifier({
  baseUrl: "https://your-api.example.com",
  issuer: "https://your-api.example.com",
  audience: "tributary-checkout",
});
```

### Verify a Subscription

After a user completes a subscription checkout and lands on your success page:

```typescript
// On your success page — extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

try {
  const subscription = await verifier.verifySubscription(token, {
    recipient: "BxKp...9mVq", // your wallet (the payment recipient)
    wallet: "7xKp...3mVq", // user's wallet pubkey
    memo: "user_123_monthly", // the trackingId from your checkout session
  });

  // If we get here, the subscription is confirmed:
  // - JWT signature is valid (signed by Tributary's JWKS key)
  // - Wallet matches the token's subject
  // - A subscription with status "paid" exists for your recipient
  // - A payment with matching memo exists in lastPayments

  console.log("Subscription confirmed!");
  console.log(`Amount: ${subscription.amount}`);
  console.log(`Frequency: ${subscription.paymentFrequency}`);
  console.log(
    `Next payment due: ${new Date(subscription.nextPaymentDue * 1000)}`
  );

  // Grant access
  grantUserAccess(subscription);

  // Store token for refreshes
  localStorage.setItem("tributary_token", token);
} catch (e) {
  if (e instanceof SubscriptionVerificationError) {
    // Specific errors with details:
    // "Wallet mismatch: token issued for X, expected Y"
    // "Subscription found but not paid (status: overdue)"
    // "No active subscription found for recipient=..., wallet=..."
    // "Subscription is paid but no payment found with memo=..."
    console.error("Subscription verification failed:", e.message);
    showAccessDenied(e.message);
  }
}

// Clean URL
window.history.replaceState({}, "", window.location.pathname);
```

### Verify a One-Time Payment

```typescript
try {
  const payment = await verifier.verifyPayment(token, {
    recipient: "BxKp...9mVq", // your wallet
    wallet: "7xKp...3mVq", // user's wallet
    memo: "order_12345", // tracking ID for this purchase
  });

  // Payment confirmed — deliver the product
  console.log(`Payment confirmed: ${payment.amount} lamports`);
  console.log(`Transaction: ${payment.signature}`);
  console.log(`Paid at: ${new Date(payment.timestamp * 1000)}`);

  deliverProduct(payment);
} catch (e) {
  if (e instanceof PaymentVerificationError) {
    // "Wallet mismatch: ..."
    // "No payment found matching recipient=..., wallet=..., memo=..."
    console.error("Payment verification failed:", e.message);
    showPaymentFailed(e.message);
  }
}
```

### Verify Either (Unified)

If your product supports both models and you want one code path:

```typescript
import {
  TributaryVerifier,
  PaymentVerificationError,
  SubscriptionVerificationError,
} from "@tributary-so/payments";

const verifier = new TributaryVerifier();

async function confirmAnyPayment(
  token: string,
  opts: {
    recipient: string;
    wallet: string;
    memo: string;
  }
) {
  // Try subscription first
  try {
    const sub = await verifier.verifySubscription(token, opts);
    return { type: "subscription" as const, data: sub };
  } catch {}

  // Fall back to one-time payment
  try {
    const payment = await verifier.verifyPayment(token, opts);
    return { type: "one_time" as const, data: payment };
  } catch {}

  return null;
}

const result = await confirmAnyPayment(token, {
  recipient: YOUR_WALLET,
  wallet: userWallet,
  memo: trackingId,
});

if (result?.type === "subscription") {
  grantSubscriptionAccess(result.data);
} else if (result?.type === "one_time") {
  deliverProduct(result.data);
} else {
  showAccessDenied();
}
```

### Token Refresh

When a token expires, refresh it to get updated on-chain state:

```typescript
const stored = localStorage.getItem("tributary_token");

if (stored) {
  try {
    // Try verifying the existing token first
    await verifier.verify(stored);
  } catch (e) {
    if (e.code === "ERR_JWT_EXPIRED") {
      const response = await fetch(`${verifier.baseUrl}/v1/tokens/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${stored}` },
      });
      const { token: newToken } = await response.json();
      localStorage.setItem("tributary_token", newToken);
    }
  }
}
```

Refresh is **stateless** — the API re-queries the blockchain every time. The expired JWT serves as proof of identity (valid signature required), and the API builds a fresh token with current on-chain state. Expired tokens can be refreshed for up to 7 days; after that, a new token must be issued via `/v1/tokens/issue`.

### Error Handling

All verification errors inherit from `VerificationError` and include descriptive messages:

```typescript
import {
  VerificationError,
  PaymentVerificationError,
  SubscriptionVerificationError,
} from "@tributary-so/payments";

try {
  await verifier.verifySubscription(token, opts);
} catch (e) {
  if (e instanceof SubscriptionVerificationError) {
    // Subscription-specific failures:
    // - Wallet mismatch
    // - No subscription for recipient
    // - Subscription exists but not paid (includes actual status)
    // - Paid but memo doesn't match any payment
  } else if (e instanceof PaymentVerificationError) {
    // Payment-specific failures:
    // - Wallet mismatch
    // - No payment matching recipient + wallet + memo
  } else if (e instanceof VerificationError) {
    // JWT signature failures, expired tokens, wrong issuer/audience
  }
}
```

```
VerificationError (base)
├── PaymentVerificationError      — verifyPayment failures
└── SubscriptionVerificationError — verifySubscription failures
```

### Self-Hosted Verification

When running your own Tributary API instance, configure the verifier to point to your server:

```typescript
const verifier = new TributaryVerifier({
  baseUrl: "https://payments.yourcompany.com",
  issuer: "https://payments.yourcompany.com",
});
```

Or via environment variables:

```bash
TRIBUTARY_BASE_URL=https://payments.yourcompany.com
TRIBUTARY_ISSUER=https://payments.yourcompany.com
```

The verification code is identical regardless of whether you use the hosted or self-hosted API — only the base URL changes.

## Verifying Payments (Low-Level)

If you're not using TypeScript/JavaScript, or need direct access to JWT claims, you can verify tokens manually using any JWT library that supports JWKS.

### Manual Verification with `jose`

```typescript
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS_URL = new URL("https://api.tributary.so/.well-known/jwks.json");
const jwks = createRemoteJWKSet(JWKS_URL);

async function validateToken(token: string) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: "https://api.tributary.so",
    audience: "tributary-checkout",
  });
  return payload;
}
```

### Manual Subscription Check

```typescript
const payload = await validateToken(token);

const subs = payload.subscriptions as Array<any>;
if (subs.length === 0) {
  return { active: false, reason: "no_subscriptions" };
}

const sub = subs.find((s) => s.recipient === YOUR_WALLET);
if (!sub) {
  return { active: false, reason: "not_your_subscription" };
}

if (sub.status !== "paid") {
  return { active: false, reason: `subscription_${sub.status}` };
}

// Verify payment exists with your tracking ID
const payments = payload.lastPayments as Array<any>;
const matchingPayment = payments.find(
  (p) =>
    p.recipient === YOUR_WALLET &&
    p.payer === userWallet &&
    (p.memo === trackingId || p.memo.includes(trackingId))
);

if (!matchingPayment) {
  return { active: false, reason: "no_matching_payment" };
}

return { active: true, subscription: sub, payment: matchingPayment };
```

### Manual One-Time Payment Check

```typescript
const payload = await validateToken(token);

const subs = payload.subscriptions as Array<any>;
if (subs.length > 0) {
  return { valid: false, reason: "expected_one_time_got_subscription" };
}

const payments = payload.lastPayments as Array<any>;
const payment = payments.find(
  (p) =>
    p.recipient === YOUR_WALLET &&
    p.payer === userWallet &&
    (p.memo === trackingId || p.memo.includes(trackingId))
);

if (!payment) {
  return { valid: false, reason: "no_matching_payment" };
}

return { valid: true, payment };
```

### Non-JavaScript Environments

Any JWT library with JWKS support works. The verification parameters are:

| Parameter | Value                                            |
| --------- | ------------------------------------------------ |
| Algorithm | ES256                                            |
| Issuer    | `https://api.tributary.so`                       |
| Audience  | `tributary-checkout`                             |
| JWKS URL  | `https://api.tributary.so/.well-known/jwks.json` |

After verifying the signature, inspect `payload.subscriptions` and `payload.lastPayments` to match against your expected recipient, wallet, and memo.

## Claim Reference

### Header

```json
{
  "alg": "ES256",
  "kid": "trib-2026-03-31-a",
  "typ": "JWT"
}
```

### Subscription Claim Fields

| Field              | Type        | Description                                       |
| ------------------ | ----------- | ------------------------------------------------- |
| `policyAddress`    | string      | On-chain PaymentPolicy PDA address                |
| `policyId`         | number      | Policy ID within the UserPayment account          |
| `recipient`        | string      | Payment recipient's Solana pubkey                 |
| `gateway`          | string      | PaymentGateway that processes this subscription   |
| `amount`           | string      | Payment amount in smallest token units (lamports) |
| `paymentFrequency` | string      | `"daily"`, `"weekly"`, `"monthly"`, etc.          |
| `totalPayments`    | number      | Total payments executed so far                    |
| `nextPaymentDue`   | number/null | Timestamp of next scheduled payment               |
| `status`           | string      | `"paid"`, `"overdue"`, or `"completed"`           |
| `autoRenew`        | boolean     | Whether subscription auto-renews                  |
| `maxRenewals`      | number/null | Max renewal count, null = unlimited               |
| `createdAt`        | number      | Timestamp of policy creation                      |

### Payment Record Fields (lastPayments)

| Field           | Type   | Description                                       |
| --------------- | ------ | ------------------------------------------------- |
| `signature`     | string | Solana transaction signature                      |
| `slot`          | number | Solana slot number                                |
| `timestamp`     | number | Unix timestamp of the payment                     |
| `policyAddress` | string | PaymentPolicy PDA, or system program for one-time |
| `amount`        | string | Payment amount in smallest token units            |
| `tokenMint`     | string | SPL token mint address (e.g. USDC)                |
| `payer`         | string | Payer's Solana pubkey                             |
| `recipient`     | string | Recipient's Solana pubkey                         |
| `gateway`       | string | PaymentGateway PDA address                        |
| `memo`          | string | Memo/tracking ID attached to the payment          |
| `recordId`      | number | Payment record ID (0 for one-time payments)       |

### Status Derivation (Subscriptions)

| Condition                                               | Status                     |
| ------------------------------------------------------- | -------------------------- |
| Policy cancelled/paused on-chain                        | Excluded from JWT entirely |
| `totalPayments >= maxRenewals` (and maxRenewals is set) | `"completed"`              |
| `nextPaymentDue < now()`                                | `"overdue"`                |
| Otherwise                                               | `"paid"`                   |

## Token Expiration

Token TTL is tied to the payment schedule:

```
expiration = min(
  earliest nextPaymentDue + 10 minutes,
  now + 30 days
)
```

- **Monthly subscription** → JWT lives ~30 days (expires just before next payment)
- **Weekly subscription** → JWT lives ~7 days
- **Yearly subscription** → JWT capped at 30 days
- **One-time payment** → Fixed TTL (1 hour default)

Refreshing the token after payment fetches fresh state. Even yearly subscriptions are capped at 30-day TTL to limit stale data.

## API Endpoints

### Issue Token

```
POST /v1/tokens/issue
Content-Type: application/json

{
  "walletPublicKey": "7xKp...3mVq",
  "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "recipient": "BxKp...9mVq",
  "transactionSignature": "5Uf...9kT2"
}
```

| Field                  | Required | Description                                    |
| ---------------------- | -------- | ---------------------------------------------- |
| `walletPublicKey`      | Yes      | Payer's Solana wallet address                  |
| `tokenMint`            | No       | SPL token mint (defaults to USDC)              |
| `recipient`            | No       | Filter claims to a specific recipient          |
| `transactionSignature` | No       | Verify a specific one-time payment transaction |

Unauthenticated — the JWT contains only public on-chain data. Any party can request a JWT for any wallet. The value comes from the cryptographic guarantee that claims match on-chain state, signed by Tributary's key.

**Rate limit:** 10 requests/minute per wallet.

### Refresh Token

```
POST /v1/tokens/refresh
Authorization: Bearer <expired-jwt>
```

Accepts expired JWTs (valid signature required, within 7-day grace window). Re-queries blockchain and returns a fresh token.

**Rate limit:** 30 requests/minute per wallet.

### JWKS (Public Keys)

```
GET /.well-known/jwks.json
```

Returns all active public keys in standard JWKS format. Cached for 1 hour (`Cache-Control: public, max-age=3600`).

```json
{
  "keys": [
    {
      "kty": "EC",
      "crv": "P-256",
      "kid": "trib-2026-03-31-a",
      "alg": "ES256",
      "use": "sig",
      "x": "...",
      "y": "..."
    }
  ]
}
```

## Self-Hosting

Every component of Tributary's JWT infrastructure can be self-hosted:

| Component     | What it does                         | Self-host? |
| ------------- | ------------------------------------ | ---------- |
| Checkout page | UI for wallet connection + payment   | Yes        |
| API server    | JWT issuance, JWKS, token refresh    | Yes        |
| Indexer       | Monitors on-chain payment events     | Yes        |
| JWKS keys     | Signing key management + rotation    | Yes        |
| Facilitator   | Triggers recurring payment execution | Yes        |

When self-hosting, configure `TributaryVerifier` with your base URL:

```typescript
const verifier = new TributaryVerifier({
  baseUrl: "https://payments.yourcompany.com",
});
```

Or set the `TRIBUTARY_BASE_URL` environment variable.

## Key Rotation

Signing keys rotate automatically every 30 days:

1. New ES256 key pair generated
2. Old key marked as rotated with a 24-hour grace period
3. JWKS endpoint serves both old and new keys during grace period
4. After grace period, old key is removed from JWKS

Merchants don't need to do anything — `TributaryVerifier` and `jose`'s `createRemoteJWKSet` handle key lookup automatically by matching the `kid` header.

Admin override is available via `POST /v1/admin/keys/rotate` (requires admin API key).

## Security Model

### What the Merchant Can Trust

- The payment exists on Solana — claims reflect on-chain state at issuance time
- The user owns the wallet — `sub` claim identifies the wallet; checkout required wallet signature
- Payment status is current — as of the token's `iat` timestamp
- The token was issued by Tributary — cryptographic ES256 signature verification
- Transaction signatures in `lastPayments` are real — they can be looked up on Solana Explorer
- The `verifyPayment`/`verifySubscription` methods confirm recipient, wallet, **and** memo match — not just that a payment exists, but that it's **your** payment from **this** user for **this** tracking ID

### What the Merchant Cannot Trust

- That the holder of the JWT is the wallet owner (JWTs are bearer tokens — they can be copied). For high-value operations, verify wallet ownership directly.
- That the subscription is still active right now — the token reflects state at issuance. Call `/v1/tokens/refresh` for live data.

### Why the Memo Matters

The `memo` parameter in `verifyPayment` and `verifySubscription` isn't optional — it's your strongest protection against replay attacks. Without memo matching, a malicious user could:

1. Create a subscription for Product A ($5/month)
2. Get a valid JWT
3. Present it as proof of payment for Product B ($50/month)

By requiring the memo (your `trackingId` from checkout creation) to match, you ensure the JWT proves payment for **this specific product/order**, not just "some payment exists."

### Why This Is Safe

- **No secrets in tokens** — JWTs contain only public on-chain data (amounts, recipients, payment status). No private keys, no balances.
- **Short TTL** — tokens expire with the payment cycle, limiting exposure.
- **ES256** — smaller tokens, faster verification than RSA alternatives.
- **JWKS rotation** — compromised keys are rotated out automatically.
- **No server sessions** — stateless issuance means nothing to leak from a database.
- **Memo binding** — verification is scoped to your specific checkout session, not global.

## When Backend Integration Is Required

**It usually isn't.** Most merchants can validate the JWT client-side and be done. The JWT gives you everything you need: subscription status, payment history, amounts, transaction signatures, next due date.

Backend integration is only needed when you have **background processes that need to check payment status without user interaction** — for example:

- A cron job that revokes access for overdue subscriptions
- An automated system that sends payment reminders
- A service that provisions resources based on subscription tier

In those cases, the business runs their own **gateway/facilitator**. This is by design — the facilitator is the entity that triggers payment execution on-chain. It has direct visibility into whether a payment succeeded or failed because it's the one submitting the transactions.

### Decision Guide

```
Do you need to check payment status without a user present?
├── No → Client-side TributaryVerifier is sufficient
└── Yes → Are you running your own gateway/facilitator?
    ├── Yes → Use facilitator's own transaction records
    └── No → Use /v1/tokens/issue or /v1/tokens/refresh from your backend
```

## Dependencies

```bash
# Recommended: use the SDK
pnpm add @tributary-so/payments

# Or, for manual verification (any language — here's the JS example)
pnpm add jose
```

No Solana libraries required for JWT validation. That's the point.

## Environment Variables

| Variable             | Required | Description                                                 |
| -------------------- | -------- | ----------------------------------------------------------- |
| `TRIBUTARY_BASE_URL` | No       | API base URL, defaults to `https://api.tributary.so`        |
| `TRIBUTARY_ISSUER`   | No       | Expected JWT issuer, defaults to `https://api.tributary.so` |
| `TRIBUTARY_AUDIENCE` | No       | Expected JWT audience, defaults to `tributary-checkout`     |

## Next Steps

- [Integration Options](./integration.md) — choose your integration method
- [Checkout](./checkout.md) — generate payment links with success URL
- [API Overview](./api/overview.md) — REST and WebSocket APIs
- [Security Model](./security.md) — protocol-level security details
