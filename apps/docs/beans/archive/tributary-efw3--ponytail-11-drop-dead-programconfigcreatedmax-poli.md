---
# tributary-efw3
title: "Ponytail #11: drop dead ProgramConfigCreated::max_policies_per_user event field"
status: completed
type: task
priority: normal
tags:
  - ponytail
  - dead-code
created_at: 2026-06-24T12:39:16Z
updated_at: 2026-06-25T06:20:01Z
parent: tributary-9hca
---

`ProgramConfig::_deprecated: u32` (formerly `max_policies_per_user`) is a tombstone field — must stay in the struct for account-layout compatibility, but its former value is still echoed into the `ProgramConfigCreated` event at `initialize.rs:45`:

```rust
emit!(ProgramConfigCreated {
    admin: config.admin,
    fee_recipient: config.fee_recipient,
    protocol_fee_bps: config.protocol_fee_bps,
    max_policies_per_user: 0, // DEPRECATED
});
```

The event field is always `0`, has been `0` since the limit was disabled, and no client derives anything from it. Pure ceremony.

## Cut

- [x] Remove `pub max_policies_per_user: u32` from `ProgramConfigCreated` (`state/events.rs:33`)
- [x] Remove the `max_policies_per_user: 0` line from `initialize.rs:45`
- [x] `cargo build-spf` + check SDK for any typed event decoder that includes the field

## Summary of Changes

- Removed `max_policies_per_user: u32` field from `ProgramConfigCreated` event struct (`state/events.rs`).
- Removed the `max_policies_per_user: 0, // DEPRECATED` emit line from `initialize.rs`.
- `ProgramConfig::_deprecated: u32` field RETAINED — preserves on-chain account layout, only the event echo is dropped.
- `cargo check` clean; `cargo test --lib` → `60 passed; 0 failed`.
- IDL note: the `ProgramConfigCreated` event shape change will surface in the IDL regen at end of batch (not bundled here).

## Verification

- Anchor re-generates the IDL on build — confirm the new IDL drops the field.
- Off-chain event decoders that used `max_policies_per_user` will see it missing (the field was always 0, so any consumer reading it was already broken in practice).

## Risk

IDL-shape change. Any external indexer decoding `ProgramConfigCreated` will see a missing field. Since the field was always 0, the impact is informational at worst.

## Files

- `programs/tributary/src/state/events.rs:33`
- `programs/tributary/src/instructions/initialize.rs:45`
