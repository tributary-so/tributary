---
# tributary-j8dn
title: Lighthouse assertion facade in @tributary-so/sdk
status: completed
type: feature
priority: high
created_at: 2026-06-24T10:41:09Z
updated_at: 2026-06-24T11:04:29Z
---

Replace the hand-rolled `buildLighthouseTokenAccountAmountAssertion` serializers
(tests/topup-balance.test.ts:54, tests/topup-balance-swap.test.ts:56 — 12 magic
bytes, only TokenAccount::Amount) with a type-safe fluent facade backed by the
vendored official Lighthouse client (`packages/lighthouse` = lighthouse-sdk-legacy).

The facade serializes the Lighthouse *instruction data* buffer (stored in
ValidationPda, replayed via CPI) using the bundle's per-instruction data
serializers. It exposes ALL assertion families + multi variants.

Scope boundary: the facade ONLY owns Lighthouse target_account(s). Construction of
Tributary's remaining_accounts list (ValidationPDA + target accounts) stays in the
caller/tests as-is.

Design:
- LIGHTHOUSE_PROGRAM_ID constant + operator enum re-exports (IntegerOperator, EquatableOperator)
- LighthouseAssertion { data: Buffer; numAccounts: number; accounts: AccountMeta[] }
- Fluent: lighthouse.tokenAccount(target).amount(n, op).build(), mintAccount, accountInfo,
  accountData, accountDelta, sysvarClock, stakeAccount + multi variants

## Tasks
- [x] Verify lighthouse-sdk-legacy workspace dep resolves + data serializers run under sdk's umi@^1.4 (skew risk 0.9 vs 1.4) — RESOLVED: deduped lighthouse deps to umi@^1.4.1/web3@^1.98.4, byte-for-byte match vs hand-rolled
- [x] Add packages/lighthouse as workspace dep of packages/sdk
- [x] Write packages/sdk/src/lighthouse.ts facade (fluent, all families + multi)
- [x] Export from packages/sdk/src/index.ts
- [x] Replace manual builder in tests/topup-balance.test.ts with facade
- [x] Replace manual builder in tests/topup-balance-swap.test.ts with facade
- [x] Build SDK (pnpm run build in packages/sdk) — typecheck clean
- [x] tsc on tests/ — clean (zero errors on changed files; 0 lighthouse errors)

## Summary of Changes

- Vendored official Lighthouse client into packages/lighthouse (lighthouse-sdk-legacy). Deduped its deps to umi@^1.4.1 + web3.js@^1.98.4 to match the workspace (was pinned umi@0.9 + web3@1.91, which created a broken second dep graph). Data serializers verified byte-for-byte against the prior hand-rolled output.
- Added packages/sdk/src/lighthouse.ts: fluent anti-corruption facade over the bundle's per-instruction data serializers. Covers ALL assertion families + multi variants: tokenAccount, mintAccount, accountInfo, accountData, accountDelta, sysvarClock, stakeAccount, merkleTree. Auto-selects single (1 assertion) vs multi (>1) instruction. Operator sugar ("<", ">=", "!=", ...) + enum re-exports (IntegerOperator, EquatableOperator, LogLevel). Callers never see umi types.
- Scope honored: facade owns ONLY Lighthouse target_account(s); Tributary remaining_accounts assembly unchanged.
- Exported from packages/sdk/src/index.ts; lighthouse-sdk-legacy wired as workspace:* dep.
- Replaced the manual 12-byte buildLighthouseTokenAccountAmountAssertion in tests/topup-balance.test.ts + tests/topup-balance-swap.test.ts with lighthouse.tokenAccount(ata).amount(n, "<").build(). Removed all magic-number operators (OP_LESS_THAN).
- Verification: SDK typecheck clean, SDK build clean, SDK lint clean, tests typecheck clean (0 errors on changed files), runtime smoke test confirms facade output == hand-rolled bytes + multi/sysvar/delta account counts correct.

## Verification
- pnpm run build in packages/sdk: success
- tsc -p tsconfig.json: 0 errors on changed files, 0 lighthouse errors
- node runtime: single.amount(50000000,'<').build().data == hand-rolled 09000280f0fa020000000003
