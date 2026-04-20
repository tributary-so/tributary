# **Smart Contracts** (`programs/tributary/`)

- **Program Config:** Global protocol configuration with protocol fees and emergency controls
- **Payment Gateway:** Business-specific payment processing with configurable fees and signer authority
- **User Payment:** Individual user payment setups tracking active policies per token
- **Payment Policy:** Flexible payment rule definitions supporting multiple policy types
- **Automatic Execution:** Trustless payment processing using Solana's token delegation

## **Token Delegation & SPL Integration**

Tributary leverages Solana's native SPL Token delegation for secure, automated payments without fund lock-up. Users approve spending authority once via the SPL Token contract, enabling the protocol to withdraw specific amounts on schedule. Unlike Ethereum's complex approval flows, this provides true automation while keeping funds in user wallets.

**Approval Flow:**

1. User delegates authority to Tributary's program-derived addresses (PDAs)
2. Smart contract verifies delegation scope (amount, time limits)
3. Payments execute automatically from user's token account
4. Users retain full custody and can revoke delegation anytime

## **Extensible Policy Types**

Tributary is designed for extensibility beyond subscriptions. The `PolicyType` enum in `state/mod.rs` supports current and future payment schemes:

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PolicyType {
    Subscription {
        amount: u64,
        auto_renew: bool,
        max_renewals: Option<u32>,
        payment_frequency: PaymentFrequency,
        next_payment_due: i64,
        padding: [u8; 97],
    },
    Milestone {
        milestone_amounts: [u64; 4],         // Amount for each milestone
        milestone_timestamps: [i64; 4],      // Absolute timestamps for each milestone
        current_milestone: u8,               // Which milestone is next (0-3)
        release_condition: u8,               // 0=time-based, 1=manual approval, 2=automatic
        total_milestones: u8,                // How many milestones are configured (1-4)
        escrow_amount: u64,                  // Total amount held in escrow
        padding: [u8; 53],                   // Padding for 128-byte alignment
    },
    PayAsYouGo {
        max_amount_per_period: u64,          // Total amount allowed per period
        max_chunk_amount: u64,               // Max amount provider can claim in one go
        period_length_seconds: u64,          // Length of each period in seconds
        current_period_start: i64,           // When current period started (unix timestamp)
        current_period_total: u64,           // Amount claimed in current period so far
        padding: [u8; 88],                   // Padding for 128-byte alignment
    },
}
```

Each variant is exactly 128 bytes for consistent account sizing, enabling seamless upgrades without breaking existing policies.

## Supported Payment Types

| Type              | Description                                      | Docs                                              |
| ----------------- | ------------------------------------------------ | ------------------------------------------------- |
| **Subscription**  | Fixed recurring payments at regular intervals    | [Subscription Payments](policies/subscription.md) |
| **Milestone**     | Project-based payments with up to 4 deliverables | [Milestone Payments](policies/milestone.md)       |
| **Pay-as-you-go** | Usage-based billing with period limits           | [Pay-as-you-go Payments](policies/payasyougo.md)  |

Each type is implemented as a variant of the `PolicyType` enum (128 bytes each for consistent account sizing). See the individual policy docs for fields, configuration, and use cases.
