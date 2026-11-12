---
# tributary-cpqp
title: 'SZ-M-2: pre-funding intermediate ATA / validation PDAs permanently bricks a composable policy for ~0.00065 SOL'
status: todo
type: bug
priority: high
created_at: 2026-11-12T12:15:24Z
updated_at: 2026-11-12T12:15:24Z
---

Slot Zero 2026-11-08 §T2 (ID SZ-M-2, programs/tributary/security-checklist.md).

MECHANISM (verified at 4b0a32e9): execute_composable requires the deterministic intermediate ATA(policy PDA, input_mint) to satisfy ata.lamports() == 0 (IntermediateAccountAlreadyExists); create_composable_policy requires ValidationPda::is_fresh (lamports 0 + system-owned) on the deterministic composable_validation_pre/post PDAs. The addresses are empty between executions, so anyone can system-transfer the 0-byte rent minimum (650,240 lamports) or CreateIdempotent the ATA in a one-time tx; every later execution fails before the pull. Nothing can debit those addresses, so the owner's only remedy is pause/delete/recreate under a new id — which the attacker can pre-fund for the same cost. The is_fresh check came from the M-02 fix; this uses it in the other direction (attacker-funded freshness failure). The one live composable policy (MiLL DCA, AimbrKk…) had both intermediate addresses empty at last check = exposed.

FIX (per report): accept an already-funded/already-created intermediate (top up to rent and initialize if needed) and drop the lamports==0 freshness requirement where an attacker can fund the address. CAREFUL: do not regress the M-02 fix the freshness check was introduced for — the recreated account must still be discriminator-checked / provably unowned-by-attacker (e.g. require token account owned by the policy PDA, amount 0, correct mint).

ACCEPTANCE: griefing regression test — pre-fund the intermediate ATA + validation PDA addresses, then execute/create must succeed (or at minimum remain functional after recreate); control without pre-funding unchanged.

Program change ⇒ update tributary.qedspec and regenerate formal_verification per AGENTS.md.
