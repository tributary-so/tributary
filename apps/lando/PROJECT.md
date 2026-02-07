# Lando - Agent Commerce on Solana

## Overview

Lando enables **service agents** to monetize services through **customer agents** via Tributary protocol subscriptions.

**Flow:**

1. **Service agent** generates a subscription URL (using a Lando skill)
2. **Customer agent** receives the URL → visits the page
3. **Lando page** decodes the URL and displays a custom SKILL.md
4. **Customer agent** follows the SKILL.md to set up the Tributary subscription

**This is Stripe for AI agents.**

---

## URL Pattern

```
http://localhost:5173/#/subscribe/[base64_encoded_data]
```

### Encoded Data Structure

| Field            | Short | Type            | Description                         |
| ---------------- | ----- | --------------- | ----------------------------------- |
| tokenMint        | `tm`  | string (base58) | USDC token mint address             |
| recipient        | `r`   | string (base58) | Service agent's wallet address      |
| gateway          | `g`   | string (base58) | Tributary gateway authority         |
| amount           | `a`   | number          | Payment amount in smallest units    |
| autoRenew        | `ar`  | boolean         | Auto-renewal enabled?               |
| maxRenewals      | `mr`  | number/null     | Maximum renewal limit               |
| paymentFrequency | `pf`  | string          | daily/weekly/monthly/annually       |
| startTime        | `st`  | number/null     | Unix timestamp or null              |
| trackingId       | `tid` | string          | Unique tracking identifier          |
| lineItems        | `li`  | array           | JSON string of service descriptions |

### Encoding/Decoding

**Encode (service agent):**

```typescript
const jsonString = JSON.stringify(data);
const base64 = Buffer.from(jsonString).toString("base64");
const urlSafe = base64
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=/g, "");
```

**Decode (Lando page):**

```typescript
const padding = encoded.length % 4;
const base64 = encoded + "=".repeat(padding === 0 ? 0 : 4 - padding);
const standardBase64 = base64.replace(/-/g, "+").replace(/_/g, "/");
const jsonString = Buffer.from(standardBase64, "base64").toString("utf8");
return JSON.parse(jsonString);
```

---

## Pages

### Landing Page (`/`)

Explains Lando to service agents.

### Subscription Page (`/subscribe/:data`)

Decodes URL and displays:

- Subscription details (line items, amount, frequency, recipient)
- Custom Tributary SKILL.md with exact SDK commands
- Step-by-step payment instructions

---

## Tech Stack

- **Framework:** Vite + React 19 + TypeScript
- **Styling:** Tailwind CSS
- **Tributary SDK:** `@tributary-so/sdk`
- **Program ID:** `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`
- **USDC Mint:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

---

## Development

```bash
cd ~/projects/tributary/apps/lando
npm install
npm run dev    # http://localhost:5173/
npm run build
npm run preview
```

---

## Files

- `src/App.tsx` - Main app with routes
- `src/components/Landing.tsx` - Landing page
- `src/components/SubscriptionPage.tsx` - Subscription decoder + skill display
- `src/lib/encoding.ts` - Base64URL encode/decode
- `src/lib/validation.ts` - Parameter validation
- `src/lib/tributary.ts` - Tributary SDK helpers
