---
# tributary-w1k5
title: 'Fix executeComposable account mismatches: paymentsDelegate, user_token_account authority, coldWallet funding'
status: in-progress
type: bug
priority: high
created_at: 2026-06-16T13:07:54Z
updated_at: 2026-06-16T13:07:54Z
---

Fix 5 issues in topup-balance.test.ts and execute_composable.rs:
- [ ] Fix paymentsDelegate in test: use global PDA (getPaymentsDelegatePda), not userPaymentPDA
- [ ] Fix user_token_account constraint in Rust: change associated_token::authority = user_payment to user_token_account.owner == user_payment.owner
- [ ] Change UserPayment to coldWallet (the actual funding source / user)
- [ ] Add note about missing forward accounts in remaining_accounts
- [ ] Fund coldWallet with USDC + set delegate on its token account
- [ ] Intermediate input==output is an accepted edge-case (no change)
