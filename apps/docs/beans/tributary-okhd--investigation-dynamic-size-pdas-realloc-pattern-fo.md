---
# tributary-okhd
title: 'Investigation: dynamic-size PDAs (realloc pattern) for future Tributary accounts'
status: draft
type: epic
priority: low
created_at: 2026-07-02T10:50:23Z
updated_at: 2026-07-02T10:50:23Z
---

Investigation epic (NOT current work). Inspired by Squads smart-account-program's dynamic realloc approach.

## Context

During the smart-account-program comparison (bean tributary-ssd9), we discovered Squads uses dynamic-size accounts: Policy::size() is a runtime function that computes exact serialized size from actual Vec contents, and realloc_if_needed() grows/shrinks the account on every mutation. This lets them store variable-length policy data (nested Vec<AccountConstraint>, Vec<DataConstraint>, variable hook instruction_data) without fixed-array caps or wasted padding.

Tributary currently uses fixed-size #[account] structs with const SIZE and padding (ADR-0002). This works for the current simple types but becomes limiting if we later adopt the full inline constraint engine (nested Vecs in AccountConstraint / DataConstraint) or want to avoid paying rent for unused constraint slots.

## Scope (investigation only)

- Evaluate the realloc pattern (AccountInfo::realloc + rent-exempt top-up) for Tributary accounts.
- Identify which accounts could benefit (ComposablePolicy, ValidationPda, future forward-pin accounts).
- Assess CU cost of realloc on every mutation vs. fixed-size waste.
- Evaluate the zero-copy deserialization implications (variable-size Borsh in #[account]).
- Compare against the fixed-array-with-sentinel approach currently used.
- Decision gate: adopt realloc only when the inline constraint engine lands (Inline variant of ValidationSpec stops being a stub).

## Out of scope

- Any code changes. This is a research/design investigation.
- Current grilling work (InstructionConstraint + ValidationSpec refactoring) uses fixed-size arrays.

## Prerequisite

The inline constraint engine must be scoped before this investigation has teeth. Until Inline{} is a real variant with nested Vecs, fixed arrays suffice.

## Children (to be created when prioritised)

- [ ] Research note: realloc mechanics for Anchor #[account] structs (patterns, CU costs, rent-payer plumbing)
- [ ] Design: which Tributary accounts should migrate, migration path for any deployed accounts (PaymentPolicy is frozen on mainnet)
- [ ] ADR: dynamic-size PDA policy (when to use realloc vs fixed-size)
