---
# tributary-q376
title: 'T6: Protocol Reference → ComposablePolicy content'
status: completed
type: task
priority: high
tags:
    - composable
    - docs
created_at: 2026-06-25T08:40:57Z
updated_at: 2026-06-25T08:54:53Z
parent: tributary-61ow
---

Write real content for the 7 protocol-level pages under Protocol Reference → ComposablePolicy.

## Pages to create (all NEW, full content)
1. protocol-reference/composable-policy/overview.md — 3-phase execution flow (pull → validate → forward → settle), account model, PDA seeds, counter separation
2. protocol-reference/composable-policy/validation-hook.md — Lighthouse integration, ValidationConfig, ValidationPda (separate account, ≤1024B data), assertion data format, allowed validation programs
3. protocol-reference/composable-policy/forward-hook.md — Meteora DLMM, ForwardConfig, ByteRangeCheck (offset/length/expected, discriminator pinning), min_output_amount (net post-fee semantics), data_checks array
4. protocol-reference/composable-policy/native-output.md — FORWARD_FLAG_NATIVE_OUTPUT, WSOL→SOL unwrap via closeAccount, recipient validation, when to use
5. protocol-reference/composable-policy/allowlists-and-sentinels.md — ALLOWED_FORWARD_PROGRAMS, ALLOWED_VALIDATION_PROGRAMS, pubkey::default()/SystemProgram sentinel convention for disabling hooks
6. protocol-reference/composable-policy/security-model.md — intermediate ATA ownership (ComposablePolicy PDA, NOT UserPayment), CPI signer sanitization (C-1 remediation), why validation uses plain invoke (no signer seeds), dual-delegate support
7. protocol-reference/composable-policy/vs-payment-policy.md — decision matrix table: when to use PaymentPolicy vs ComposablePolicy

## Source material
- AGENTS.md (composable section — comprehensive)
- programs/tributary/src/instructions/composable/*.rs (actual implementation)
- programs/tributary/src/state/composable_policy.rs (ForwardConfig, ValidationConfig, ByteRangeCheck structs)

## Style
Deeper technical level than T5. Include Rust struct definitions, PDA seed tables, ASCII flow diagrams. Target audience: auditors, deep integrators.

## Summary of Changes

Created 7 protocol-reference pages under `apps/docs/docs/protocol-reference/composable-policy/` (1153 lines total):

1. `overview.md` (187 lines) — 3-phase execution flow w/ ASCII diagram, PDA seed table, counter separation, account model, ComposablePolicy state struct
2. `validation-hook.md` (190 lines) — Lighthouse CPI, ValidationConfig, ValidationPda layout (8+2+1024), C-1 plain-invoke remediation, SDK facade example
3. `forward-hook.md` (194 lines) — Meteora DLMM, ForwardConfig, ByteRangeCheck::validate, discriminator-pin requirement, min_output_amount net post-fee semantics, create+execute rules
4. `native-output.md` (124 lines) — FORWARD_FLAG_NATIVE_OUTPUT, closeAccount vs transfer_checked, recipient validation, drain-vector analysis
5. `allowlists-and-sentinels.md` (147 lines) — ALLOWED_FORWARD/VALIDATION_PROGRAMS, sentinel conventions, validate_forward_config, execute-time re-validation, emergency_pause
6. `security-model.md` (210 lines) — intermediate ATA ownership (ComposablePolicy PDA), C-1 signer sanitization (validation=plain invoke, forward=invoke_signed w/ ComposablePolicy only), mint re-validation, dual-delegate, arithmetic/panic safety
7. `vs-payment-policy.md` (101 lines) — decision matrix table, when-to-use guidance, counter independence, migration notes

All content sourced from AGENTS.md + actual Rust source (execute_composable.rs, create_composable_policy.rs, state/composable_policy.rs, state/validation_pda.rs, constants.rs, shared/schedule.rs). Includes inline report references (C-1, H-04, H-06, M-02, M-04, M5, M7, L-02).

No git add / git commit performed per instructions.
