---
# tributary-hqaf
title: Verify Tributary execute-path assumptions for Act-mode ORE forward
status: todo
type: task
created_at: 2026-07-23T08:04:10Z
updated_at: 2026-07-23T08:04:10Z
parent: tributary-mtxx
---

See milestone tributary-ew9s HANDOFF §3. Confirm in programs/tributary/src/instructions/composable/execute_composable.rs: (1) Act mode (output_mint sentinel) sweeps input residue back to the user and closes the intermediate input ATA itself — so a forward closing it breaks settle; (2) only the ComposablePolicy PDA gets isSigner=true in the forward CPI (build_forward_account_metas); (3) a 1-byte ByteRangeCheck at offset 0 satisfies DiscriminatorCheckRequired in create_composable_policy.rs; (4) pinnedAccounts enforcement at execute time. Output: notes appended to this bean, feeding the design doc.
