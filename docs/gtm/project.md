# Tributary.so Project Summary

## Overview

Tributary is a protocol that enables automated recurring payments on Solana through token delegation. Users approve payments once, and the protocol handles execution automatically without fund lock-up. The protocol provides foundational infrastructure that payment providers build upon to create user-facing subscription services.

## Core Technology

- **Protocol**: Smart contract-based recurring payments using SPL token delegation
- **Network**: Native Solana integration with sub-cent fees and 400ms settlement
- **Security**: Non-custodial - funds remain in user wallets until payment execution
- **UX**: One-click setup via token delegation, eliminating repetitive approvals
- **Program ID**: `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`

## Key Features

- **Automated Execution**: Payments execute automatically on schedule without user intervention
- **Full Control**: Users can pause, resume, or cancel subscriptions anytime
- **Protocol Design**: One smart contract enabling unlimited businesses on top
- **Fee Structure**: 1% protocol fee + configurable gateway fees (up to 10%)
- **Integration**: x402 HTTP 402 support for deferred micropayments

## Development Status

- **MVP**: 100% complete, built in 3 weeks for Colosseum Hackathon
- **Live Networks**: Devnet and Mainnet deployment
- **SDK Packages**: TypeScript SDK, React components, CLI manager
- **Demo Flows**: Create, pause, resume, delete subscriptions
- **Security**: Audit completed (Ottersec/Neodyme)

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
    // Future variants for installments, milestones, etc.
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

## Use Cases & Examples

### Core Payment Types

- **Subscriptions**: Fixed amounts at regular intervals (SaaS, streaming)
- **Donations**: Ongoing creator support (Patreon-style)
- **Installments**: Scheduled partial payments (buy-now-pay-later)
- **Usage-Based**: Variable amounts by consumption (APIs, cloud)
- **Membership Dues**: Regular membership fees (DAOs, associations)

### Business Applications

- **SaaS**: Dev tools, APIs with monthly billing
- **Creators**: Patreon-style memberships and donations
- **Gaming**: Season passes, in-game subscriptions
- **DeFi**: Strategy fees, protocol subscriptions
- **DAOs**: Treasury automation, contributor payments
- **AI**: Model access fees, agent subscriptions
- **Content**: Premium articles, videos, courses
- **Services**: Consulting, legal, professional services

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

| Solution    | Custody       | UX        | Solana Native | Status          |
| ----------- | ------------- | --------- | ------------- | --------------- |
| Tributary   | Non-custodial | Excellent | Yes           | MVP Complete    |
| Squads Grid | Non-custodial | Complex   | Yes           | Multi-sig focus |
| Helio       | Custodial     | Good      | Yes           | Custody risk    |
| Superfluid  | Non-custodial | Good      | No            | Wrong chain     |
| Manual      | Manual        | Poor      | No            | Status quo      |

## Key Differentiators

1. **First-mover**: Only production-ready non-custodial solution on Solana
2. **UX superiority**: Sign-once vs. approve-every-time
3. **Developer-first**: Complete SDK, React components, documentation
4. **Protocol approach**: Network effects via provider ecosystem
5. **Speed + cost**: Solana's 400ms finality, <$0.01 transactions
6. **Team velocity**: Built in 3 weeks; proven execution

## Getting Started

- **Website**: tributary.so
- **Docs**: docs.tributary.so
- **GitHub**: github.com/tributary-so
- **Discord**: Community support and discussions
- **SDK**: npm install @tributary-so/sdk

## Contact & Resources

- **Email**: <team@tributary.so>
- **Twitter**: @tributary_so
- **Blog**: Medium technical deep-dives
- **YouTube**: Integration tutorials and demos
- **Contribute**: Open source, grant programs available
