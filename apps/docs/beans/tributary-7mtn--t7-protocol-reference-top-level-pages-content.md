---
# tributary-7mtn
title: 'T7: Protocol Reference top-level pages content'
status: completed
type: task
priority: normal
tags:
    - docs
    - protocol
created_at: 2026-06-25T08:40:57Z
updated_at: 2026-06-25T08:54:13Z
parent: tributary-61ow
---

Write real content for the 7 Protocol Reference top-level pages (replacing/ expanding the stubs T2 creates).

## Pages to create/expand (T2 creates stubs, T7 fills them)
1. protocol-reference/overview.md — expanded from old architecture.md: full mermaid of account relationships, execution lifecycle, dual policy families
2. protocol-reference/accounts-and-pdas.md — full PDA seed table (8 entries), per-account field tables with mut/signer/derivation/relationship, rent exemption strategy
3. protocol-reference/idl.md — how to fetch the on-chain IDL via 'anchor idl', link to the program, explanation of what each instruction changes
4. protocol-reference/deployment.md — program IDs (Devnet=Mainnet, same ID), RPC endpoints, how to verify deployment
5. protocol-reference/error-codes.md — full TributaryError table generated from programs/tributary/src/error.rs, with plain-English remediation for each
6. protocol-reference/changelog.md — initial entry documenting the composable merge
7. protocol-reference/security.md — expanded from old stub: token delegation model, non-custodial design, allowlists, CPI sanitization; note 'audits pending'

## Source material
- programs/tributary/src/state/*.rs (account structs, PDA seeds)
- programs/tributary/src/error.rs (error codes)
- AGENTS.md (PDA table, architecture overview)
- programs/tributary/src/constants.rs (program IDs, seeds)

## Note
T2 creates initial stubs at these paths. T7 OVERWRITES them with full content. If T2 hasn't run yet, T7 creates the files directly.

## Summary of Changes

All 7 Protocol Reference top-level pages created/overwritten under `apps/docs/docs/protocol-reference/`:

| File | Lines | Content |
|---|---|---|
| `overview.md` | 137 | Full mermaid of account relationships, dual policy families, execution lifecycle, shared PolicyType enum, fee distribution flow, links to sub-pages |
| `accounts-and-pdas.md` | 247 | Full PDA seed table (8 entries), per-account field tables with sizes (ProgramConfig, PaymentGateway, UserPayment, PaymentPolicy, ComposablePolicy + ForwardConfig/ValidationConfig, ValidationPda, ReferralAccount), rent strategy, counter separation, legacy PaymentsDelegate note |
| `idl.md` | 79 | Program ID, how to fetch on-chain IDL via `anchor idl fetch`, instruction family table, mutability/signer rules, SDK consumers |
| `deployment.md` | 78 | Same program ID on Devnet+Mainnet (`TRib…42tJ`), RPC endpoints, verification via `solana program show`, bytecode dump, local dev (Surfpool), no Testnet note |
| `error-codes.md` | 111 | Full table of all **58** `TributaryError` variants (verified against `error.rs`), grouped by category (Validation/Referral/Token/Forward/Validation/Authorization), with plain-English remediation for each. Anchor codes 6000-6057. |
| `changelog.md` | 118 | Unreleased entry for composable merge (Added/Changed/Security/Removed), pre-release direct-pull entry, versioning notes |
| `security.md` | 168 | Token delegation model, v0→v1 dual-delegate migration, Token-2022 rejection rationale, CPI hardening (allowlists/signer sanitization/ByteRangeCheck/intermediate-ATA ownership/net min_output), emergency pause, user + operator guidance, "audits pending" disclaimer with GitHub link |

Total: 938 lines across 7 files. Error coverage verified: `rg` on `error.rs` returns 58 variants, docs table contains 58 `| 60xx |` rows — 1:1 match.

Files NOT committed (per orchestrator instructions).
