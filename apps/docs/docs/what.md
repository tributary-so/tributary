# What is Tributary?

Tributary is an **open-source protocol** that enables automated recurring payments on Solana. We provide the foundational infrastructure that businesses build upon to create payment services.

## The Protocol Layer

Tributary provides core building blocks:

### Smart Contracts

- **Automated Payment Execution** - Trustless recurring payments using Solana token delegation
- **Flexible Payment Policies** - Subscriptions, milestones, and pay-as-you-go
- **Fee Management** - 1% protocol fee + configurable gateway fees
- **Security & Transparency** - Open-source, auditable smart contracts

**Program ID:** `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`

### Developer Tools

| Tool           | Purpose                         |
| -------------- | ------------------------------- |
| TypeScript SDK | Complete protocol interaction   |
| React SDK      | Pre-built payment components    |
| Payments SDK   | Stripe-compatible checkout      |
| x402 SDK       | HTTP 402 middleware             |
| CLI            | Protocol management             |
| REST API       | Query subscriptions and events  |
| WebSocket API  | Real-time payment notifications |

## Payment Types

### 1. Subscriptions

Fixed recurring payments at regular intervals.

```rust
Subscription {
    amount: u64,                    // Fixed payment amount
    auto_renew: bool,               // Auto-renewal enabled
    max_renewals: Option<u32>,      // Maximum renewal limit
    payment_frequency: PaymentFrequency, // Daily/Weekly/Monthly/etc.
    next_payment_due: i64,          // Next payment timestamp
}
```

**Use cases:** SaaS subscriptions, memberships, recurring donations

### 2. Milestone Payments

Project-based compensation with up to 4 configurable milestones.

```rust
Milestone {
    milestone_amounts: [u64; 4],      // Amount per milestone
    milestone_timestamps: [i64; 4],   // When payable
    current_milestone: u8,            // Current milestone (0-3)
    release_condition: u8,            // 0=time, 1=manual, 2=automatic
    total_milestones: u8,             // Total milestones (1-4)
    escrow_amount: u64,               // Total in escrow
}
```

**Use cases:** Freelance projects, consulting, content creation

### 3. Pay-as-you-go

Usage-based billing with period limits.

```rust
PayAsYouGo {
    max_amount_per_period: u64,      // Max per billing period
    max_chunk_amount: u64,           // Max per claim
    period_length_seconds: u64,       // Billing period
    current_period_start: i64,        // Period start
    current_period_total: u64,        // Amount claimed this period
}
```

**Use cases:** API usage, AI agents, cloud resources

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT PROVIDERS                        │
│   User dashboards, onboarding, analytics, integrations     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRIBUTARY SDKs                           │
│   TypeScript │ React │ Payments │ x402 │ CLI               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 TRIBUTARY PROTOCOL                          │
│   ProgramConfig │ PaymentGateway │ UserPayment             │
│   PaymentPolicy │ PaymentsDelegate                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                        │
│   Non-custodial │ 400ms finality │ Sub-cent fees            │
└─────────────────────────────────────────────────────────────┘
```

## How Everyone Benefits

### For End Users

- **Simple Experience** - Sign once, payments flow automatically
- **Full Control** - Funds stay in wallet, cancel anytime
- **Transparency** - All payments visible on blockchain
- **No Lock-Up** - No deposits into smart contracts

### For Developers

- **Quick Integration** - Multiple SDK options
- **Zero API Keys** - Payments SDK works out of the box
- **Flexible** - Support any token, any schedule
- **Open Source** - MIT licensed, fully auditable

### For Businesses

- **Predictable Revenue** - Automated recurring payments
- **Lower Costs** - 1% protocol fee (vs 2.9% + 30¢)
- **Global Reach** - Borderless payments
- **Better UX** - Web2-familiar subscription experience

### For Payment Providers

- **Revenue Opportunities** - Earn fees on payment volume
- **Technical Foundation** - Build on proven protocol
- **Market Differentiation** - Create unique experiences
- **Developer Tools** - Focus on UX, not protocol complexity

## Key Differentiators

| Feature     | Tributary       | Traditional    |
| ----------- | --------------- | -------------- |
| Setup       | Seconds         | Days (KYC)     |
| Fees        | 1%              | 2.9% + 30¢     |
| Settlement  | Instant         | 2-7 days       |
| Chargebacks | No              | Yes            |
| Custody     | Non-custodial   | Custodial risk |
| Recurring   | Native          | Complex        |
| Global      | No restrictions | Country limits |

## Getting Started

1. **Choose Integration** - [SDK](../sdks.md), [Checkout](../quickstart/checkout.md), or [React Button](../quickstart/button.md)
2. **Generate Checkout** - Create payment URLs in seconds
3. **Monitor Payments** - Use [REST API](../api/overview.md) or WebSockets
4. **Build Your Service** - Create payment provider on top of Tributary

## Resources

- **Documentation**: [docs.tributary.so](https://docs.tributary.so)
- **GitHub**: [github.com/tributary-so/tributary](https://github.com/tributary-so/tributary)
- **Checkout**: [checkout.tributary.so](https://checkout.tributary.so)
- **Website**: [tributary.so](https://tributary.so)

Tributary provides the foundation. You build the future.
