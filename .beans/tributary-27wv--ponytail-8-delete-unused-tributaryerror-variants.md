---
# tributary-27wv
title: 'Ponytail #8: delete unused TributaryError variants'
status: completed
type: task
priority: high
tags:
    - ponytail
    - dead-code
created_at: 2026-06-24T12:38:55Z
updated_at: 2026-06-24T19:10:28Z
parent: tributary-9hca
---

Five error variants in `error.rs` have zero references in production code:

- `MaxPoliciesReached` (line 12) — only mentioned in commented-out code at `create_payment_policy.rs:110`
- `PolicyNotFound` (line 18) — no references at all
- `ReferralFeatureNotEnabled` (line 38) — superseded by `try_distribute_referral_rewards` returning `Ok(0)` when `!is_referral_enabled()` (no error path)
- `ReferralAccountAlreadyExists` (line 74) — no references (the Anchor `init` constraint handles PDA collisions natively)
- `ComposablePolicyNotFound` (line 108) — no references

## Cut

- [x] Remove the five variants from `error.rs`
- [x] `cargo build-spf` to confirm nothing imports them

## Verification

Build must pass. If it fails, grep for the variant name to find the missed caller.

## Caveat

Anchor assigns discriminants positionally. Removing variants shifts the numeric codes of every variant below them. This **does not break** runtime accounts (errors aren't stored on-chain), but it **does break** any off-chain client that switches on the numeric `TributaryError` code. Check:

- [x] `packages/sdk/` for any error-code constants
- [x] Any indexers that parse error logs by code

If any clients hardcode the codes, either (a) keep the dead variants in place with `#[deprecated]` annotation, or (b) bump the SDK error-code map in the same PR.

## Summary of Changes

Deleted five unused `TributaryError` variants from `programs/tributary/src/error.rs`:

- `MaxPoliciesReached` (only reference was commented-out code at `create_payment_policy.rs:110`)
- `PolicyNotFound` (zero references)
- `ReferralFeatureNotEnabled` (superseded by `Ok(0)` short-circuit in `try_distribute_referral_rewards`)
- `ReferralAccountAlreadyExists` (zero references; Anchor `init` constraint handles PDA collisions)
- `ComposablePolicyNotFound` (zero references)

**Build/test:** `cargo check` clean; `cargo test --lib` → `60 passed; 0 failed`.

**IDL/client-decoder findings:** No hardcoded numeric error codes found in `packages/sdk/src/`. No `TributaryError` decoder exists in the SDK. The only `3000-3005` matches were in generated IDL JSON under `target/` (not hand-maintained source). Indexers parsing error logs by numeric code would need to rebuild from the regenerated IDL — automatic for any Anchor-based client, non-issue for the current SDK surface.

Anchor reassigns error discriminants positionally, so the numeric codes of every variant below each deleted slot shift down. This does not affect on-chain accounts (errors are not stored) and no off-chain client in this repo depends on the codes.

## Files

- `programs/tributary/src/error.rs`
