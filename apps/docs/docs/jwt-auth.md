# JWT Authentication & JWKS

After a user completes checkout, the merchant needs to know: _Did the subscription actually get created? Is the user paid up?_ Tributary answers this with **cryptographically signed JWTs** that carry verifiable on-chain subscription claims — no backend integration required.

## Why JWTs?

The core problem: a checkout page redirects back to the merchant's site, but the merchant has no way to trust that redirect. They could query the blockchain directly, but that requires Solana RPC knowledge, PDA derivation, and account deserialization — a heavy lift for a simple "is this user subscribed?" check.

JWTs solve this by packaging on-chain subscription state into a **signed, verifiable token** that any web developer can validate with standard libraries. The merchant doesn't need to understand Solana — they just verify a JWT.

### Benefits of This Approach

| Benefit                   | Explanation                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **No backend required**   | Merchants can validate tokens client-side using the `jose` library. A static success page with JavaScript is enough.                                                                       |
| **Standard tooling**      | JWT verification is supported in every language. No Solana-specific knowledge needed.                                                                                                      |
| **Stateless**             | Tokens are issued from on-chain data — no server-side sessions, no database lookups, no state to manage.                                                                                   |
| **Self-contained**        | All subscription claims (amount, status, next payment due) are inside the token. No extra API calls to populate a dashboard.                                                               |
| **Automatic expiry**      | Token TTL is tied to the next payment due date. A token for a monthly subscription expires just before the next payment — naturally prompting a refresh that fetches fresh on-chain state. |
| **Key rotation built in** | JWKS with automatic 30-day rotation. Merchants fetch public keys from a well-known endpoint. Old keys stay valid for 24 hours during rotation — zero downtime.                             |
| **Privoxy-free**          | The JWT contains only public on-chain data. No secrets, no balances, no private keys. Even if the token leaks, it reveals nothing sensitive.                                               |

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
┌──────────┐   validate via JWKS   ┌──────────────────────────┐         │
│ Merchant │──────────────────────►│ GET /.well-known/jwks.json│◄────────┘
│ Success  │                       └──────────────────────────┘
│ Page     │  ◄── subscription claims (signed, trusted)
└──────────┘
```

1. User completes checkout → on-chain subscription created
2. Checkout app requests a JWT from the Tributary API
3. API reads on-chain state, builds subscription claims, signs with ES256 key
4. User is redirected to the merchant's `successUrl` with `?token=<jwt>`
5. Merchant validates the JWT signature against the public JWKS endpoint
6. Merchant reads subscription claims and grants access

## The JWT

### Token Structure

**Header:**

```json
{
  "alg": "ES256",
  "kid": "trib-2026-03-31-a",
  "typ": "JWT"
}
```

**Payload (example):**

```json
{
  "sub": "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
  "iss": "https://api.tributary.so",
  "aud": "tributary-checkout",
  "iat": 1743465600,
  "exp": 1743469200,
  "subscriptions": [
    {
      "policyAddress": "DxL...3kP",
      "recipient": "BxKp...9mVq",
      "gateway": "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4",
      "amount": "10.00",
      "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "paymentFrequency": "monthly",
      "lastExecuted": 1743465600,
      "totalPayments": 3,
      "nextPaymentDue": 1746057600,
      "status": "paid",
      "autoRenew": true,
      "maxRenewals": null,
      "createdAt": 1740787200
    }
  ]
}
```

### Subscription Claim Fields

| Field              | Type        | Description                                       |
| ------------------ | ----------- | ------------------------------------------------- |
| `policyAddress`    | string      | On-chain PaymentPolicy PDA address                |
| `recipient`        | string      | Payment recipient's Solana pubkey                 |
| `gateway`          | string      | PaymentGateway that processes this subscription   |
| `amount`           | string      | Human-readable amount (e.g. `"10.00"`)            |
| `tokenMint`        | string      | SPL token mint address                            |
| `paymentFrequency` | string      | `"daily"`, `"weekly"`, `"monthly"`, etc.          |
| `lastExecuted`     | number/null | Timestamp of last payment, null if never executed |
| `totalPayments`    | number      | Total payments executed                           |
| `nextPaymentDue`   | number/null | Timestamp of next scheduled payment               |
| `status`           | string      | `"paid"`, `"overdue"`, or `"completed"`           |
| `autoRenew`        | boolean     | Whether subscription auto-renews                  |
| `maxRenewals`      | number/null | Max renewal count, null = unlimited               |
| `createdAt`        | number      | Timestamp of policy creation                      |

### Token Expiration

Token TTL is tied to the payment schedule:

```
expiration = min(
  earliest nextPaymentDue + 10 minutes,
  now + 30 days
)
```

This means:

- A monthly subscription token expires just before the next payment is due
- Refreshing the token after payment fetches fresh state (paid → confirmed)
- Even yearly subscriptions are capped at 30-day TTL to limit stale data

### Status Derivation

| Condition                                               | Status                     |
| ------------------------------------------------------- | -------------------------- |
| Policy cancelled/paused on-chain                        | Excluded from JWT entirely |
| `totalPayments >= maxRenewals` (and maxRenewals is set) | `"completed"`              |
| `nextPaymentDue < now()`                                | `"overdue"`                |
| Otherwise                                               | `"paid"`                   |

## Merchant Integration

### Server-Side Validation (Recommended)

```typescript
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS_URL = new URL("https://api.tributary.so/.well-known/jwks.json");
const jwks = createRemoteJWKSet(JWKS_URL);

async function validateTributaryToken(token: string) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: "https://api.tributary.so",
    audience: "tributary-checkout",
  });

  return payload;
}
```

### Client-Side Validation

For merchants without a backend, the JWT can be validated entirely client-side:

```typescript
import { jwtVerify, createRemoteJWKSet } from "jose";

const jwks = createRemoteJWKSet(
  new URL("https://api.tributary.so/.well-known/jwks.json")
);

// On success page — extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

if (token) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: "https://api.tributary.so",
    audience: "tributary-checkout",
  });

  // Store for later refreshes
  localStorage.setItem("tributary_token", token);

  // Read subscription data
  payload.subscriptions.forEach((sub) => {
    console.log(`Subscription: ${sub.amount} ${sub.tokenMint}`);
    console.log(`Status: ${sub.status}`);
  });

  // Clean URL (remove token from browser history)
  window.history.replaceState({}, "", window.location.pathname);
}
```

### Token Refresh

When a token expires, refresh it to get updated on-chain state:

```typescript
const stored = localStorage.getItem("tributary_token");

if (stored) {
  try {
    await jwtVerify(stored, jwks, {
      issuer: "https://api.tributary.so",
      audience: "tributary-checkout",
    });
    // Token still valid — use it
  } catch (e) {
    if (e.code === "ERR_JWT_EXPIRED") {
      const response = await fetch(
        "https://api.tributary.so/v1/tokens/refresh",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${stored}` },
        }
      );
      const { token: newToken } = await response.json();
      localStorage.setItem("tributary_token", newToken);
    }
  }
}
```

Refresh is **stateless** — the API re-queries the blockchain every time. The expired JWT serves as proof of identity (valid signature required), and the API builds a fresh token with current on-chain state. Expired tokens can be refreshed for up to 7 days; after that, a new token must be issued via `/v1/tokens/issue`.

## API Endpoints

### Issue Token

```
POST /v1/tokens/issue
Content-Type: application/json

{
  "walletPublicKey": "7xKp...3mVq",
  "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

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

## Key Rotation

Signing keys rotate automatically every 30 days:

1. New ES256 key pair generated
2. Old key marked as rotated with a 24-hour grace period
3. JWKS endpoint serves both old and new keys during grace period
4. After grace period, old key is removed from JWKS

Merchants don't need to do anything — the `jose` library's `createRemoteJWKSet` handles key lookup automatically by matching the `kid` header.

Admin override is available via `POST /v1/admin/keys/rotate` (requires admin API key).

## Security Model

### What the Merchant Can Trust

- The subscription exists on Solana — claims reflect on-chain state at issuance time
- The user owns the wallet — `sub` claim identifies the wallet; checkout required wallet signature
- Payment status is current — as of the token's `iat` timestamp
- The token was issued by Tributary — cryptographic ES256 signature verification

### What the Merchant Cannot Trust

- That the holder of the JWT is the wallet owner (JWTs are bearer tokens — they can be copied). For high-value operations, verify wallet ownership directly.
- That the subscription is still active right now — the token reflects state at issuance. Call `/v1/tokens/refresh` for live data.

### Why This Is Safe

- **No secrets in tokens** — JWTs contain only public on-chain data (amounts, recipients, payment status). No private keys, no balances.
- **Short TTL** — tokens expire with the payment cycle, limiting exposure.
- **ES256** — smaller tokens, faster verification than RSA alternatives.
- **JWKS rotation** — compromised keys are rotated out automatically.
- **No server sessions** — stateless issuance means nothing to leak from a database.

## When Backend Integration Is Required

**It usually isn't.** Most merchants can validate the JWT client-side and be done. The JWT gives you everything you need: subscription status, amounts, payment history, next due date.

Backend integration is only needed when you have **background processes that need to check payment status without user interaction** — for example:

- A cron job that revokes access for overdue subscriptions
- An automated system that sends payment reminders
- A service that provisions resources based on subscription tier

In those cases, the business runs their own **gateway/facilitator**. This is by design — the facilitator is the entity that triggers payment execution on-chain. It has direct visibility into whether a payment succeeded or failed because it's the one submitting the transactions.

The facilitator knows:

| Event                    | Meaning                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| Transaction confirmed    | Payment executed successfully                                     |
| Transaction failed       | Payment not made (insufficient balance, revoked delegation, etc.) |
| No transaction submitted | Payment not yet due                                               |

So if you're running your own facilitator, you already have the data you need — you don't need to validate JWTs in your backend. The facilitator's own records are the source of truth for payment status. JWTs are for the **merchant's frontend** to verify subscription status without needing Solana expertise.

### Decision Guide

```
Do you need to check payment status without a user present?
├── No → Client-side JWT validation is sufficient
└── Yes → Are you running your own gateway/facilitator?
    ├── Yes → Use facilitator's own transaction records
    └── No → Use /v1/tokens/issue or /v1/tokens/refresh from your backend
```

## Dependencies

```bash
# For JWT verification (any language — here's the JS example)
pnpm add jose
```

No Solana libraries required for JWT validation. That's the point.

## Next Steps

- [Integration Options](./integration.md) — choose your integration method
- [Checkout Quickstart](./quickstart/checkout.md) — generate payment links with success URL
- [API Overview](./api/overview.md) — REST and WebSocket APIs
- [Security Model](./security.md) — protocol-level security details
