# Payment Buttons

Pre-built button components for each payment type. Render them, pass props, done.

## SubscriptionButton

```tsx
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";
import { PublicKey, BN } from "@solana/web3.js";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const RECIPIENT = new PublicKey("YOUR_RECIPIENT_WALLET");
const GATEWAY = new PublicKey("CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr");

<SubscriptionButton
  amount={new BN(10_000_000)} // 10 USDC (6 decimals)
  token={USDC_MINT}
  recipient={RECIPIENT}
  gateway={GATEWAY}
  interval={PaymentInterval.Monthly}
  maxRenewals={12}
  memo="Pro subscription"
  executeImmediately={true}
  fetchToken={true}
  tokenIssuerConfig={{
    apiBaseUrl: "https://api.tributary.so",
    trackingId: "your-tracking-id",
  }}
  label="Subscribe $10/month"
  radius="lg"
  size="lg"
  onSuccess={(result) => console.log("Success:", result.txId)}
  onError={(err) => console.error("Failed:", err)}
/>;
```

### SubscriptionButton Props

| Prop                 | Type               | Required | Description                                                                         |
| -------------------- | ------------------ | -------- | ----------------------------------------------------------------------------------- |
| `amount`             | `BN`               | Yes      | Payment amount in smallest token units (USDC: 6 decimals)                           |
| `token`              | `PublicKey`        | Yes      | Token mint address                                                                  |
| `recipient`          | `PublicKey`        | Yes      | Recipient wallet address                                                            |
| `gateway`            | `PublicKey`        | Yes      | Payment gateway address                                                             |
| `interval`           | `PaymentInterval`  | Yes      | Payment frequency                                                                   |
| `custom_interval`    | `number`           | No       | Custom interval in seconds (required if interval is Custom)                         |
| `maxRenewals`        | `number`           | No       | Maximum renewals (null = unlimited)                                                 |
| `memo`               | `string`           | No       | Payment memo                                                                        |
| `startTime`          | `Date`             | No       | Start date (null = now)                                                             |
| `approvalAmount`     | `BN`               | No       | Token approval amount                                                               |
| `executeImmediately` | `boolean`          | No       | Execute first payment now (default: true)                                           |
| `fetchToken`         | `boolean`          | No       | Fetch token info from issuer API before creating subscription (default: false)      |
| `tokenIssuerConfig`  | `object`           | No       | Token issuer config: `{ apiBaseUrl: string, trackingId?: string }`                  |
| `label`              | `string`           | No       | Button text (default: "Subscribe")                                                  |
| `className`          | `string`           | No       | CSS classes                                                                         |
| `disabled`           | `boolean`          | No       | Disable button                                                                      |
| `radius`             | `string`           | No       | Button radius: `"none"` \| `"sm"` \| `"md"` \| `"lg"` \| `"full"` (default: "none") |
| `size`               | `string`           | No       | Button size: `"sm"` \| `"md"` \| `"lg"` (default: "lg")                             |
| `onSuccess`          | `(result) => void` | No       | Success callback with `{ txId, instructions }`                                      |
| `onError`            | `(error) => void`  | No       | Error callback                                                                      |

## MilestoneButton

```tsx
import { MilestoneButton } from "@tributary-so/sdk-react";
import { PublicKey, BN } from "@coral-xyz/anchor";

<MilestoneButton
  milestoneAmounts={[new BN(5_000_000), new BN(5_000_000), new BN(10_000_000)]}
  milestoneTimestamps={[
    new BN(1717200000),
    new BN(1719792000),
    new BN(1722470400),
  ]}
  releaseCondition={0}
  token={USDC_MINT}
  recipient={RECIPIENT}
  gateway={GATEWAY}
  label="Start Project"
  onSuccess={(result) => console.log("Milestone created:", result.txId)}
/>;
```

### MilestoneButton Props

| Prop                  | Type               | Required | Description                                        |
| --------------------- | ------------------ | -------- | -------------------------------------------------- |
| `milestoneAmounts`    | `BN[]`             | Yes      | Payment amount per milestone (up to 4)             |
| `milestoneTimestamps` | `BN[]`             | Yes      | Unix timestamps for each milestone                 |
| `releaseCondition`    | `number`           | Yes      | 0 = time-based, 1 = manual approval, 2 = automatic |
| `token`               | `PublicKey`        | Yes      | Token mint address                                 |
| `recipient`           | `PublicKey`        | Yes      | Recipient wallet address                           |
| `gateway`             | `PublicKey`        | Yes      | Payment gateway address                            |
| `memo`                | `string`           | No       | Payment memo                                       |
| `approvalAmount`      | `BN`               | No       | Token approval amount                              |
| `executeImmediately`  | `boolean`          | No       | Execute first milestone now (default: true)        |
| `label`               | `string`           | No       | Button text (default: "Create Milestone Payment")  |
| `className`           | `string`           | No       | CSS classes                                        |
| `disabled`            | `boolean`          | No       | Disable button                                     |
| `onSuccess`           | `(result) => void` | No       | Success callback with `{ txId, instructions }`     |
| `onError`             | `(error) => void`  | No       | Error callback                                     |

## PayAsYouGoButton

```tsx
import { PayAsYouGoButton } from "@tributary-so/sdk-react";
import { PublicKey, BN } from "@coral-xyz/anchor";

<PayAsYouGoButton
  maxAmountPerPeriod={new BN(50_000_000)}
  maxChunkAmount={new BN(1_000_000)}
  periodLengthSeconds={new BN(86400)}
  token={USDC_MINT}
  recipient={RECIPIENT}
  gateway={GATEWAY}
  label="Enable Pay-as-you-go"
  onSuccess={(result) => console.log("Created:", result.txId)}
/>;
```

### PayAsYouGoButton Props

| Prop                  | Type               | Required | Description                                    |
| --------------------- | ------------------ | -------- | ---------------------------------------------- |
| `maxAmountPerPeriod`  | `BN`               | Yes      | Spending cap per billing period                |
| `maxChunkAmount`      | `BN`               | Yes      | Maximum per individual claim                   |
| `periodLengthSeconds` | `BN`               | Yes      | Period duration in seconds                     |
| `token`               | `PublicKey`        | Yes      | Token mint address                             |
| `recipient`           | `PublicKey`        | Yes      | Recipient wallet address                       |
| `gateway`             | `PublicKey`        | Yes      | Payment gateway address                        |
| `memo`                | `string`           | No       | Payment memo                                   |
| `approvalAmount`      | `BN`               | No       | Token approval amount                          |
| `label`               | `string`           | No       | Button text (default: "Create Pay-as-you-go")  |
| `className`           | `string`           | No       | CSS classes                                    |
| `disabled`            | `boolean`          | No       | Disable button                                 |
| `onSuccess`           | `(result) => void` | No       | Success callback with `{ txId, instructions }` |
| `onError`             | `(error) => void`  | No       | Error callback                                 |

## Payment Intervals

Used by `SubscriptionButton`:

```typescript
enum PaymentInterval {
  Daily = "daily",
  Weekly = "weekly",
  Monthly = "monthly",
  Quarterly = "quarterly",
  SemiAnnually = "semiAnnually",
  Annually = "annually",
  Custom = "custom",
}
```

Custom interval example:

```tsx
<SubscriptionButton
  interval={PaymentInterval.Custom}
  custom_interval={604800} // 7 days in seconds
  // ... other props
/>
```
