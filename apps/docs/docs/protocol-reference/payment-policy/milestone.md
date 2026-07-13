# Milestone Payments

Project-based payments released as deliverables are completed — for freelancers, dev shops, consultants, and any work that should be paid on completion, not on a clock.

## Overview

Milestone policies define **up to 4 payment stages**, each with its own amount and due timestamp. Payments release when conditions are met (time-based, manual approval, or automatic). The total escrow amount is delegated upfront, but funds stay in the user's wallet until each milestone executes.

```
User creates policy  -->  Delegates total escrow amount
                              |
       +----------+-----------+-----------+
       |          |           |           |
   Milestone 1  Milestone 2  Milestone 3  Milestone 4
   $50 (Week 1) $100 (Week 2) $100 (Week 3) $50 (Week 4)
   Design        Frontend      Backend       Deploy
```

## When to Use

| Good For                                     | Not Ideal For                    |
| -------------------------------------------- | -------------------------------- |
| Freelance projects with deliverables         | Predictable recurring billing    |
| Software development (phased delivery)       | High-frequency micro-payments    |
| Consulting engagements (deliverable-based)   | Ongoing services with fixed cost |
| Content creation (episode/release-based)     | Variable usage patterns          |
| Any project where payment follows completion | Simple monthly subscriptions     |
| Escrow-style agreements                      |                                  |

## On-Chain Specification

```rust
PolicyType::Milestone {
    milestone_amounts: [u64; 4],     // Amount for each milestone (lamports)
    milestone_timestamps: [i64; 4],  // Absolute timestamps for each milestone
    current_milestone: u8,           // Next milestone to process (0-3)
    release_condition: u8,           // Bitmap: release requirements
    total_milestones: u8,            // How many milestones configured (1-4)
    escrow_amount: u64,              // Total amount escrowed (sum of all milestones)
    padding: [u8; 53],               // 128-byte alignment
}
```

### Release Condition Bitmap

The `release_condition` field is an 8-bit bitmap where each bit controls a requirement:

| Bit | Value        | Constant            | Description                    |
| --- | ------------ | ------------------- | ------------------------------ |
| 0   | `0b0001` (1) | `RELEASE_DUE_DATE`  | Timestamp must be reached      |
| 1   | `0b0010` (2) | `RELEASE_GATEWAY`   | Gateway authority must sign    |
| 2   | `0b0100` (4) | `RELEASE_OWNER`     | Policy owner (payer) must sign |
| 3   | `0b1000` (8) | `RELEASE_RECIPIENT` | Recipient must sign            |

**Important**: Bits 1-3 are **mutually exclusive** — at most one signer requirement can be set. A value of `0` means no restrictions (anyone can trigger anytime).

### Common Release Conditions

| Value | Binary   | Due Date? | Signer Required | Behavior                          |
| ----- | -------- | --------- | --------------- | --------------------------------- |
| 0     | `0b0000` | No        | None            | Anyone can trigger anytime        |
| 1     | `0b0001` | Yes       | None            | Anyone can trigger after due date |
| 2     | `0b0010` | No        | Gateway         | Gateway must sign                 |
| 3     | `0b0011` | Yes       | Gateway         | Gateway signs + due date passed   |
| 4     | `0b0100` | No        | Owner           | Payer must approve                |
| 5     | `0b0101` | Yes       | Owner           | Payer approves + due date passed  |
| 8     | `0b1000` | No        | Recipient       | Recipient must claim              |
| 9     | `0b1001` | Yes       | Recipient       | Recipient claims after due date   |

### Account Size

Each `Milestone` variant is exactly **128 bytes**, consistent with all other policy types.

## Creating a Milestone Payment

### Basic Example — Freelance Project

```typescript
import { Tributary } from "@tributary-so/sdk";
import { BN } from "@coral-xyz/anchor";
import { createMemoBuffer } from "@tributary-so/sdk";
import { PublicKey, Transaction } from "@solana/web3.js";

const sdk = new Tributary(connection, wallet);

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const recipient = new PublicKey("BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq");
const gateway = new PublicKey("6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4");

const now = Math.floor(Date.now() / 1000);

const milestoneAmounts = [
  new BN(50_000_000), // $50 - Design & planning
  new BN(100_000_000), // $100 - Frontend development
  new BN(100_000_000), // $100 - Backend integration
  new BN(50_000_000), // $50 - Testing & deployment
];

const milestoneTimestamps = [
  new BN(now + 86400 * 7), // Week 1: Design done
  new BN(now + 86400 * 14), // Week 2: Frontend done
  new BN(now + 86400 * 21), // Week 3: Backend done
  new BN(now + 86400 * 28), // Week 4: Deploy done
];

const instructions = await sdk.createMilestone(
  USDC_MINT,
  recipient,
  gateway,
  milestoneAmounts,
  milestoneTimestamps,
  1, // releaseCondition: time-based only (0b0001)
  createMemoBuffer("project_abc", 64)
);

const tx = new Transaction().add(...instructions);
const signature = await sendAndConfirm(connection, tx, [wallet.payer]);
```

### Manual Approval Required

```typescript
// Gateway must sign off on each milestone (quality gate)
const instructions = await sdk.createMilestone(
  USDC_MINT,
  recipient,
  gateway,
  milestoneAmounts,
  milestoneTimestamps,
  3, // 0b0011: due date + gateway signer required
  createMemoBuffer("consulting_q1", 64)
);
```

### Fewer than 4 Milestones

```typescript
// Only 2 milestones — SDK pads the rest with zeros
const instructions = await sdk.createMilestone(
  USDC_MINT,
  recipient,
  gateway,
  [new BN(200_000_000), new BN(300_000_000)], // $200 + $300
  [new BN(now + 86400 * 14), new BN(now + 86400 * 30)],
  1,
  createMemoBuffer("simple_project", 64)
);
```

## How It Works

### Payment Execution Flow

1. **Policy creation** — user creates policy, delegates the total escrow amount (sum of all milestones)
2. **Waiting** — `current_milestone` timestamp and/or signer condition not yet met
3. **Execution** — when conditions are met, anyone calls `execute_payment`
4. **Transfer** — the current milestone amount moves to recipient, minus fees
5. **Advance** — `current_milestone` increments
6. **Completion** — after the last milestone, the policy auto-pauses

### Release Condition Validation

The protocol checks the bitmap before executing:

1. If bit 0 is set (`RELEASE_DUE_DATE`): verify `now >= milestone_timestamps[current_milestone]`
2. If bit 1 is set (`RELEASE_GATEWAY`): verify gateway authority signed the transaction
3. If bit 2 is set (`RELEASE_OWNER`): verify the policy owner (payer) signed
4. If bit 3 is set (`RELEASE_RECIPIENT`): verify the recipient signed

If any required condition fails, the transaction reverts.

### Escrow Calculation

```typescript
const escrowAmount = milestoneAmounts.reduce(
  (sum, amount) => sum.add(amount),
  new BN(0)
);
// Total delegated = sum of all milestones
```

## Managing Milestone Payments

### Query Status

```typescript
const policy = await sdk.getPaymentPolicy(policyPda);
const ms = policy.policyType.milestone;

console.log("Current milestone:", ms.currentMilestone);
console.log("Total milestones:", ms.totalMilestones);
console.log("Escrow amount:", ms.escrowAmount.toString());
console.log("Release condition:", ms.releaseCondition);

// Check if next milestone is due
const nextAmount = ms.milestoneAmounts[ms.currentMilestone];
const nextTime = ms.milestoneTimestamps[ms.currentMilestone];
const isDue = Date.now() / 1000 >= nextTime.toNumber();

console.log(
  `Next: $${nextAmount.toString()} due ${new Date(nextTime.toNumber() * 1000)}`
);
```

### Execute a Milestone

```typescript
// For manual-approval milestones, the authorized signer submits:
const instructions = await sdk.executePayment(
  policyPda,
  recipient,
  tokenMint,
  gateway
);

const tx = new Transaction().add(...instructions);
await sendAndConfirm(connection, tx, [signer]);
```

### Pause / Cancel

```typescript
// Pause -- stops milestone execution
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { paused: {} });

// Resume
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { active: {} });

// Cancel -- deletes the policy, revokes delegation
await sdk.deletePaymentPolicy(tokenMint, policyId);
```

## Use Case Examples

### Consulting Engagement

```typescript
const monthlyMilestones = [
  new BN(500_000_000), // $500 - Month 1: Strategy
  new BN(400_000_000), // $400 - Month 2: Implementation
  new BN(300_000_000), // $300 - Month 3: Optimization
];

const monthlyTimestamps = [
  new BN(now + 86400 * 30),
  new BN(now + 86400 * 60),
  new BN(now + 86400 * 90),
];

// Owner must approve each release (quality gate)
await sdk.createMilestone(
  USDC_MINT,
  recipient,
  gateway,
  monthlyMilestones,
  monthlyTimestamps,
  5, // 0b0101: due date + owner approval
  createMemoBuffer("consulting_retainer", 64)
);
```

### Content Series with Auto-Release

```typescript
const episodePayments = [
  new BN(10_000_000), // $10 per episode
  new BN(10_000_000),
  new BN(10_000_000),
  new BN(10_000_000),
];

const episodeTimestamps = [
  new BN(now + 86400 * 7),
  new BN(now + 86400 * 14),
  new BN(now + 86400 * 21),
  new BN(now + 86400 * 28),
];

// Auto-release when due date passes
await sdk.createMilestone(
  USDC_MINT,
  recipient,
  gateway,
  episodePayments,
  episodeTimestamps,
  1, // 0b0001: time-based only
  createMemoBuffer("podcast_series", 64)
);
```

## Troubleshooting

| Error                   | Cause                              | Fix                                           |
| ----------------------- | ---------------------------------- | --------------------------------------------- |
| `PaymentNotDue`         | Milestone timestamp hasn't passed  | Wait for the scheduled time                   |
| `InvalidSigner`         | Required signer didn't sign the tx | Include the correct signer in the transaction |
| `InvalidAmount`         | Not applicable for milestones      | Milestone amounts are fixed at creation       |
| Milestone not advancing | Previous milestone not yet paid    | Execute current milestone first               |

## Comparison with Other Policy Types

|                       | Subscription       | Milestone              | Pay-as-you-go      | OneTime               | UpTo                     |
| --------------------- | ------------------ | ---------------------- | ------------------ | --------------------- | ------------------------ |
| **Amount**            | Fixed per period   | Variable per milestone | Variable per claim | Fixed, single fire    | Caller-supplied, ≤ max   |
| **Timing**            | Fixed schedule     | Event/timestamp based  | On-demand          | Scheduled / immediate | `[validAfter, deadline)` |
| **Fires**             | Recurring          | Up to 4 phases         | Many (within caps) | Exactly once          | Exactly once             |
| **Recipient trigger** | No                 | Per release_condition  | Yes                | No                    | Yes                      |
| **Best For**          | Recurring services | Project deliverables   | Variable usage     | Invoices, one-shots   | Usage-based one-shot     |
| **User Control**      | Set up once        | Approve per milestone  | Period limits      | Schedule + delete     | Authorize + window       |
