---
# tributary-7o2n
title: Update composable integration tests for input-side fee model (ADR-0026)
status: completed
type: task
priority: normal
created_at: 2026-07-05T08:44:18Z
updated_at: 2026-07-05T18:55:47Z
blocked_by:
    - tributary-cqr4
---

The topup-balance-swap, topup-balance-sol, topup-balance, and composable integration tests reference fee accounts as output_mint (WSOL) ATAs. Post-ADR-0026 these are input_mint (USDC) ATAs. Also: executeComposable account overrides need updating for act-mode (SystemProgram as output_mint) and deliver-no-transform (input_mint recipient ATA) shapes. Requires Surfpool to run.

## Summary of Changes

Updated fee account references from output_mint to input_mint (USDC) ATAs across the swap, sol, and composable integration suites per ADR-0026 (input-side fee skim from gross pull before forward).

### tests/topup-balance-swap.test.ts (deliver-transform USDC→WSOL)
- Renamed feeRecipientWsolAta/adminWsolAta → feeRecipientUsdcAta/adminUsdcAta
- Switched fee ATA derivation + creation: NATIVE_MINT → USDC_MINT
- Funded feeRecipient/admin USDC ATAs (was WSOL) at empty balance
- Updated balance-check locals (adminUsdcAfter / feeRecipientUsdcAfter)
- Refreshed stale comments ("output-mint ATAs" → input-side rationale)

### tests/topup-balance-sol.test.ts (NATIVE_OUTPUT deliver-transform USDC→WSOL→SOL)
- Same fee-account flip: WSOL ATAs → USDC ATAs (derivation, creation, funding, balance checks)
- Updated stale comments ("fees sweep WSOL to fee ATAs" → input-side skim pre-forward)

### tests/composable.test.ts (deliver-transform USDC→USDT)
- gatewayFeeAccount / protocolFeeAccount: getAssociatedTokenAddressSync(secondMint, ...) → (tokenMint, ...) at all 3 executeComposable call sites (byte-range / C-1 / paused-policy tests)
- Refreshed setup comment (was "new flow takes fees from OUTPUT")

### tests/topup-balance.test.ts (deliver-no-transform)
- No changes required — already used input_mint (USDC) ATAs for fees and recipientTokenAccount (deliver-no-transform shape correctly handled by existing overrides).

### Verification
Surfpool mainnet-fork, freshly built program (target/deploy/tributary.so):
- topup-balance:        5/5 PASS
- topup-balance-swap:   5/5 PASS
- topup-balance-sol:    5/5 PASS
- composable:          18/18 PASS
(DLMM CU-estimate "InvalidAccountForFee" logs in swap/sol are non-fatal pre-flight noise from Meteora SDK on the fork; the actual swap ix builds and executes clean.)

Note on act-mode: no existing test exercises act-mode (sentinel output_mint); the bean did not require adding one. The deliver-no-transform overrides (input_mint recipient ATA) were already correct in topup-balance.test.ts.
