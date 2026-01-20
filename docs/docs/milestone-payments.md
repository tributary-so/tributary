# Milestone Payments

Milestone payments enable project-based compensation where payments are released as work deliverables are completed. Unlike subscriptions with fixed recurring amounts, milestones allow for variable payment amounts tied to specific project phases or deliverables.

## Overview

Milestone payments are ideal for:

- **Freelance projects** with multiple deliverables
- **Software development** contracts with phased delivery
- **Consulting engagements** with milestone-based progress
- **Content creation** with episode/release-based payments
- **Any project** where payment should follow completion, not time

## Key Features

- **Up to 4 milestones** per payment policy
- **Flexible release conditions**: time-based, manual approval, or automatic
- **Variable amounts** per milestone
- **Absolute timestamps** for predictable scheduling
- **Progress tracking** with current milestone status
- **Escrow mechanism** ensuring funds are available when due

## Creating Milestone Payments

### Basic Example

```typescript
import { Tributary } from "@tributary-so/sdk";
import { BN } from "@coral-xyz/anchor";

// Initialize SDK
const sdk = new Tributary(connection, wallet);

// Define project milestones
const milestoneAmounts = [
  new BN(100000000), // $100 - Project planning & design
  new BN(200000000), // $200 - Core development
  new BN(150000000), // $150 - Testing & deployment
  new BN(50000000), // $50 - Post-launch support
];

const currentTime = Math.floor(Date.now() / 1000);
const milestoneTimestamps = [
  new BN(currentTime + 86400 * 7), // 1 week: Planning complete
  new BN(currentTime + 86400 * 21), // 3 weeks: Development complete
  new BN(currentTime + 86400 * 35), // 5 weeks: Testing complete
  new BN(currentTime + 86400 * 49), // 7 weeks: Support period complete
];

// Create milestone payment policy
const instructions = await sdk.createMilestonePaymentPolicy(
  tokenMint, // Token to pay with (e.g., USDC)
  recipient, // Who receives the payments
  gateway, // Payment gateway for processing
  milestoneAmounts, // Array of payment amounts
  milestoneTimestamps, // When each milestone is payable
  0, // Release condition: 0=time-based
  [] // Memo (empty for this example)
);

// Execute the transaction
const tx = new Transaction().add(...instructions);
const signature = await provider.sendAndConfirm(tx);
```

### Release Conditions

Milestone payments use a **bitmap** to configure release conditions. This allows flexible combinations of time-based and authorization requirements.

### Bitmap Format

The `release_condition` field is an 8-bit value where each bit represents a different requirement:

| Bit | Value | Constant            | Description                             |
| --- | ----- | ------------------- | --------------------------------------- |
| 0   | 1     | `RELEASE_DUE_DATE`  | Due date must be reached before release |
| 1   | 2     | `RELEASE_GATEWAY`   | Gateway authority must sign             |
| 2   | 4     | `RELEASE_OWNER`     | Policy owner must sign                  |
| 3   | 8     | `RELEASE_RECIPIENT` | Recipient must sign                     |

**Important:** Bits 1-3 are **mutually exclusive** - at most one of these signer requirements can be set. A value of 0 means no restrictions.

### Common Combinations

| Value | Binary | Due Date | Signer    | Behavior                          |
| ----- | ------ | -------- | --------- | --------------------------------- |
| 0     | 0b0000 | ❌       | None      | Anyone can trigger anytime        |
| 1     | 0b0001 | ✅       | None      | Anyone can trigger after due date |
| 2     | 0b0010 | ❌       | Gateway   | Gateway authority must sign       |
| 3     | 0b0011 | ✅       | Gateway   | Gateway authority + due date      |
| 4     | 0b0100 | ❌       | Owner     | Policy owner must sign            |
| 5     | 0b0101 | ✅       | Owner     | Policy owner + due date           |
| 8     | 0b1000 | ❌       | Recipient | Recipient must sign               |
| 9     | 0b1001 | ✅       | Recipient | Recipient + due date              |

## How It Works

### 1. Policy Creation

- User creates milestone payment policy with amounts and timestamps
- Total escrow amount is calculated and delegated to the protocol
- Funds remain in user's wallet but are approved for spending

### 2. Milestone Execution

- When a milestone timestamp is reached (or manually approved)
- Protocol transfers the milestone amount to the recipient
- Progress advances to the next milestone
- Process repeats until all milestones are complete

### 3. Completion

- After the final milestone is paid, the policy is automatically paused
- Any remaining escrow can be reclaimed by adjusting approvals

## Smart Contract Details

### PolicyType::Milestone Structure

```rust
Milestone {
    milestone_amounts: [u64; 4],         // Amount for each milestone
    milestone_timestamps: [i64; 4],      // Absolute timestamps
    current_milestone: u8,               // Next milestone to process (0-3)
    release_condition: u8,               // Bitmap: bit0=check due date, bits1-3=signer
    total_milestones: u8,                // How many milestones (1-4)
    escrow_amount: u64,                  // Total amount escrowed
    padding: [u8; 53],                   // 128-byte alignment
}
```

### Bitmap Constants

```rust
pub const RELEASE_DUE_DATE: u8 = 0b0001;   // Bit 0: Check due date before release
pub const RELEASE_GATEWAY: u8 = 0b0010;    // Bit 1: Gateway authority must sign
pub const RELEASE_OWNER: u8 = 0b0100;      // Bit 2: Policy owner must sign
pub const RELEASE_RECIPIENT: u8 = 0b1000;  // Bit 3: Recipient must sign
```

### Execution Logic

Milestone payments follow this execution flow:

1. **Validate timing/approval** based on release condition bitmap
2. **Calculate payment amount** from current milestone
3. **Transfer funds** from user to recipient
4. **Update progress** (increment current_milestone)
5. **Check completion** (pause if all milestones done)

## Best Practices

### For Project Owners (Recipients)

1. **Set realistic timelines** - Allow buffer time for unexpected delays
2. **Use clear milestone definitions** - Make completion criteria unambiguous
3. **Consider manual approval** for quality assurance on critical deliverables
4. **Communicate progress** to keep payers informed

### For Clients (Payers)

1. **Review milestone definitions** carefully before approving
2. **Monitor progress** and communicate any concerns early
3. **Understand escrow amounts** - total funds needed upfront
4. **Plan for tax implications** of milestone-based payments

### For Developers

1. **Use descriptive memos** to identify specific milestones
2. **Test with small amounts** on devnet first
3. **Handle timezone considerations** for timestamp accuracy
4. **Monitor policy status** to track payment progress

## Example Use Cases

### Freelance Web Development

```typescript
// 4-week web development project
const milestones = [
  new BN(50000000), // Week 1: Design & planning ($50)
  new BN(100000000), // Week 2: Frontend development ($100)
  new BN(100000000), // Week 3: Backend integration ($100)
  new BN(50000000), // Week 4: Testing & deployment ($50)
];

const timestamps = [
  new BN(startTime + 86400 * 7), // End of week 1
  new BN(startTime + 86400 * 14), // End of week 2
  new BN(startTime + 86400 * 21), // End of week 3
  new BN(startTime + 86400 * 28), // End of week 4
];
```

### Content Creation Series

```typescript
// 10-episode podcast series
const episodePayments = Array(10).fill(new BN(10000000)); // $10 per episode
const episodeTimestamps = Array.from(
  { length: 10 },
  (_, i) => new BN(startTime + 86400 * 7 * (i + 1)) // Weekly releases
);
```

### Consulting Retainer

```typescript
// Monthly consulting with deliverables
const monthlyMilestones = [
  new BN(500000000), // Month 1: Strategy & planning ($500)
  new BN(400000000), // Month 2: Implementation ($400)
  new BN(300000000), // Month 3: Optimization ($300)
];

const monthlyTimestamps = [
  new BN(startTime + 86400 * 30), // End of month 1
  new BN(startTime + 86400 * 60), // End of month 2
  new BN(startTime + 86400 * 90), // End of month 3
];
```

## Integration with Existing Systems

Milestone payments integrate seamlessly with Tributary's existing infrastructure:

- **Same approval mechanism** as subscriptions
- **Compatible with all gateways** and fee structures
- **Uses existing PDA structure** for accounts
- **Supports all token types** via SPL integration
- **Query APIs work identically** for milestone policies

## Monitoring & Management

### Querying Milestone Status

```typescript
// Get milestone policy details
const policy = await sdk.getPaymentPolicy(policyPda);
console.log("Current milestone:", policy.policyType.milestone.currentMilestone);
console.log("Total milestones:", policy.policyType.milestone.totalMilestones);
console.log("Escrow amount:", policy.policyType.milestone.escrowAmount);

// Check if next milestone is due
const nextMilestoneTime =
  policy.policyType.milestone.milestoneTimestamps[
    policy.policyType.milestone.currentMilestone
  ];
const isDue = Date.now() / 1000 >= nextMilestoneTime.toNumber();
```

### Manual Milestone Execution

For manual approval milestones, execute payments as needed:

```typescript
// Execute next milestone manually
const executeInstructions = await sdk.executePayment(
  policyPda,
  recipient,
  tokenMint,
  gateway
);

const tx = new Transaction().add(...executeInstructions);
await provider.sendAndConfirm(tx);
```

Milestone payments provide a powerful, flexible alternative to traditional subscriptions, enabling trust-minimized project-based compensation on Solana.
