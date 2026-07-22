---
# tributary-404h
title: Raydium CPMM forward support
status: todo
type: milestone
priority: normal
created_at: 2026-07-22T11:40:46Z
updated_at: 2026-07-22T11:41:05Z
---

Add Raydium CPMM as a second ALLOWED_FORWARD_PROGRAM and ship a matching ForwardBuilder in @tributary-so/forward-builders. Includes a security investigation into intermediate-output non-zero post_validation (generalizes to all forward programs).

## Design decisions

### Forward program: Raydium CPMM (`CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`)

Two swap instructions exist; **use `swap_base_input`** (disc `[143,190,90,218,196,30,51,222]`):
- Takes `amount_in` + `minimum_amount_out` — matches Tributary's known-`face` forward model (we pull a fixed amount, not a target-output amount).
- `swap_base_output` is for "I want exactly X out" — wrong shape.
- 13 fixed accounts (no DLMM-style dynamic bin arrays). Payer = `composablePolicyPda` at index 0; `pool_state` at index 3.

### InstructionConstraint pin layout
- `programId = CPMMoo8…`
- `dataChecks[0]` = swap_base_input discriminator at offset 0 (closes selector-substitution boundary, satisfies `DiscriminatorCheckRequired`).
- `pinnedAccounts[0]` = `{ index: 3, pubkey: pool_state }` (ADR-0021 gives 2 slots).
- **Open:** spend `pinnedAccounts[1]` on `amm_config` (index 2) to lock the fee tier, since the same token pair can be re-initialized under different configs. Recommend YES — meteora only pins pool; CPMM's config-malleability makes the second pin worth it.

### peerDependencies restructure (both forward-program SDKs)
`@meteora-ag/dlmm` moves from `dependencies` → `peerDependencies` (optional). `@raydium-io/raydium-sdk-v2` added the same way. Consumer installs only what they import. **Coordinated requirement:** `tsup.config.ts` currently has `external: []` which inlines deps — must become `external: ["@meteora-ag/dlmm", "@raydium-io/raydium-sdk-v2"]` or the peerDep declaration is a lie (both get bundled regardless).

### Slippage / minimum_amount_out
Default to bps-floor parity with the meteora builder (`min_out = floor(face * (10000 - bps) / 10000)`). Constant-product AMM means exact quote is computable from vault reserves, but pulling reserves adds an RPC roundtrip in `build()`. Ship the lazy default first; exact-quote is a follow-up if callers complain. A `minimumAmountOut` override hook on the builder opts lets advanced callers supply their own.

### No host-fee quirk
CPMM has no Meteora-style SystemProgram host-fee bug → no `applyHostFeeInFix` equivalent. Simpler builder.
