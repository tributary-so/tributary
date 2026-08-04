---
# tributary-1ld1
title: '#14: Validate mint at gateway creation (defense-in-depth)'
status: scrapped
type: task
priority: normal
created_at: 2026-07-07T11:50:19Z
updated_at: 2026-07-08T19:01:29Z
parent: tributary-daxr
---

Audit finding #14 (Medium): validate_mint_compatible runs at execute_payment and execute_composable (re-checking mutable Token-2022 extensions), but create_payment_gateway and create_user_payment do NOT validate the mint. A gateway could be created for a mint that later gets a TransferHook added — the gateway becomes unusable but only fails at execute time.

Adding the check at gateway create is defense-in-depth: it catches hostile mints earlier and documents the expectation that gateway mints are Token-2022-clean.

**Location:** 
- create_payment_gateway.rs — add validate_mint_compatible on token_mint (if applicable)
- create_user_payment.rs — already validates at execute, but add at create for early failure

Note: PaymentGateway does NOT have a token_mint field (it is mint-agnostic). The validation belongs in create_user_payment (which DOES bind a token_mint) and in create_payment_policy / create_composable_policy (which already call validate_mint_compatible).

**Fix:** Verify that create_user_payment calls validate_mint_compatible. If not, add it.

**Acceptance:**
- [ ] Audit create_user_payment.rs for validate_mint_compatible call
- [ ] If missing: add validate_mint_compatible(&ctx.accounts.token_mint.to_account_info())?
- [ ] Unit test or integration test confirming a Token-2022 TransferHook mint is rejected at create_user_payment
- [ ] cargo build clean
