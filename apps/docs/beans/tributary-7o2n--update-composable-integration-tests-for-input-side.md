---
# tributary-7o2n
title: Update composable integration tests for input-side fee model (ADR-0026)
status: todo
type: task
priority: normal
created_at: 2026-07-05T08:44:18Z
updated_at: 2026-07-05T08:44:29Z
blocked_by:
    - tributary-cqr4
---

The topup-balance-swap, topup-balance-sol, topup-balance, and composable integration tests reference fee accounts as output_mint (WSOL) ATAs. Post-ADR-0026 these are input_mint (USDC) ATAs. Also: executeComposable account overrides need updating for act-mode (SystemProgram as output_mint) and deliver-no-transform (input_mint recipient ATA) shapes. Requires Surfpool to run.
