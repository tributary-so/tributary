# Payment Policy

Direct pull payments — the protocol's original, non-programmable policy family.

## Overview

A PaymentPolicy is a non-custodial recurring payment where the gateway pulls
tokens **directly** from the user's token account to the recipient. No
intermediate accounts, no swaps, no validation hooks — a single `transfer`
plus fee split. This page orients the reader to the five PaymentPolicy
variants (Subscription, Milestone, Pay-as-you-go, OneTime, UpTo), the shared
`PolicyType` envelope, and the referral program, before drilling into each
variant's dedicated page.

## Variants at a Glance

| Variant                         | Amount           | Fires         | Recipient trigger | Best For                     |
| ------------------------------- | ---------------- | ------------- | ----------------- | ---------------------------- |
| [Subscription](subscription.md) | Fixed per period | Recurring     | No                | Recurring services, SaaS     |
| [Milestone](milestone.md)       | Per-phase        | Up to 4×      | Per release_cond. | Project deliverables, escrow |
| [Pay-as-you-go](payasyougo.md)  | Variable/claim   | Many (capped) | Yes               | Usage billing (AI/LLM, API)  |
| [OneTime](onetime.md)           | Fixed            | Exactly once  | No                | Invoices, one-shot payouts   |
| [UpTo](upto.md)                 | ≤ max (caller)   | Exactly once  | Yes               | Usage-based one-shot (x402)  |

All five variants share the same 128-byte fixed layout (ADR-0002), the same
`PaymentPolicy` envelope (PDA, lifecycle, fees, referrals, composable hooks),
and the same `UserPayment`-as-delegate model. They differ only in scheduling
semantics and amount resolution.

<!-- TODO scope (c):
  - Shared PaymentPolicy lifecycle: create → approve delegate → execute
  - PolicyType variant summary table with links to each variant page
  - Referral program summary and link to dedicated page
  - Source: `AGENTS.md` PaymentPolicy section, `programs/tributary/src/state/payment_policy.rs`
-->
