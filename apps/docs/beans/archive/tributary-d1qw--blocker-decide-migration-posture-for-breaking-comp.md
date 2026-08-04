---
# tributary-d1qw
title: 'BLOCKER: Decide migration posture for breaking ComposablePolicy layout change'
status: scrapped
type: task
priority: critical
created_at: 2026-07-12T19:10:50Z
updated_at: 2026-07-12T19:17:22Z
parent: tributary-u8n4
---

Design decision D1 gate for MAX_PINNED_FORWARD_ACCOUNTS 4→2 (parent tributary-u8n4).

Tributary IS deployed on mainnet (Anchor.toml `programs.mainnet`). Shrinking `InstructionConstraint.pinned_accounts: [Pubkey; 4]` → `[Pubkey; 2]` shifts every field after it in ComposablePolicy (pre_validation, post_validation, memo, recipient, totals, timestamps, padding) → existing mainnet ComposablePolicy accounts become un-deserializable by new code.

## Acceptance criteria
- [ ] Audit mainnet for live ComposablePolicy accounts (count + token value held).
- [ ] Pick ONE posture:
  - (i) Pre-PMF wipe — accept the break, flagged upgrade, document.
  - (ii) Program-ID bump — fresh deploy, legacy read-only.
  - (iii) Versioned layout + migration ix — most work, only if real state must survive.
- [ ] Record the decision + rationale in this bean body AND in ADR-0030.
- [ ] If (iii) chosen, spawn a sub-task for the migration instruction (out of this milestone's current scope — would expand it).

## Output
A verdict line: `Posture = (i|ii|iii). Rationale: …`. This unblocks the program task that edits the const.

## Reasons for Scrapping

Composable is NOT deployed on mainnet (or anywhere) — the develop branch carries greenfield code. The `programs.mainnet` entry in Anchor.toml is program-ID reservation, not live state. No ComposablePolicy accounts exist to break, so no migration posture is needed. Account-layout is freely mutable. Scrapped 2026-07-12.
