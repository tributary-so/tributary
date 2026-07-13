---
# tributary-lvcp
title: 'P0 Quickstart: auto-DCA'
status: draft
type: task
priority: critical
created_at: 2026-07-13T11:12:23Z
updated_at: 2026-07-13T11:12:23Z
parent: tributary-9825
---

**File:** new — `apps/docs/docs/quickstarts/p0-auto-dca.md`

**From checklist §D:** P0 Quickstart: auto-DCA. Copy-paste: create Subscription composable policy with price gate + Jupiter/Meteora forward.

**Requirements:**

- Uses Subscription PolicyType with fixed interval + max_renewals
- Lighthouse price-validation guard (post-validation)
- Forward CPI to Jupiter/Meteora DLMM to swap input (e.g. USDC) to output (e.g. SOL)
- Deliver-transform settlement (output_mint != input_mint, output ATA for recipient)
- Full copy-paste with InstructionConstraint for the forward instruction
- Must match actual Meteora DLMM program ID and instruction format

**Current code anchors:** programs/tributary/src/constants.rs (ALLOWED_FORWARD_PROGRAMS), packages/sdk/src/instructions/composable.ts

**Per ADR:** ADR-0021 (InstructionConstraint), ADR-0026 (deliver-transform shape)

**Acceptance:** A developer can copy-paste and have a scheduled DCA running. Forward instruction data and ByteRangeCheck must be correct for actual Meteora DLMM. remainingAccounts order correct.
