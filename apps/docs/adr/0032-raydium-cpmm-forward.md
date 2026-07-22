# Raydium CPMM as a second `ALLOWED_FORWARD_PROGRAM`

The composable forward step (ADR-0009, ADR-0021) was launched with a single
allowlisted forward program: Meteora DLMM
(`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`). This ADR locks in the
decision to allowlist a **second** forward program — Raydium CPMM
(`CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`) — and to ship a matching
`ForwardBuilder` in `@tributary-so/forward-builders`.

> **Numbering note.** This ADR was scoped as "ADR-0031" before the sibling
> investigation epic (tributary-404h → post_validation posture) landed its
> own ADR-0031 (`0031-settlement-output-post-validation-posture.md`) first.
> Both epics raced for the slot; the settlement-output ADR landed first, so
> the Raydium CPMM ADR is renumbered to **0032**. No content overlap — the
> two ADRs are independent.

## Decision

### 1. Forward program: Raydium CPMM (`CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`)

Added as the second entry in `ALLOWED_FORWARD_PROGRAMS`
(`programs/tributary/src/constants.rs:14-17`), alongside Meteora DLMM.
Raydium CPMM is a constant-product AMM (`x*y=k`) — simpler than DLMM's bin
model: a fixed 13-account swap instruction, no dynamic bin arrays, no
host-fee `SystemProgram` quirk (see §5).

### 2. `swap_base_input`, not `swap_base_output`

CPMM exposes two swap instructions. **`swap_base_input`** is the one
Tributary uses. Rationale:

- It takes `amount_in` + `minimum_amount_out` — a known input amount with a
  slippage floor. This matches Tributary's known-`face` forward model: the
  composable pull moves a fixed `face` into `intermediate_input`, and the
  forward consumes exactly `face` (ADR-0026 — fees are skimmed input-side
  before the forward runs, so `amount_in = face` is stable regardless of
  gateway fee-bps).
- `swap_base_output` takes a target `minimum_amount_out` as the exact output
  and solves for the required input — the wrong shape for a pull-payment
  that knows what it pulled, not what it wants to deliver.

The `swap_base_input` Anchor discriminator is
`[143, 190, 90, 218, 196, 30, 51, 222]` (first 8 bytes of
`sha256("global:swap_base_input")`).

### 3. InstructionConstraint pin layout (pool_state + amm_config)

ADR-0021 gives `pinned_accounts` two slots. The CPMM constraint uses **both**:

| slot | index | account      | why pinned                                                                                                                                                        |
| ---- | ----- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | 3     | `pool_state` | the pool being swapped through (same as Meteora pins the lbPair)                                                                                                  |
| 1    | 2     | `amm_config` | locks the fee tier — the same token pair can be re-initialized under different configs, and a higher-fee twin pool is an unconstrained routing vector if unpinned |

Plus `dataChecks[0]` = the `swap_base_input` discriminator at offset 0
(required by `DiscriminatorCheckRequired`; closes the selector-substitution
boundary so the gateway signer cannot swap in a different CPMM instruction —
deposit / withdraw / initialize — at execute time).

Source of truth: `packages/forward-builders/src/raydium-cpmm.ts`
(`raydiumCpmmForwardConfig`). The fire-time builder
(`createRaydiumCpmmForward`) and the setup-time constraint are co-located in
the same file so the programId, pinned pool + amm_config, and swap selector
the builder emits are exactly the fields the constraint pins on-chain
(ADR-0030).

### 4. peerDependency consumer model (both forward-program SDKs)

`@meteora-ag/dlmm` was previously a hard `dependency` of
`@tributary-so/forward-builders`. With a second forward program arriving,
hard-depending on both DEX SDKs would force every consumer to bundle both —
even browser apps that never touch composable forwards. Restructured:

- `@meteora-ag/dlmm` and `@raydium-io/raydium-sdk-v2` both move to
  **optional `peerDependencies`** (`peerDependenciesMeta.optional: true`).
- `tsup.config.ts` `external` lists both — otherwise tsup inlines them and
  the peerDep declaration is a lie (both get bundled regardless of what the
  consumer imports).
- Consumer installs only the SDK for the forward program they actually
  import. The `ForwardBuilder` interface (ADR-0030) lives in
  `@tributary-so/sdk`, which gains **zero** forward-program dependencies.

### 5. bps-floor slippage default; `minimumAmountOut` override hook

Default `minimum_amount_out = floor(face * (10000 - slippageBps) / 10000)` —
bps-floor parity with the Meteora builder. Constant-product AMM means an
exact quote is computable from vault reserves, but pulling reserves adds an
RPC roundtrip in `build()`. Ship the lazy default first (zero-RPC `build()`,
matching the Meteora builder's no-quote posture); exact-quote is a follow-up
if callers complain.

`RaydiumCpmmForwardOptions.minimumAmountOut?: BN` lets an advanced caller
supply their own computed quote — the builder skips the bps-floor when set.

### 6. No host-fee quirk

Unlike Meteora DLMM (whose host-fee input is incorrectly declared as
`SystemProgram` and requires an `applyHostFeeInFix` rewrite in the builder),
CPMM has no such quirk. The CPMM builder does not patch any account — it
passes the swap instruction's own account list through verbatim (preserving
per-account `isWritable`, ADR-0030 §4).

## Rejected alternatives

1. **`swap_base_output`.** Wrong shape: it solves for the input required to
   hit a target output. Tributary knows the pulled `face`, not the desired
   delivery amount. The forward's `amount_in` must equal `face` (ADR-0026
   NET-on-pull), which only `swap_base_input` expresses directly.

2. **Pin only `pool_state` (leave `amm_config` unpinned).** The same token
   pair can be re-initialized under different CPMM `amm_config` fee tiers.
   An unpinned config lets a gateway route through a higher-fee twin pool
   that shares the same `pool_state` token pair — an unconstrained fee
   vector. The second ADR-0021 pin slot exists precisely for this; spending
   it on `amm_config` is worth more than leaving it empty.

3. **Exact-quote default (read vault reserves in `build()`).** Adds an RPC
   roundtrip to every `build()` call and couples the builder to CPMM
   vault-account layout. The bps-floor default is what the Meteora builder
   already ships; parity keeps the two builders interchangeable. Exact-quote
   is available via the `minimumAmountOut` override for callers who want it.

4. **Hard-depend on both DEX SDKs in `forward-builders`.** Every consumer —
   including browser apps, the landing page, the showcase — would bundle
   both `@meteora-ag/dlmm` and `@raydium-io/raydium-sdk-v2` regardless of
   which forward they use. Optional peerDeps + tsup `external` make the DEX
   SDKs truly opt-in, which is what "pluggable forward programs" (ADR-0030)
   actually means.

## Cross-references

- **ADR-0009** — composable hooks are sentinel-disabled + externally stored;
  the forward program is one such hook. CPMM is now a second allowlisted
  sentinel target.
- **ADR-0021** — `InstructionConstraint` + indexed `pinned_accounts` (2
  slots). CPMM uses both slots (pool_state + amm_config).
- **ADR-0026** — input-side fees; `amount_in = face` is stable regardless of
  fee-bps. This is what makes `swap_base_input` (known `amount_in`) the
  correct CPMM instruction.
- **ADR-0030** — `ForwardBuilder` interface + `@tributary-so/forward-builders`
  package. The CPMM builder is the second implementation (after Meteora
  DLMM), validating the pluggable-builder extraction.
- **ADR-0031** — settlement-output post_validation posture. The output-mint
  substitution analysis there closes the "gateway misroutes
  `destination_token_account`" vector for **all** forward programs, CPMM
  included (CPMM account index 11 is intentionally not pinned; the
  ATA-derivation check + `>0` guard fail it closed).

(bean tributary-aubo / tributary-b8zs)
