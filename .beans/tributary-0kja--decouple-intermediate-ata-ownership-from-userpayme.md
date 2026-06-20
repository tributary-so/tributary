---
# tributary-0kja
title: Decouple intermediate ATA ownership from UserPayment PDA (C-1 + C-2)
status: completed
type: bug
priority: critical
created_at: 2026-06-19T12:31:16Z
updated_at: 2026-06-19T12:45:57Z
---

The intermediate token accounts in execute_composable are owned by the UserPayment PDA, which is ALSO the delegate on the user's source token account. Any CPI signed by UserPayment PDA (validation, forward, sweep, close) grants the callee nested-CPI authority to drain user_token_account.

Fix (Option A): intermediate ATAs owned by the composable_policy PDA instead — already in the instruction, not a token delegate anywhere. Also implement C-1 (validation CPI -> plain invoke, no signer) and remove Token Program from ALLOWED_FORWARD_PROGRAMS.

- [x] Rust: composable_policy owns intermediates; build composable_policy seeds helper
- [x] Rust: C-1 fix — run_validation_cpi uses invoke() (no signer)
- [x] Rust: run_forward_cpi / build_forward_account_metas use composable_policy seeds
- [x] Rust: remove dead build_user_payment_seeds
- [x] SDK: executeComposable derives intermediates with composable_policy owner
- [x] Tests: composable.test.ts intermediate ATA owner -> composable_policy
- [x] Tests: topup-balance.test.ts forward target -> Meteora (TokenProgram removed from allowlist); intermediate owner -> composable_policy
- [x] Build + typecheck
- [x] Document in reports + COMPOSABLE notes

## Summary of Changes

Decoupled the composable intermediate-ATA ownership from the UserPayment PDA (Option A), closing both C-1 and C-2.

**Root cause fixed:** A single PDA (UserPayment) was both (a) owner of the intermediate ATAs and (b) delegate on the user's source token account — so any CPI signed by it (validation/forward/sweep/close) could drain user funds via nested CPI. Intermediates are now owned by the **ComposablePolicy PDA**, which is never a token delegate.

**Changes:**
- `run_validation_cpi` → plain `invoke()` (no signer) — C-1 fix
- `build_forward_account_metas` / `run_forward_cpi` → ComposablePolicy signer
- Token Program removed from `ALLOWED_FORWARD_PROGRAMS` (only Meteora DLM remains)
- SDK `executeComposable` + both test files updated to derive intermediates under ComposablePolicy PDA
- `build_user_payment_seeds` removed (dead after refactor)

**Verification:** anchor build ✓, cargo test --lib 51/51 ✓, SDK build ✓, tsc --noEmit ✓ (no errors in changed files).

Reports updated: C-1 → Resolved, new C-2 report documents the forward leak + decoupling.
