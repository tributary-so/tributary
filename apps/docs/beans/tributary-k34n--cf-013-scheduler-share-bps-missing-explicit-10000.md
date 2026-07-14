---
# tributary-k34n
title: 'CF-013: scheduler_share_bps missing explicit <=10000 bounds check'
status: completed
type: bug
priority: normal
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:39:16Z
parent: tributary-gq3x
---

# CF-013: `scheduler_share_bps` Missing Explicit ≤10000 Bounds Check

> **Severity:** 🔵 3 (LOW)
> **Category:** Input Validation
> **File:** `programs/tributary/src/instructions/gateway/update_gateway_scheduler_share.rs:32`
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

```rust
gateway.scheduler_share_bps = scheduler_share_bps;  // no require!( <= 10000)
gateway.validate_share_constraint(ctx.accounts.config.protocol_share_bps)?;
```

No explicit bounds check on `scheduler_share_bps` before assignment. The `validate_share_constraint` checks `protocol + scheduler + referral ≤ 10000` which functionally prevents values > 10000 from persisting (the sum would exceed 10000). But if `protocol_share_bps = 0` and `referral_allocation_bps = 0`, then `scheduler_share_bps` up to 10000 passes, while values above 10000 still fail the sum check.

Inconsistent with `change_gateway_fee_bps.rs:35` which explicitly bounds-checks:

```rust
require!(new_fee_bps <= 10000, TributaryError::InvalidFeeBps);
```

## Patch

```diff
 pub fn handle_update_gateway_scheduler_share(
     ctx: Context<UpdateGatewaySchedulerShare>,
     scheduler_share_bps: u16,
 ) -> Result<()> {
+    require!(scheduler_share_bps <= 10000, TributaryError::InvalidFeeBps);
     let gateway = &mut ctx.accounts.gateway;
     gateway.scheduler_share_bps = scheduler_share_bps;
```

## Summary of Changes

- Added explicit `require!(scheduler_share_bps <= 10000, TributaryError::InvalidFeeBps)` guard in `update_gateway_scheduler_share.rs` before assignment, matching the pattern in `change_gateway_fee_bps.rs`.
- Build verified (`cargo build -p tributary`).
