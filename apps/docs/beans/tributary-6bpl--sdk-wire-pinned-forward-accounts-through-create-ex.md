---
# tributary-6bpl
title: 'SDK: wire InstructionConstraint + post_validation + two ValidationPDAs'
status: todo
type: task
priority: normal
created_at: 2026-07-02T08:01:05Z
updated_at: 2026-07-02T11:46:18Z
parent: tributary-ksdy
blocked_by:
    - tributary-q82g
---

SDK wiring for route pinning (epic parent). Blocked by child 1 (on-chain).

## create side

`getCreateComposablePolicyInstruction` gains an optional `pinnedForwardAccounts`
param (`Pubkey[] | null`). When provided, the SDK:

1. derives `ForwardAccountsPda` (seed `["composable_forward_accounts", composablePolicy]`),
2. emits the init-the-table ix (or folds init into `create_composable_policy` —
   match whatever child 1 lands on),
3. sets `ForwardConfig.forward_accounts_pda` to the PDA.

When null/omitted: sentinel (`PublicKey.default`), current behaviour.

## execute side

`executeComposable` passes `ForwardAccountsPda` as a named account when the
policy has route pinning enabled (analogous to how `ValidationPda` is now a
named `Option<Account>` post-child-A). The caller still assembles the full
`remaining_accounts` forward slice; the SDK validates the pinned prefix matches
the table client-side where feasible (defence in depth, optional).

## Acceptance

- [ ] `createSubscription`/`createComposable` helpers accept `pinnedForwardAccounts`.
- [ ] `executeComposable` resolves `ForwardAccountsPda` and injects it.
- [ ] `packages/sdk` builds clean (DTS + ESM).
- [ ] Existing topup tests (`topup-balance*.test.ts`) still compile against new IDL.


---

## REWRITTEN SCOPE (2026-07-02 grilling — supersedes all content above)

**Old:** SDK wiring for ForwardAccountsPda (separate PDA, sentinel reference).
**New:** SDK wiring for InstructionConstraint (inline) + post_validation + two ValidationPDAs.

### create side

`getCreateComposablePolicyInstruction` gains:

1. **InstructionConstraint builder** — replaces separate targetProgram + dataChecks + pinnedForwardAccounts params:
   ```typescript
   const ic = sdk.buildInstructionConstraint({
     programId: METEORA_DLMM,        // must be in ALLOWED_FORWARD_PROGRAMS
     dataChecks: [{ offset: 0, expected: discriminatorBytes }],  // pin discriminator
     pinnedAccounts: [lbPair, reserveX, reserveY],  // positional route pinning (≤4)
   });
   ```
   `pinnedAccounts` is optional (null/empty = no route pinning). Each entry or null = wildcard slot.

2. **preValidation + postValidation** — replaces single validationProgram + validationData:
   ```typescript
   const preGuard = lighthouse.tokenAccount(hotWalletAta).amount(50e6, '<').build();
   const postGuard = lighthouse.tokenAccount(outputAta).amount(minOutput, '>=').build();
   
   // ProgramCall = CPI to Lighthouse; Disabled = skip; Inline = errors (future)
   ```
   Each guard produces { data, numAccounts, accounts } — stored in the corresponding ValidationPda (pre/post).

3. **min_output_amount REMOVED** — no longer a ForwardConfig field. Replaced by post_validation assertion.

### execute side

`executeComposable` remaining_accounts layout changes:
```
[pre_validation_pda?, ...pre_lighthouse_targets,
 post_validation_pda?, ...post_lighthouse_targets,
 ...forward_accounts]
```
Each validation slice present only when the corresponding ValidationSpec is ProgramCall. Slice length = ValidationPda.num_pinned_accounts.

The SDK resolves both ValidationPDAs by seed and injects them as named Option<Account> when active.

### SDK helpers

- `sdk.buildInstructionConstraint({...})` — builds the InstructionConstraint struct
- `sdk.setPostValidationMinOutput(floor)` — convenience: builds a Lighthouse 'token account amount >= floor' assertion + creates post ValidationPda automatically. Replaces the old min_output_amount: Some(n) UX.

### Acceptance

- [ ] createComposable accepts InstructionConstraint (programId, dataChecks, pinnedAccounts).
- [ ] createComposable accepts preValidation + postValidation (each: ValidationSpec + optional assertion data).
- [ ] createComposable rejects Inline ValidationSpec (not implemented).
- [ ] executeComposable resolves pre/post ValidationPDAs by seed, injects as Option<Account>.
- [ ] remaining_accounts layout: [pre_pda?, ...pre_targets, post_pda?, ...post_targets, ...forward].
- [ ] packages/sdk builds clean (DTS + ESM).
- [ ] Existing topup tests (topup-balance*.test.ts) updated and compiling against new IDL.
- [ ] setPostValidationMinOutput helper produces correct Lighthouse assertion bytes.
