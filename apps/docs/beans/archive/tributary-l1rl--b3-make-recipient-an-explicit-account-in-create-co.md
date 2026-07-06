---
# tributary-l1rl
title: 'B3: Make recipient an explicit account in create_composable_policy'
status: completed
type: bug
priority: critical
created_at: 2026-06-21T18:31:55Z
updated_at: 2026-06-21T18:43:54Z
---

Fix the BLOCKER in reports/B3-fee-payer-becomes-recipient-without-gateway-signer-constraint.md. fee_payer is silently promoted to recipient, enabling a phishing drain. Add explicit recipient: UncheckedAccount (matching create_payment_policy.rs pattern), fix misleading doc comment, wire SDK through, update all tests.

## Plan

- [x] RED: Add regression test — create with recipient != feePayer, verify stored recipient
- [ ] GREEN: Add recipient: UncheckedAccount to CreateComposablePolicy struct + non-default constraint
- [ ] GREEN: Change recipient write from fee_payer.key() to recipient.key()
- [ ] GREEN: Fix misleading doc comment on fee_payer
- [ ] SDK: Wire recipient into accounts in getCreateComposablePolicyInstruction
- [ ] Tests: Add recipient to all 15 createComposablePolicy call sites
- [ ] Verify: cargo check + cargo fmt --check + tsc --noEmit
- [x] Update report Status -> Fixed

## Summary of Changes

- **create_composable_policy.rs**: Added recipient UncheckedAccount with non-default constraint, mirroring create_payment_policy.rs. Fixed misleading doc comment on fee_payer. Changed write site from fee_payer.key() to recipient.key().
- **sdk.ts**: Wired recipient into accounts in getCreateComposablePolicyInstruction (SDK already accepted the param but never passed it through).
- **tests/composable.test.ts**: Added recipient to all 13 create call sites + new B3 regression block (explicit recipient != fee_payer, default recipient rejected).
- **tests/topup-balance.test.ts**: Added recipient to the 1 create call site.
- **reports/B3-...md**: Status flipped Open to Fixed (bean tributary-l1rl).

Verification: cargo check clean, cargo fmt --check clean, tsc --noEmit clean on changed files. Committed as e5bde8f.
