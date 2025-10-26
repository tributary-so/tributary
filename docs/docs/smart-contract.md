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
    // Future variants like:
    // OneTime { amount: u64, due_date: i64, ... },
    // Milestone { milestones: [u64; 8], intervals: [u64; 8], ... },
}
```

Each variant is exactly 128 bytes for consistent account sizing, enabling seamless upgrades without breaking existing policies. This allows implementing:

- **Installments:** Scheduled partial payments (e.g., buy-now-pay-later)
- **Milestones:** Variable amounts based on project completion
- **Usage-based:** Payments tied to consumption metrics
- **Donations:** Ongoing creator support with flexible terms
