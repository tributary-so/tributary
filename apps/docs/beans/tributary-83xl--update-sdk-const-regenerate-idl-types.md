---
# tributary-83xl
title: Update SDK const + regenerate IDL types
status: completed
type: task
priority: normal
created_at: 2026-07-12T19:12:53Z
updated_at: 2026-07-13T06:31:36Z
parent: tributary-e4zm
blocked_by:
    - tributary-jsna
---

Parent tributary-e4zm. SDK mirror of the forward-pin reduction. No SDK change for validation-data (the Buffer is variable-length; no MAX mirror exists in packages/sdk — confirmed by grep).

## Touch points
- `packages/sdk/src/constants.ts:71` — `export const MAX_PINNED_FORWARD_ACCOUNTS = 4` → `2`. Update the comment (drops the `Covers a Meteora DLMM route` claim if DLMM needs >2 — cross-ref blocker tributary-ahfg).
- `packages/sdk/src/sdk.ts:3971` — `while (pins.length < MAX_PINNED_FORWARD_ACCOUNTS)` padding loop in `makeValidationInit` (auto-tracks via the const; verify it still pads to the new capacity).
- `packages/sdk/src/types.ts` — `InstructionConstraint` / `ForwardConfig` derive from `IdlTypes<Tributary>`. After `anchor build` regenerates the IDL with the new layout, these resolve correctly. No manual edit.

## Acceptance criteria
- [ ] After `anchor build` (program change landed), regenerate SDK IDL types.
- [ ] Update constants.ts const to 2.
- [ ] `pnpm --filter @tributary-so/sdk run build` clean.
- [ ] `pnpm --filter @tributary-so/sdk run lint` clean.
- [ ] Verify makeValidationInit pads to 2 (not 4) — grep the runtime value if unclear.
- [ ] No MAX_VALIDATION_DATA_SIZE mirror exists in SDK (grep confirms) — no edit.

## Summary of Changes

- Regenerated IDL/types via `anchor build` → `target/idl/tributary.json` and `target/types/tributary.ts` now have `pinned_accounts: [PinnedAccount; 2]` (was 4). Two array-size occurrences each (InstructionConstraint struct + composable instruction arg).
- `packages/sdk/src/constants.ts`: `MAX_PINNED_FORWARD_ACCOUNTS = 4` → `2`. Comment refreshed to cite the blocker verdict (tributary-ahfg: DLMM fits in 2 owner-pins) and point at the on-chain mirror.
- `packages/sdk/src/sdk.ts:3971`: padding loop in `makeValidationInit` auto-tracks via the imported const → pads to 2 (verified).
- No `MAX_VALIDATION_DATA_SIZE` mirror in SDK (grep confirms) — validation-data is a variable-length Buffer; no edit.
- Verification: `pnpm --filter @tributary-so/sdk run build` green (tsup ESM + DTS); `pnpm --filter @tributary-so/sdk run lint` green (script is `exit 0`). Commit: pending — will land in the same commit as this bean.
