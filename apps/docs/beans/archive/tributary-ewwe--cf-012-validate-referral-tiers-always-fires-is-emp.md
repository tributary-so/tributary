---
# tributary-ewwe
title: 'CF-012: validate_referral_tiers always fires — is_empty tautology on [u16; 3]'
status: completed
type: bug
priority: normal
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:37:23Z
parent: tributary-gq3x
---

# CF-012: `validate_referral_tiers` Always Fires — `is_empty` Tautology on `[u16; 3]`

> **Severity:** 🔵 3 (LOW)
> **Category:** Logic
> **File:** `programs/tributary/src/instructions/gateway/update_gateway_referral_settings.rs:72–74`
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

```rust
if !gateway.referral_tiers_bps.is_empty() {
    gateway.validate_referral_tiers()?;
}
```

`referral_tiers_bps` is `[u16; 3]` — a fixed-size array. `[u16; 3].is_empty()` is **always false** (compile-time length is 3). Therefore `validate_referral_tiers()` is **always called**.

At gateway creation, tiers are zero-initialized `[0, 0, 0]`. `validate_referral_tiers()` requires `sum == 10000`. So `[0, 0, 0]` always fails.

## Impact

A gateway authority cannot update `referral_allocation_bps` alone without also providing valid tiers summing to 10000. A gateway that has never configured referral tiers (still `[0, 0, 0]`) cannot update any referral setting without first setting valid tiers — even if the update is to disable referral.

## Patch

```diff
-if !gateway.referral_tiers_bps.is_empty() {
+if gateway.is_referral_enabled() && gateway.referral_allocation_bps > 0 {
     gateway.validate_referral_tiers()?;
 }
```

Only validate tiers when referral is actually active and has a non-zero allocation.

## Summary of Changes

- Fixed tautological `is_empty()` guard on `[u16; 3]` (always false) in `update_gateway_referral_settings.rs:78` — replaced with `is_referral_enabled() && referral_allocation_bps > 0` so dormant gateways can update referral settings without pre-configured tiers.
- Added regression test `referral_tier_validation_skips_dormant_default` covering both the dormant skip and the active-referral validation path.
