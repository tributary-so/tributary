---
# tributary-t4je
title: SDK composable-execution primitives (packages/sdk/)
status: todo
type: feature
priority: high
created_at: 2026-07-15T10:11:49Z
updated_at: 2026-07-15T10:11:49Z
parent: tributary-l8wr
---

# SDK Composable-Execution Primitives

## What

New file `packages/sdk/src/composable.ts` exporting these primitives + types.
Wire into `packages/sdk/src/index.ts`.

## Primitives (TDD — write tests first in `composable.test.ts`)

### 1. `isForwardEnabled(policy: ComposablePolicy): boolean`
- `true` when `policy.forwardConfig.instructionConstraint.programId` is NOT `PublicKey.default()`.
- This is the sentinel check from AGENTS.md: "`Pubkey::default()` disables the forward step entirely."

### 2. `grossCapToFace(grossCap: BN, feeBps: number): BN`
- `feeBps > 0` → `grossCap.muln(10_000).divn(10_000 + feeBps)`
- `feeBps <= 0` → `grossCap`
- This is the PayAsYouGo face→gross adjustment currently duplicated in `evaluator.ts:184` and `execute.ts:68`.
- **Pure function, no I/O.** Testable in isolation.

### 3. `resolveDefaultForwardAmount(policy: ComposablePolicy, gateway: PaymentGateway): BN | null`
- **PayAsYouGo**: `grossCapToFace(maxChunk, feeBps)` capped by `min(_, remainingPeriod)` where `remainingPeriod = maxAmountPerPeriod - currentPeriodTotal`. Returns the capped face.
- **Subscription / Milestone / OneTime**: `null` (program derives from policy; caller may override).
- **UpTo**: `null` (caller must supply actual amount at execute time).
- **Pure function** (reads from the account structs, no RPC).

### 4. `resolveValidationTargets(connection, policyPda, spec, programId, phase): Promise<PublicKey[]>`
- `phase: 'pre' | 'post'` — determines which ValidationPda to derive: `getPreValidationPda` / `getPostValidationPda`.
- If `spec` is not `ProgramCall` → return `[]` (disabled validation).
- Fetch ValidationPda via `connection.getAccountInfo(valPda)`.
- If missing/unreadable → return `[]` (let on-chain pin-check reject loudly — matches current scheduler behavior).
- Parse via `parseValidationPda(acct.data)`.
- Return `parsed.pinnedAccounts.slice(0, parsed.numPinnedAccounts)`.

### 5. `assembleComposableRemainingAccounts({ preTargets, forwardAccounts, postTargets }): AccountMeta[]`
- Assembly order (ADR-0016): `[...preTargets, ...forwardAccounts, ...postTargets]`.
- **preTargets/postTargets**: `{ pubkey, isSigner: false, isWritable: false }`.
- **forwardAccounts**: `{ pubkey, isSigner: false, isWritable: <from builder> }`.
- **ADR-0008 enforcement**: `isSigner` is ALWAYS `false` — this function owns the security boundary.
  Input type for forwardAccounts is `{ pubkey: PublicKey; isWritable: boolean }[]` — no `isSigner`
  field exists, so a builder cannot leak signer authority.

### 6. `ForwardBuilder` interface
```typescript
export interface ForwardBuilder {
  build(ctx: {
    connection: Connection;
    policy: ComposablePolicy;
    composablePolicyPda: PublicKey;
    face: BN;
  }): Promise<{
    instructionData: Buffer;
    forwardAccounts: { pubkey: PublicKey; isWritable: boolean }[];
  }>;
}
```

## Types to export
```typescript
export interface ForwardBuilder { ... }
export type ForwardAccountMeta = { pubkey: PublicKey; isWritable: boolean };
export interface ForwardBuildResult {
  instructionData: Buffer;
  forwardAccounts: ForwardAccountMeta[];
}
```

## TDD checklist
- [ ] `grossCapToFace`: zero fee → identity; positive fee → floor division; edge cases (feeBps=10000, grossCap=1)
- [ ] `resolveDefaultForwardAmount`: PayAsYouGo with fee → adjusted; PayAsYouGo no fee → raw; remainingPeriod cap; subscription → null; UpTo → null
- [ ] `resolveValidationTargets`: disabled spec → []; ProgramCall with valid Pda → sliced pins; missing Pda → []
- [ ] `assembleComposableRemainingAccounts`: correct order; isSigner always false; isWritable from builder for forward, false for validation
- [ ] `isForwardEnabled`: sentinel programId → false; concrete programId → true

## Key references
- ADR-0008: CPI signer sanitization (isSigner must be false on remaining_accounts)
- ADR-0016: ValidationPda is a named account, NOT in remaining_accounts; remaining_accounts = [preTargets, forwardAccounts, postTargets]
- ADR-0026: NET-on-pull (face = what forward consumes; program adds fee to get gross)
- `evaluator.ts:177-194` — current PayAsYouGo amount derivation in scheduler
- `execute.ts:57-70` — current PayAsYouGo amount derivation in CLI
- `composable.ts:295-300` — current `lookupForwardContext` (stays, replaced in Bean 2)
- `composable.ts:558-576` — current `resolveValidationTargets` (private method, to be replaced)
- `sdk.ts:3162-3304` — current `executeComposable` (unchanged, takes assembled remainingAccounts)
