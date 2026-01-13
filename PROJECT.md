# Tributary.so Project Summary

## Overview

Tributary is a comprehensive payment protocol on Solana that enables automated recurring payments through token delegation. Users approve payments once, and the protocol handles execution automatically without fund lock-up. The protocol provides foundational infrastructure that payment providers build upon to create user-facing payment services across three distinct payment models: Subscriptions, Milestone Payments, and Pay-as-you-go.

## Core Technology

- **Protocol**: Smart contract-based recurring payments using SPL token delegation
- **Network**: Native Solana integration with sub-cent fees and 400ms settlement
- **Security**: Non-custodial - funds remain in user wallets until payment execution
- **UX**: One-click setup via token delegation, eliminating repetitive approvals
- **Program ID**: `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`
- **Action Codes**: One-time payment codes enabling wallet-less payment initiation

## Key Features

- **Automated Execution**: Payments execute automatically on schedule without user intervention
- **Full Control**: Users can pause, resume, or cancel subscriptions anytime
- **Protocol Design**: One smart contract enabling unlimited businesses on top
- **Fee Structure**: 1% protocol fee + configurable gateway fees (up to 10%)
- **Integration**: x402 HTTP 402 support for deferred micropayments
- **Action Codes**: Generate one-time payment codes for wallet-less transactions
- **Multiple Payment Types**: Subscriptions, Milestones, and Pay-as-you-go models

## Development Status

- **MVP**: 100% complete, built in 3 weeks for Colosseum Hackathon
- **Live Networks**: Devnet and Mainnet deployment
- **SDK Packages**: TypeScript SDK, React components, CLI manager
- **Demo Flows**: Create, pause, resume, delete subscriptions
- **Security**: Audit completed (Ottersec/Neodyme)
- **CI/CD**: Full test coverage with GitHub Actions pipelines
- **Payment Types**: Three payment models fully implemented and tested

## Testing & Quality Assurance

Tributary maintains comprehensive test coverage across all components:

### GitHub Actions CI/CD Pipeline

- **Smart Contract Tests**: Full Anchor test suite covering all payment types
- **SDK Tests**: TypeScript integration tests for all SDK functionality
- **React Component Tests**: Component testing for payment UI elements
- **E2E Tests**: End-to-end payment flow validation
- **Security Tests**: Automated security scanning and vulnerability detection
- **Performance Tests**: Load testing for high-volume payment scenarios

### Test Coverage Areas

- **Program Instructions**: All 5 core instructions thoroughly tested
- **Payment Types**: Subscriptions, Milestones, and Pay-as-you-go validation
- **Edge Cases**: Error handling, boundary conditions, and failure scenarios
- **Integration**: Cross-component interaction testing
- **Security**: Delegation validation, permission checks, and fund safety

### Quality Metrics

- **Code Coverage**: >95% across all critical paths
- **Test Automation**: 100% automated testing pipeline
- **Security Audits**: Regular third-party security assessments
- **Performance**: Sub-second transaction processing guaranteed

## Smart Contracts

The protocol consists of five main programs in `programs/recurring_payments/src/`:

### Program Config

Global protocol configuration with protocol fees and emergency controls.

### Payment Gateway

Business-specific payment processing with configurable fees and signer authority.

### User Payment

Individual user payment setups tracking active policies per token.

### Payment Policy

Flexible payment rule definitions supporting multiple policy types.

### Automatic Execution

Trustless payment processing using Solana's token delegation.

## Token Delegation & SPL Integration

Tributary leverages Solana's native SPL Token delegation for secure, automated payments:

**Approval Flow:**

1. User delegates authority to Tributary's PDAs for specific amounts and schedules
2. Smart contract verifies delegation scope (amount, time limits)
3. Payments execute automatically from user's token account
4. Users retain full custody and can revoke delegation anytime

**Extensible Policy Types:**

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

## Technical Architecture

```
User → Create UserPayment (owner/mint)
    → Create PaymentGateway (authority/signer)
    → Create PaymentPolicy (user_payment/recipient/gateway)
    → Approve Delegate (token account delegation)
    → Execute Payment (permissionless, by gateway signer)
       → Transfer to recipient + fees
```

**PDAs:**

- ProgramConfig: Protocol settings and fees
- PaymentGateway: Gateway configuration and fees
- UserPayment: User stats across policies
- PaymentPolicy: Individual subscription details
- PaymentsDelegate: Delegation authority

## SDK & Integration

### TypeScript SDK (`sdk/`)

Complete protocol interaction library with Anchor integration:

- Payment management functions (create, execute, pause/resume policies)
- PDA helpers for deterministic addresses
- Token delegation utilities for SPL integration
- Error handling, validation, and payment frequency mapping

```typescript
const instructions = await sdk.createSubscriptionInstruction(
  params.token,
  params.recipient,
  params.gateway,
  params.amount,
  false,
  null,
  createPaymentFrequency(params.interval),
  createMemoBuffer(params.memo || "", 64),
  params.startTime,
  params.approvalAmount,
  params.executeImmediately ?? true
);
```

### React SDK (`sdk-react/`)

Pre-built payment components:

```typescript
import { SubscriptionButton, PaymentInterval } from "@tributary-so/sdk-react";
<SubscriptionButton
  amount={new BN("10000000")}
  token={new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")}
  recipient={recipient}
  gateway={gateway}
  interval={PaymentInterval.Weekly}
  maxRenewals={12}
  memo={`Monthly donation to ${repository}`}
  label="Donate $10/month"
/>;
```

### Integration Examples

**Basic Payment Button:**

```typescript
<SubscriptionButton
  amount={new BN(10_000_000)}
  token={USDC_MINT}
  recipient={merchantWallet}
  interval={PaymentInterval.Monthly}
  label="Subscribe for $10/month"
/>
```

**Advanced Provider Integration:**

```typescript
class PaymentProvider {
  constructor(config) {
    this.tributary = new Tributary(config);
    this.database = new Database(config.db);
    this.webhooks = new WebhookService(config.webhooks);
  }

  async setupSubscription(user, plan) {
    const policy = await this.tributary.createPaymentPolicy({
      amount: plan.amount,
      interval: plan.interval,
      recipient: plan.recipient,
    });

    await this.database.saveSubscription({
      userId: user.id,
      policyId: policy.id,
      plan: plan,
      status: "active",
    });

    await this.webhooks.register({
      policyId: policy.id,
      events: ["payment.success", "payment.failed"],
      url: `${this.config.baseUrl}/webhooks/payments`,
    });

    return policy;
  }
}
```

## Payment Types

Tributary supports three distinct payment models, each optimized for different use cases:

### 1. Subscriptions

Fixed recurring payments at regular intervals (daily, weekly, monthly, etc.) with optional auto-renewal and maximum renewal limits.

**Characteristics:**

- **Predictable**: Fixed amounts at regular intervals
- **Automated**: Executes without user intervention after setup
- **Flexible Intervals**: Daily, weekly, monthly, quarterly, yearly
- **Renewal Control**: Auto-renew with limits or manual renewal
- **Simple Setup**: One-time approval for ongoing payments

**Use Cases:**

- SaaS platforms with monthly billing
- Content subscriptions (streaming, newsletters)
- Membership dues and recurring donations
- API access with fixed monthly fees
- Software licenses and maintenance contracts

**Technical Details:**

```rust
Subscription {
    amount: u64,                    // Fixed payment amount
    auto_renew: bool,               // Auto-renewal enabled
    max_renewals: Option<u32>,      // Maximum renewal limit
    payment_frequency: PaymentFrequency, // Daily/Weekly/Monthly/etc.
    next_payment_due: i64,          // Unix timestamp for next payment
}
```

### 2. Milestone Payments

Project-based compensation with up to 4 configurable milestones. Each milestone has specific amounts, timestamps, and release conditions (time-based, manual approval, or automatic).

**Characteristics:**

- **Event-driven**: Payments tied to deliverable completion
- **Variable Amounts**: Different amounts per milestone
- **Progress Tracking**: Clear visibility into project status
- **Release Control**: Time-based, manual, or automatic release
- **Escrow Security**: Total amount approved upfront

**Use Cases:**

- Freelance projects with phased deliverables
- Software development contracts
- Consulting engagements with milestone-based progress
- Content creation with episode/release-based payments
- Construction and engineering projects
- Research and development initiatives

**Technical Details:**

```rust
Milestone {
    milestone_amounts: [u64; 4],      // Amount for each milestone
    milestone_timestamps: [i64; 4],   // When each milestone is payable
    current_milestone: u8,            // Which milestone is next (0-3)
    release_condition: u8,            // 0=time, 1=manual, 2=automatic
    total_milestones: u8,             // How many milestones (1-4)
    escrow_amount: u64,               // Total amount held in escrow
}
```

### 3. Pay-as-you-go

Flexible usage-based billing where providers claim funds incrementally within predefined limits. Features period-based limits, chunk-based claims, and automatic resets.

**Characteristics:**

- **Usage-based**: Pay only for what you consume
- **Flexible Limits**: Period and chunk-based controls
- **Automatic Resets**: Period totals reset automatically
- **Provider-driven**: Providers initiate payment claims
- **Budget Control**: Built-in spending limits per period

**Use Cases:**

- AI agents and LLM providers
- API services with variable consumption
- Cloud resources and infrastructure costs
- SaaS platforms with flexible billing
- Utility services (compute, storage, bandwidth)
- Pay-per-use applications

**Technical Details:**

```rust
PayAsYouGo {
    max_amount_per_period: u64,      // Total allowed per billing period
    max_chunk_amount: u64,           // Max per individual claim
    period_length_seconds: u64,       // Billing period duration
    current_period_start: i64,        // Current period start time
    current_period_total: u64,        // Amount claimed this period
}
```

## Payment Type Comparison

| Feature              | Subscriptions          | Milestone Payments      | Pay-as-you-go    |
| -------------------- | ---------------------- | ----------------------- | ---------------- |
| **Payment Timing**   | Fixed schedule         | Event-based             | On-demand        |
| **Amount Structure** | Fixed recurring        | Variable per milestone  | Variable chunks  |
| **User Control**     | Setup once, automated  | Manual approval options | Period limits    |
| **Provider Control** | Limited (pause/resume) | Milestone execution     | Claim initiation |
| **Predictability**   | High                   | Medium                  | Low              |
| **Flexibility**      | Low                    | Medium                  | High             |
| **Setup Complexity** | Simple                 | Medium                  | Medium           |
| **Best For**         | Regular services       | Project work            | Variable usage   |

## Payment Type Selection Guide

### Choose Subscriptions when:

- Service usage is consistent and predictable
- Customers prefer fixed monthly costs
- Business model relies on recurring revenue
- Administrative overhead should be minimal

**Examples:** Netflix-style content, SaaS software, gym memberships, software maintenance

### Choose Milestone Payments when:

- Work is delivered in discrete phases
- Payment should follow completion, not time
- Project scope is well-defined
- Quality control at each stage is important

**Examples:** Construction projects, software development, consulting engagements, content series

### Choose Pay-as-you-go when:

- Usage patterns are variable and unpredictable
- Customers prefer paying only for what they use
- Service costs scale with consumption
- Flexibility is more valuable than predictability

**Examples:** Cloud computing, API calls, AI token usage, pay-per-click advertising

## Action Codes Integration

🛳️ **Shipped! Tributary now supports Action Codes!** Trigger secure Solana payments without requiring a wallet. Generate a one-time code on http://actioncode.app, review & approve in wallet elsewhere - always in control. Docs: http://docs.actioncodes.org @actioncodesorg

**Key Benefits:**

- **Wallet-less initiation**: Generate payment codes without wallet connection
- **Secure approval**: Review and approve in trusted wallet environment
- **One-time use**: Each code is single-use for enhanced security
- **Cross-platform**: Generate on any device, approve on any wallet
- **Full control**: Users always maintain final approval authority

**Action Codes + Payment Types:**

- **Subscriptions**: Generate codes for initial setup
- **Milestones**: Create codes for manual milestone approval
- **Pay-as-you-go**: Enable wallet-less top-up and limit increases

## Business Applications

Tributary's three payment models support diverse business use cases:

### SaaS & Software

- **Subscriptions**: Monthly/annual software licenses
- **Pay-as-you-go**: API usage billing, compute costs
- **Milestones**: Custom development projects

### Creator Economy

- **Subscriptions**: Content memberships, fan support
- **Milestones**: Series-based content creation
- **Pay-as-you-go**: Premium content access

### Professional Services

- **Subscriptions**: Retainer agreements, ongoing support
- **Milestones**: Project-based consulting, legal services
- **Pay-as-you-go**: Hourly billing, usage-based services

### Gaming & Entertainment

- **Subscriptions**: Game passes, platform access
- **Milestones**: Content release schedules
- **Pay-as-you-go**: In-game purchases, virtual goods

### DeFi & Web3

- **Subscriptions**: Protocol fees, strategy access
- **Milestones**: Grant disbursements, development milestones
- **Pay-as-you-go**: Transaction fees, gas optimization

### AI & Machine Learning

- **Subscriptions**: Model access, API subscriptions
- **Milestones**: Training milestones, model development
- **Pay-as-you-go**: Token usage billing, compute time

## x402 Integration

Tributary powers x402 (HTTP 402 Payment Required) implementation for web micropayments:

- **x402**: Proposed HTTP status for "Payment Required"
- **Deferred Payments**: Clients pay with signed Solana transactions
- **Micropayments**: Enables practical small-amount transactions
- **JWT Access**: Server returns tokens for seamless future access
- **Non-Custodial**: Full Web3 sovereignty maintained

**x402 Flow:**

1. Client requests protected content
2. Server returns subscription details (HTTP 402)
3. Client creates Tributary subscription transaction
4. Signed transaction sent via X-Payment header
5. Server submits tx, confirms on-chain, returns JWT

## Business Model

- **Revenue**: 1% protocol fee on all payments (volume-based discounts: 0.25%-1%)
- **Provider Fees**: Configurable 2-3% typical rates
- **Grants Program**: $500K fund for ecosystem development
- **Year 1 Projections**: $180K-$1.08M protocol revenue

## Team & Traction

- **Experience**: 10+ years combined Web3, DeFi & payment systems experience
- **Execution**: Rust/Solana experts + React specialists + security expertise
- **Projects**: >5 operational projects on Solana
- **Community**: Organic growth focus, developer-first outreach
- **Funding**: Self-funded with treasury grants program

## Roadmap

- **Q1 2025**: Mainnet launch, design partner program
- **Q2 2025**: Ecosystem growth, wallet integrations
- **Q3 2025**: Enterprise features, cross-chain R&D
- **Q4 2025**: Market leadership, advanced analytics
- **2026**: Global expansion, multi-chain support

## Competitive Landscape

| Solution    | Custody       | Payment Types | UX        | Solana Native | Status          |
| ----------- | ------------- | ------------- | --------- | ------------- | --------------- |
| Tributary   | Non-custodial | 3 types       | Excellent | Yes           | Production      |
| Squads Grid | Non-custodial | smart account | Good      | Yes           | Multi-sig focus |
| Helio       | Custodial     | 1 type        | Good      | Yes           | Custody risk    |
| Superfluid  | Non-custodial | 1 type        | Good      | No            | Wrong chain     |
| Manual      | Manual        | Limited       | Poor      | No            | Status quo      |

**Tributary Advantage**: Only solution offering multiple payment types (Subscriptions, Milestones, Pay-as-you-go) with native Solana integration and non-custodial security.

## Key Differentiators

1. **Multi-Payment Architecture**: Only protocol supporting Subscriptions, Milestones, and Pay-as-you-go models
2. **Action Codes Integration**: Wallet-less payment initiation with secure approval
3. **Non-custodial Security**: Funds remain in user wallets with delegation-based automation
4. **Developer-first**: Complete SDK, React components, comprehensive documentation
5. **Protocol Approach**: Network effects via provider ecosystem and extensible design
6. **Production Ready**: Full CI/CD pipeline, comprehensive testing, audit completed
7. **Speed + Cost**: Solana's 400ms finality, <$0.01 transactions
8. **Team Velocity**: Built in 3 weeks; proven execution and rapid iteration

## Getting Started

- **Website**: tributary.so
- **Docs**: docs.tributary.so
- **GitHub**: github.com/tributary-so
- **Discord**: Community support and discussions
- **SDK**: npm install @tributary-so/sdk
- **Action Codes**: actioncode.app for wallet-less payments
- **Action Docs**: docs.actioncodes.org for integration guides

## Contact & Resources

- **Email**: <team@tributary.so>
- **Twitter**: @tributary_so
- **Blog**: Medium technical deep-dives
- **YouTube**: Integration tutorials and demos
- **Contribute**: Open source, grant programs available
