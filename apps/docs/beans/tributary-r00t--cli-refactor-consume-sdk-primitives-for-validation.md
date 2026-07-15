---
# tributary-r00t
title: CLI refactor — consume SDK primitives for validation + assembly (apps/cli/)
status: todo
type: task
priority: high
created_at: 2026-07-15T10:13:17Z
updated_at: 2026-07-15T12:28:17Z
parent: tributary-l8wr
blocked_by:
    - tributary-t4je
---

# CLI Refactor — Consume SDK Primitives for Validation + Assembly

## What

Refactor `apps/cli/src/commands/composable-policy/execute.ts` to consume SDK primitives.
The CLI keeps its raw `--forward-ix` / `--forward-accounts` path (no ForwardBuilder support —
that's Bean 2).

## Changes

### Replace inline validation-target resolution (lines 78–106)

Before (pre-validation, ×2 for pre+post):
```typescript
let preValAccounts: PublicKey[] = []
if ('programCall' in policyAccount.preValidation) {
  const {address: preValPda} = getPreValidationPda(policy, sdk.programId)
  const acctInfo = await sdk.connection.getAccountInfo(preValPda)
  if (acctInfo) {
    const parsed = parseValidationPda(acctInfo.data)
    preValAccounts = parsed.pinnedAccounts.slice(0, parsed.numPinnedAccounts)
  }
}
```

After:
```typescript
import { resolveValidationTargets, assembleComposableRemainingAccounts,
  resolveDefaultForwardAmount } from "@tributary-so/sdk";

let preValAccounts = await resolveValidationTargets(
  sdk.connection, policy, policyAccount.preValidation, sdk.programId, 'pre');
if (flags['validation-accounts']) {
  preValAccounts = flags['validation-accounts'].split(',').map(s => new PublicKey(s.trim()));
}
```

### Replace inline assembly (lines 113–120)

Before:
```typescript
const remainingAccounts: AccountMeta[] = [
  ...preValAccounts.map(pubkey => ({isSigner: false, isWritable: false, pubkey})),
  ...forwardAccounts.map(pubkey => ({isSigner: false, isWritable: true, pubkey})),
  ...postValAccounts.map(pubkey => ({isSigner: false, isWritable: false, pubkey})),
];
```

After:
```typescript
const remainingAccounts = assembleComposableRemainingAccounts({
  preTargets: preValAccounts,
  forwardAccounts: forwardAccounts.map(pubkey => ({pubkey, isWritable: true})),
  postTargets: postValAccounts,
});
```

Note: CLI's `--forward-accounts` are raw pubkeys (no writability info). We preserve the
current behavior: `isWritable: true` for all CLI-provided forward accounts. The builder-based
path (Bean 2) will provide per-account writability.

### Replace inline PayAsYouGo amount (lines 57–70)

Before:
```typescript
if (flags['forward-amount']) {
  forwardAmount = new BN(flags['forward-amount'])
} else if (variant === 'payAsYouGo') {
  const maxChunk = policyAccount.policyType.payAsYouGo.maxChunkAmount
  const gatewayAccount = await sdk.program.account.paymentGateway.fetchNullable(...)
  const feeBps = gatewayAccount.gatewayFeeBps
  forwardAmount = feeBps > 0 ? maxChunk.muln(10_000).divn(10_000 + feeBps) : maxChunk
}
```

After:
```typescript
if (flags['forward-amount']) {
  forwardAmount = new BN(flags['forward-amount'])
} else if (variant === 'payAsYouGo') {
  const gatewayAccount = await sdk.program.account.paymentGateway.fetchNullable(
    policyAccount.gateway)
  if (!gatewayAccount) this.error('Gateway not found')
  forwardAmount = resolveDefaultForwardAmount(
    policyAccount as ComposablePolicy, gatewayAccount as PaymentGateway)
}
```

Note: `resolveDefaultForwardAmount` also caps by `remainingPeriod`, which the current CLI
code does NOT do. This is an improvement — prevents exceeding the period cap.

### Remove now-unused imports
- `getPreValidationPda`, `getPostValidationPda`, `parseValidationPda` — now used inside
  the SDK primitive, not needed at the CLI level
- Keep: `getPostValidationPda` only if other CLI commands still use it (check before removing)

## TDD checklist
- [ ] CLI produces identical remaining_accounts order as before
- [ ] `--validation-accounts` / `--post-validation-accounts` overrides still work
- [ ] `--forward-amount` override still works
- [ ] PayAsYouGo without `--forward-amount` resolves via `resolveDefaultForwardAmount`
- [ ] Lint passes: `pnpm --filter @tributary-so/cli run lint` (check exact filter name)

## Key references
- Milestone D5 (CLI keeps raw --forward-ix, no builder support)
- `execute.ts:78-106` — validation-target inline blocks to replace
- `execute.ts:113-120` — assembly block to replace
- `execute.ts:57-70` — PayAsYouGo amount to replace

## Summary of Changes

Refactored `apps/cli/src/commands/composable-policy/execute.ts` to consume SDK composable primitives (ADR-0030):

- **Validation-target resolution**: replaced the two inline `getPreValidationPda`/`getPostValidationPda` + `parseValidationPda` blocks (pre & post) with `resolveValidationTargets(...)`.
- **remaining_accounts assembly**: replaced the inline `AccountMeta[]` spread with `assembleComposableRemainingAccounts({...})`. CLI `--forward-accounts` still mark every forward account writable (raw pubkey path, no builder — Bean 2 territory).
- **PayAsYouGo face amount**: replaced the inline `maxChunk.muln(10_000).divn(10_000 + feeBps)` with `resolveDefaultForwardAmount(policyAccount, gateway)`. This also adds the period-cap floor (`BN.min(face, remainingPeriod)`) the old inline math lacked — an improvement that prevents exceeding the per-period allowance.
- **Imports**: dropped `getPostValidationPda`, `getPreValidationPda`, `parseValidationPda`, and the `AccountMeta` type from `execute.ts` (all still used by `pda/validation-pda.ts`); added `resolveValidationTargets`, `assembleComposableRemainingAccounts`, `resolveDefaultForwardAmount` and types `ComposablePolicy`, `PaymentGateway` from `@tributary-so/sdk`.

Verification:
- `pnpm --filter @tributary-so/cli run lint` — passes (only pre-existing unrelated `complexity` warning in `payment-policy/create.ts`).
- `tsc --noEmit -p apps/cli/tsconfig.json` — clean compile, zero errors.

Behavior preserved: remaining_accounts order `[...pre, ...fwd, ...post]`, flag overrides (`--validation-accounts`, `--post-validation-accounts`, `--forward-amount`), and the PayAsYouGo-only guard on `--forward-amount`.
