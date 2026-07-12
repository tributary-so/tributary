---
# tributary-ahfg
title: 'BLOCKER: Verify Meteora DLMM swap fits in 2 pinned forward accounts'
status: todo
type: task
priority: critical
created_at: 2026-07-12T19:10:50Z
updated_at: 2026-07-12T19:11:40Z
parent: tributary-u8n4
---

Design decision D3 gate for MAX_PINNED_FORWARD_ACCOUNTS 4→2 (parent tributary-u8n4).

`MAX_PINNED_FORWARD_ACCOUNTS` pins the forward-CPI (Meteora DLMM) account slice. If a real DLMM `swap` CPI references more than 2 accounts that the owner must pin, reducing to 2 BREAKS swap execution and the forward-pin reduction (a) is infeasible as stated — only (b) ships.

## Acceptance criteria
- [ ] Inspect `tests/topup-balance-swap.test.ts` and the DLMM swap account list passed to `execute_composable`'s remaining_accounts.
- [ ] Enumerate every account the Meteora DLMM `swap` ix requires (pool/bin-array, user input ATA, user output ATA, oracle, token vaults, …).
- [ ] Identify which of those must be OWNER-PINNED (vs derivable / program-supplied).
- [ ] Record the pinned-account count. If ≤2 → (a) is feasible. If >2 → (a) descoped; document why and close the forward-pin tasks.
- [ ] If feasible, note which 2 positions are pinned in the canonical swap test.

## Output
A verdict line in the bean body: `DLMM pinned-account count = N → (a) FEASIBLE|DESCOPED`. This unblocks the program task that edits the const.
