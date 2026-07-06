---
# tributary-g84i
title: Migrate 4 TS test files to Composable v2.1 API
status: completed
type: task
priority: high
created_at: 2026-07-02T14:27:58Z
updated_at: 2026-07-02T14:53:13Z
parent: tributary-3s4i
---

Apply the same migration already done in tests/composable.test.ts to topup-balance.test.ts, topup-balance-swap.test.ts, topup-balance-sol.test.ts, one-time-payment.test.ts. ForwardConfig.instructionConstraint, ValidationSpec pre/post split, 7-arg createComposablePolicy, preValidationPda/postValidationPda accounts, degenerate-pin guard.

## Summary of Changes

Migrated all 4 deferred test files to the Composable v2.1 API (same migration already applied to `tests/composable.test.ts`).

**Files fixed:**
- `tests/topup-balance.test.ts`
- `tests/topup-balance-swap.test.ts`
- `tests/topup-balance-sol.test.ts`
- `tests/one-time-payment.test.ts`

**Per-file changes (uniform across all 4):**
1. Imports: `getValidationPda` → `getPreValidationPda` + `getPostValidationPda` (old export removed from SDK).
2. Added module-level helpers mirroring `composable.test.ts`: `DISABLED_SPEC`, `DISABLED_INIT`, `programCallSpec()`, `validationInit()`.
3. State: `let validationPDA` → `preValidationPDA` + `postValidationPDA`.
4. PDA derivation: single `getValidationPda(...)` → both pre + post PDAs.
5. `forwardConfig`: flattened `targetProgram`/`numDataChecks`/`dataChecks`/`minOutputAmount` → nested under `instructionConstraint` (`programId`/`numDataChecks`/`dataChecks`/`numPinnedAccounts`/`pinnedAccounts`). `minOutputAmount` removed (post_validation generalizes it).
   - DISABLED forward (topup-balance, one-time-payment): `programId = PublicKey.default`, `numDataChecks = 0`, zeroed pins.
   - ENABLED forward (swap, sol): `programId = METEORA_DLMM_PUBKEY`, pinned `swapIx.keys[0].pubkey` (lbPair) at slot 0 to satisfy the degenerate-pin guard at create AND the positional pin-check at execute.
6. `createComposablePolicy`: 6-arg → 7-arg `(policyType, memo, forwardConfig, preSpec, preInit, postSpec, postInit)`. Pre = `programCallSpec(LIGHTHOUSE_PUBKEY)` + `validationInit([target], guard.data)`; Post = `DISABLED_SPEC` + `DISABLED_INIT`.
7. `accountsStrict` (create + both execute blocks per file): `validationPda`/`validationProgram` → `preValidationPda` + `postValidationPda` + `preValidationProgram` + `postValidationProgram`.
8. Policy assertions: `forwardConfig.targetProgram`/`numDataChecks` → `forwardConfig.instructionConstraint.programId`/`numDataChecks`. `validationConfig.validationProgram` → `preValidation`/`postValidation` enum checks.
9. `parseValidationPda` reads from `preValidationPDA` (topup-balance), since assertion data now lives in the pre PDA.

**Key correctness call:** on-chain `create_composable_policy::validate_spec_and_program` REQUIRES the passed program to equal `SystemProgram.programId` for `ValidationSpec::Disabled`. Used `SystemProgram.programId` for all disabled phases (the reference `composable.test.ts` uses `PublicKey.default` in one both-disabled create case — that's a latent bug there; `SystemProgram.programId` is correct in both create + execute).

**Verification:**
- Per-file `tsc --noEmit` clean.
- Full-project `tsc --noEmit -p tsconfig.json`: zero errors in any `tests/` file (5529 pre-existing errors elsewhere, unrelated).
- `prettier --check`: all 4 files pass.
- Diff stat: 312 insertions, 134 deletions across 4 files.

**Not run:** jest execution requires Surfpool mainnet-fork (`surfpool start --legacy-anchor-compatibility --no-tui`); compile/lint verification only, per the original deferral note.
