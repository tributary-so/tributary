---
# tributary-tr5d
title: Migrate existing tests to ADR-0017 fee-model API (schedulerShareBps, protocolShareBps rename, default 2000)
status: completed
type: task
priority: normal
created_at: 2026-06-29T13:54:47Z
updated_at: 2026-06-29T14:21:08Z
---

Mechanical migration of existing tests/ files to match the new SDK/program signatures landed in ADR-0017. Changes: (1) createPaymentGateway gets schedulerShareBps as 3rd arg; (2) protocolFeeBps->protocolShareBps; (3) customProtocolFeeBps->customProtocolShareBps; (4) fee math carve-out model; (5) constraint test updates. Verify: npx tsc --noEmit --project jest.tsconfig.json



## Todos

- [ ] Change 1: add `schedulerShareBps=0` (3rd arg) to all 12 `sdk.createPaymentGateway` call sites
- [ ] Change 2: `protocolFeeBps` → `protocolShareBps`; default 100 → 2000
- [ ] Change 3: `customProtocolFeeBps` → `customProtocolShareBps`; update `custom_protocol_fee_bps` comments
- [ ] Change 4: rewrite manual fee math to ADR-0017 carve-out model (topup-balance/-sol/-swap)
- [ ] Change 5: rewrite H-01 constraint tests to `protocol_share + scheduler_share + referral_allocation <= 10000`
- [x] Verify: `npx tsc --noEmit --project jest.tsconfig.json` (0 errors in tests/)


## Summary of Changes

Mechanical migration of `tests/` to the ADR-0017 fee-model API. `tsc` reports **0 errors in tests/** (remaining tsc noise is pre-existing `apps/app/*` JSX/path-alias issues — `jest.tsconfig.json` has no `include` scope; out of scope).

**Change 1 — `createPaymentGateway` 3rd arg `schedulerShareBps=0`** (all 12 call sites):
- `surfpool.test.ts`, `composable.test.ts`, `topup-balance{,-sol,-swap}.test.ts`, `tributary.test.ts` (×7)

**Change 2 — `protocolFeeBps` → `protocolShareBps`, default 100 → 2000:**
- `tributary.test.ts`: `configAccount!.protocolShareBps).toBe(2000)`

**Change 3 — `customProtocolFeeBps` → `customProtocolShareBps`** (5 occurrences, `replaceAll`): `tributary.test.ts`.

**Change 4 — carve-out fee math** (`totalFee = pull·gatewayFeeBps/10000`; `protocolCut = totalFee·protocolShareBps/10000`):
- `topup-balance.test.ts`: rewrote math block. `gatewayFeeBps=0` ⇒ `totalFee=0` ⇒ `netInput=50_000_000`, `expectedHot=90_000_000`, protocol fee account receives 0. Updated "~89.5 USDC" comment → "~90".
- `topup-balance-sol.test.ts` / `topup-balance-swap.test.ts`: protocol-fee check rewritten — asserts `config.protocolShareBps > 0` but, since `gatewayFeeBps=0`, the protocol ATA receives 0 (fresh ATA). Old guard `if (config.protocolFeeBps > 0) { admin > 0 }` was invalid under the carve-out model.

**Change 5 — constraint describe block** (`tributary.test.ts`): renamed to "Fee carve-out share constraint (ADR-0017)". Constraint is now `effective_protocol_share + scheduler_share + referral_allocation ≤ 10000`; `gateway_fee_bps` is no longer part of it (capped only at ≤10000).
- Test 1 (create): boundary now via `schedulerShareBps` — `8001` rejects (2000+8001=10001), `8000` accepts (=10000).
- Test 2 (change_gateway_fee_bps): inverted — `9900` now **accepted** (proves `gateway_fee_bps` left the carve-out constraint).
- Test 3 (update_gateway_protocol_fee): first sets `scheduler_share=1000` via `updateGatewaySchedulerShare`, then `custom_protocol_share=9500` rejects (9500+1000=10500>10000), `8900` accepts (=9900).

**Verification:** `npx tsc --noEmit --project jest.tsconfig.json` → 0 errors in `tests/` after installing the (missing) `@types/node` devDep into the worktree.

## Notes / follow-ups
- Installed `@types/node` (was missing from the worktree — `jest.tsconfig.json` declares `types: ["node","jest"]` but `@types/node` wasn't resolvable). Now a root devDep; tests couldn't be typechecked before.
- The deeper carve-out-routing tests (scheduler-cut lands in signer ATA vs gateway.fee_recipient, NET/gross, referral tiers) belong to bean `tributary-z46l` (blocked) — not touched here; this was an existing-test migration only.
- Runtime behaviour (against Surfpool) not exercised here — only compilation + assertion-logic faithfulness.
