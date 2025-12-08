# **Smart Contracts** (`programs/recurring_payments/`)

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
}
```

Each variant is exactly 128 bytes for consistent account sizing, enabling seamless upgrades without breaking existing policies.

## Supported Payment Types

### Subscriptions

Recurring payments at fixed intervals (daily, weekly, monthly, etc.) with optional auto-renewal and maximum renewal limits.

### Milestones

Project-based payments with up to 4 configurable milestones. Each milestone has:

- **Amount:** Specific payment amount for that milestone
- **Timestamp:** When the milestone becomes payable
- **Release Conditions:** Time-based, manual approval, or automatic
- **Progress Tracking:** Current milestone and completion status

Perfect for:

- **Freelance work:** Pay as project phases complete
- **Development contracts:** Milestone-based software delivery
- **Consulting engagements:** Deliverable-based compensation
- **Content creation:** Episode/release-based payments

## Future Payment Types

The extensible design allows for additional payment schemes:

- **Installments:** Scheduled partial payments (buy-now-pay-later)
- **Usage-based:** Payments tied to consumption metrics
- **Revenue sharing:** Percentage-based payments from revenue
- **Escrow services:** Conditional fund releases
