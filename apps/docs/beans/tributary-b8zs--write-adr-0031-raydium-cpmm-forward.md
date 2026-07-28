---
# tributary-b8zs
title: Write ADR-0031 Raydium CPMM forward
status: completed
type: task
priority: normal
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T11:42:33Z
parent: tributary-aubo
blocked_by:
  - tributary-2st5
  - tributary-b3jg
---

New apps/docs/adr/0031-raydium-cpmm-forward.md. Capture: second forward program allowlisted, swap_base_input choice, pool_state+amm_config pin layout, peerDependency consumer model, bps-floor slippage default. Update AGENTS.md ADR map + ALLOWED_FORWARD_PROGRAMS reference.

## Summary of Changes

Renumbered ADR-0031 → **ADR-0032** (the sibling investigation epic landed
`0031-settlement-output-post-validation-posture.md` first; both epics raced
for the slot). All code work (allowlist entry, ForwardBuilder, peerDeps,
tsup external) was already landed in prior commits on this branch; this
bean is docs-only.

- **New:** `apps/docs/adr/0032-raydium-cpmm-forward.md` — captures: second
  `ALLOWED_FORWARD_PROGRAMS` entry (Raydium CPMM `CPMMoo8…`); `swap_base_input`
  choice (known `amount_in = face`, ADR-0026); pin layout using both
  ADR-0021 slots (`pool_state` @index 3 + `amm_config` @index 2, the latter
  locks the fee tier against twin-pool re-init); peerDependency consumer
  model (both DEX SDKs optional peerDeps + tsup `external`); bps-floor
  slippage default with `minimumAmountOut` override; no host-fee quirk.
- **Updated:** `AGENTS.md` — ADR map table row + link for [0032]; two
  `ALLOWED_FORWARD_PROGRAMS` references now list both programs (Composable
  ForwardConfig section §"Allowlists" §7, and the ForwardConfig pin docs).

Refs: tributary-b8zs (commit lands the status flip + docs together).
