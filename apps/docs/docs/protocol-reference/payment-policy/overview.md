# Payment Policy

Direct pull payments — the protocol's original, non-programmable policy family.

## Overview

A PaymentPolicy is a non-custodial recurring payment where the gateway pulls
tokens **directly** from the user's token account to the recipient. No
intermediate accounts, no swaps, no validation hooks — a single `transfer`
plus fee split. This page orients the reader to the three PaymentPolicy
variants (Subscription, Milestone, Pay-as-you-go), the shared `PolicyType`
envelope, and the referral program, before drilling into each variant's
dedicated page.

<!-- TODO scope (c):
  - Shared PaymentPolicy lifecycle: create → approve delegate → execute
  - PolicyType variant summary table with links to each variant page
  - Referral program summary and link to dedicated page
  - Source: `AGENTS.md` PaymentPolicy section, `programs/tributary/src/state/payment_policy.rs`
-->
