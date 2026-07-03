# Tributary

> **Money should move itself.**

The rule-based money-moving primitive on Solana. You delegate spending
authority once — _set the riverbed once_ — and money then flows within rules
you defined: a trigger condition (**WHEN**), a value to pull (**PULL**), a
destination to route to (**ROUTE**). One signature, not a thousand. Pull, don't
push.

---

## Why this exists

Every payment rail before Tributary is **push**-based: you hold a balance, you
sign a transfer, the balance drops. Every move needs your hand on the keypad.
The signature is the tax; the wallet is a wheelbarrow. Crypto spent fifteen
years winning the **balance** and silently inherited the **push** worldview —
money that sits until a human shoves it.

Tributary is, architecturally, a **pull**-payment primitive: you delegate a
puller once, the puller draws on rules. The antagonist (push) and the
architecture (pull) are the same word. Recurring payments is the smallest thing
this primitive does — the minimal live configuration, already running
(4,000+ pulls on mainnet). Turn the other knobs and the same primitive composes
into autonomous capital.

> **Stop pushing your bags. Let them flow.**

---

## How it works

Solana-native **token delegation**. You grant a puller permission for specific
amounts on a specific schedule; the protocol pulls exactly what you approved,
when you approved it — nothing more. Your wallet is the aquifer: untouched
until a rule fires.

- **No deposits.** Tokens stay in your wallet until a pull is due.
- **No middleman.** Funds route directly from your wallet to the recipient.
- **No surprises.** Pause, resume, or revoke anytime.
- **No borders.** Anyone, anywhere can pay or accept.

Payments settle in under a second with fees measured in fractions of a cent —
that's Solana, not magic.

|                 | Tributary           | Traditional                   |
| --------------- | ------------------- | ----------------------------- |
| **Setup**       | Seconds             | Days (KYC, bank verification) |
| **Fees**        | starting at 1%      | 2.9% + 30¢ per transaction    |
| **Settlement**  | Instant (400ms)     | 2–7 business days             |
| **Chargebacks** | No                  | Yes                           |
| **Custody**     | Your wallet, always | Held by a third party         |
| **Geography**   | No restrictions     | Country-limited               |

---

## What you get

Five claim shapes. One primitive. _If This Then Money_ — pick the configuration
that fits your flow.

### Subscriptions

The familiar model. Fixed amount, regular interval.

- Pay the same every week, month, or year
- Auto-renew or cap the number of renewals
- Cancel or pause with one click

**Great for:** SaaS tools, memberships, streaming, recurring donations

[Learn more](protocol-reference/payment-policy/subscription.md)

### Milestone Payments

Pay for deliverables, not time. Split a project into up to 4 milestones.

- Different amounts per milestone
- Release on schedule, on approval, or automatically
- Funds committed upfront but released only as work completes

**Great for:** Freelance projects, consulting, software development, content series

[Learn more](protocol-reference/payment-policy/milestone.md)

### Pay-as-you-go

Use first, pay later. Providers claim what you owe within limits you set.

- Set a spending cap per billing period
- Providers claim incrementally as you consume
- Periods reset automatically — hard limits enforced on-chain

**Great for:** AI APIs, cloud computing, utility services, anything metered

[Learn more](protocol-reference/payment-policy/payasyougo.md)

---

## Who is it for?

### End users

One signature, total transparency, full control. Every pull is on-chain. Your
tokens never leave your wallet until a rule fires. Pause or revoke anytime.

### Developers

Drop in a [React component or hook](integration-guide/pull-payments/sdk-react/index.md) and you're done. Need more control? Use the [TypeScript SDK](integration-guide/pull-payments/sdk.md). Going no-code? Generate [checkout links](integration-guide/pull-payments/checkout.md) in seconds. Everything is [open-source](https://github.com/tributary-so/tributary).

### Businesses

Accept recurring payments globally without the KYC bottleneck. Pay ~1% instead of 3%+. Settle instantly. Give your customers a familiar experience on pull-based rails.

### Payment providers

Build your own payment service on top of the primitive. Earn fees by running a [Payment Gateway](operate/providers.md) — keep the watershed. Focus on UX; the protocol handles the complexity.

---

## What Can You Build?

| Idea                  | Payment Type  | How It Works                        |
| --------------------- | ------------- | ----------------------------------- |
| Streaming service     | Subscription  | $10/month, auto-renew               |
| Freelance platform    | Milestones    | Pay per deliverable phase           |
| AI API gateway        | Pay-as-you-go | Bill per token, capped daily        |
| Newsletter            | Subscription  | $5/month, cancel anytime            |
| Consulting engagement | Milestones    | 3-phase project with approval gates |
| Cloud compute         | Pay-as-you-go | Metered usage with weekly caps      |

More ideas in [Use Cases](use-cases.md).

---

## Get Started

1. **Pick your integration** — [React SDK](integration-guide/pull-payments/sdk-react/index.md), [TypeScript SDK](integration-guide/pull-payments/sdk.md), or [Checkout Links](integration-guide/pull-payments/checkout.md)
2. **Choose a payment type** — [Subscription](protocol-reference/payment-policy/subscription.md), [Milestone](protocol-reference/payment-policy/milestone.md), [Pay-as-you-go](protocol-reference/payment-policy/payasyougo.md), [OneTime](protocol-reference/payment-policy/onetime.md), or [UpTo](protocol-reference/payment-policy/upto.md)
3. **Go live** — deploy on Solana mainnet in minutes

!!! question "Questions?"

    Check the [FAQ](faq.md) or read the [Protocol Overview](protocol-reference/overview.md).

## Developer Tools

- **[TypeScript SDK](integration-guide/pull-payments/sdk.md#typescript-sdk-tributary-sosdk)** - Complete protocol interaction
- **[React SDK](integration-guide/pull-payments/sdk-react/index.md)** - Pre-built payment components and React hooks
- **[Payments SDK](integration-guide/pull-payments/sdk.md#payments-sdk-tributary-sopayments)** - Simple Payments API with hosted checkout page (zero API keys)
- **[x402 SDK](integration-guide/pull-payments/sdk.md#x402-sdk-tributary-sox402)** - HTTP 402 middleware for API monetization
- **[CLI](integration-guide/pull-payments/sdk.md#cli-tributary-socli)** - Protocol management tools
- **[REST API](./api/rest-api.md)** - Query subscriptions, events, manage webhooks

---

Tributary is one primitive. _If This Then Money._ You route the rest.
