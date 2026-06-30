---
# tributary-zwiq
title: "Ponytail #10: collapse validate_referral_tiers (unreachable len check)"
status: completed
type: task
priority: normal
tags:
  - ponytail
  - dead-code
created_at: 2026-06-24T12:39:16Z
updated_at: 2026-06-25T00:00:00Z
parent: tributary-9hca
---

`state/payment_gateway.rs:83-92`:

```rust
pub fn validate_referral_tiers(&self) -> Result<()> {
    if self.referral_tiers_bps.len() != 3 {
        return Err(TributaryError::InvalidReferralTiers.into());
    }
    let total: u16 = self.referral_tiers_bps.iter().sum();
    require!(total == 10000, TributaryError::InvalidReferralTiers);
    Ok(())
}
```

`referral_tiers_bps` is declared as `[u16; 3]` (line 50). `.len()` is a const `3` at compile time — the `!= 3` branch is dead and the compiler likely elides it, but the code reads as if it were guarding something.

## Cut

- [x] Replace the body with:
  ```rust
  pub fn validate_referral_tiers(&self) -> Result<()> {
      let total: u16 = self.referral_tiers_bps.iter().sum();
      require!(total == 10000, TributaryError::InvalidReferralTiers);
      Ok(())
  }
  ```

## Verification

`cargo test --lib` — no test exercises the dead branch.

## Files

- `programs/tributary/src/state/payment_gateway.rs:83-92`

## Summary of Changes

- Dead `len() != 3` branch removed from `PaymentGateway::validate_referral_tiers` in `programs/tributary/src/state/payment_gateway.rs`.
- `cargo check` clean; `cargo test --lib` 60 passed / 0 failed.
- No behavior change — the branch was unreachable (`referral_tiers_bps` is `[u16; 3]`, so `.len()` is a compile-time const).
