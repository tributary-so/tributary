---
# tributary-yi3s
title: 'T5: Integration Guide → Programmable Pull Payments content'
status: completed
type: task
priority: high
tags:
    - composable
    - docs
created_at: 2026-06-25T08:40:57Z
updated_at: 2026-06-25T09:38:50Z
parent: tributary-61ow
---

Write real content for the 6 developer-facing pages under Integration Guide → Programmable Pull Payments.

## Pages to create (all NEW, full content)

1. integration-guide/programmable-pull-payments/overview.md — concept: pull → validate → forward → settle; when to choose programmable vs plain pull; link to protocol-reference/composable-policy for deep tech
2. integration-guide/programmable-pull-payments/sdk.md — TS SDK composable surface: getCreateComposablePolicyInstruction, executeComposable, ForwardConfig, ValidationConfig; code examples
3. integration-guide/programmable-pull-payments/lighthouse-facade.md — the fluent lighthouse builder API: tokenAccount().amount().build(), all assertion families
4. integration-guide/programmable-pull-payments/examples/auto-topup-guard.md — USDC balance < threshold → pull USDC, deliver USDC (no swap)
5. integration-guide/programmable-pull-payments/examples/swap-and-deliver.md — pull USDC, swap via Meteora DLMM, deliver WSOL
6. integration-guide/programmable-pull-payments/examples/native-sol-topup.md — pull USDC, swap to WSOL, unwrap to native SOL via NATIVE_OUTPUT flag

## Source material

- AGENTS.md (composable section — very detailed)
- packages/sdk/src/ (actual SDK exports)
- tests/topup-balance.test.ts, tests/topup-balance-swap.test.ts (working examples)

## Style

Match existing docs/ voice (direct, code-first, tables for decisions). Each page: H1 + overview paragraph + code example + reference links.

## Summary of Changes

All 6 pages created with full content (1219 lines total). Every code example
references real SDK exports and mirrors the patterns in the working test suite.

### Files created

| File                                                                                       | Lines | Content                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/docs/docs/integration-guide/programmable-pull-payments/overview.md`                  | 81    | Concept page: pull → validate → forward → settle mermaid, sentinel convention, decision table vs PaymentPolicy.                                                                             |
| `apps/docs/docs/integration-guide/programmable-pull-payments/sdk.md`                       | 252   | `getCreateComposablePolicyInstruction` + `executeComposable` full signatures, `remaining_accounts` layout, `ForwardConfig` / `ValidationConfig` / `ByteRangeCheck` types, sentinel recipes. |
| `apps/docs/docs/integration-guide/programmable-pull-payments/lighthouse-facade.md`         | 178   | Fluent `lighthouse` builder, all 8 assertion families, operator sugar table, `{data, numAccounts, accounts}` return shape.                                                                  |
| `apps/docs/docs/integration-guide/programmable-pull-payments/examples/auto-topup-guard.md` | 188   | USDC balance < threshold → same-mint topup. Validation enabled, forward disabled.                                                                                                           |
| `apps/docs/docs/integration-guide/programmable-pull-payments/examples/swap-and-deliver.md` | 252   | USDC → WSOL via Meteora DLMM. Forward enabled, ByteRangeCheck discriminator pinning, `min_output_amount` semantics.                                                                         |
| `apps/docs/docs/integration-guide/programmable-pull-payments/examples/native-sol-topup.md` | 268   | WSOL → native SOL unwrap via `FORWARD_FLAG_NATIVE_OUTPUT` bit. Includes the `recipient_token_account = system wallet` caveat.                                                               |

### Verification of SDK exports referenced

Confirmed present in `packages/sdk/src/`:

- `getCreateComposablePolicyInstruction` — `sdk.ts:2007` (method on `Tributary`)
- `executeComposable` — `sdk.ts:2087` (method on `Tributary`)
- `lighthouse` facade + `LIGHTHOUSE_PROGRAM_ID` — `lighthouse.ts:60, 722`
- `encodeMemo` — `utils.ts:19`
- `getComposablePolicyPda`, `getValidationPda` — `pda.ts:91, 128`
- `ForwardConfig`, `ValidationConfig`, `ByteRangeCheck` — `types.ts:110, 116, 122`

### Verification of on-chain constants referenced

- `FORWARD_FLAG_NATIVE_OUTPUT = 1` — `programs/tributary/src/constants.rs:24`
- `NATIVE_MINT` — `constants.rs:31`
- `ALLOWED_FORWARD_PROGRAMS` (Meteora DLMM `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`) — `constants.rs:13`
- `ALLOWED_VALIDATION_PROGRAMS` (Lighthouse `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`) — `constants.rs:16`
- Error variant `NativeOutputRequiresWsol` — `error.rs:122`
- `process_output_and_sweep` (native_output closeAccount branch) — `execute_composable.rs:454`

### Style conformance

- Direct, code-first voice matching `sdk.md` / `integration.md`.
- Decision tables on `overview.md` (ComposablePolicy vs PaymentPolicy) and on
  `native-sol-topup.md` (WSOL vs native SOL delivery).
- Admonitions (`!!! info`, `!!! warning`) used for the SDK auto-prepend of the
  ValidationPda, the recipient_token_account override caveat, and the
  "fees are still WSOL" note.
- Every code block specifies its import path.
- Cross-links to Protocol Reference and between sibling pages.

### Out of scope

- mkdocs.yml nav update — the nav doesn't reference the `integration-guide/`
  section yet. That's an orchestrator concern (the nav spans multiple beans'
  file ownership).
