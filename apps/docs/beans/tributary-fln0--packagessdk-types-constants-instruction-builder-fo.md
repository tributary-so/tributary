---
# tributary-fln0
title: 'packages/sdk: types + constants + instruction builder for indexed pins'
status: todo
type: feature
priority: high
created_at: 2026-07-10T10:19:11Z
updated_at: 2026-07-10T10:19:30Z
parent: tributary-u3gi
blocked_by:
    - tributary-je1p
---

## Files
- `packages/sdk/src/types.ts`
- `packages/sdk/src/constants.ts`
- `packages/sdk/src/sdk.ts`

## Changes
- [ ] `types.ts`: InstructionConstraint type resolves from IDL (will pick up PinnedAccount automatically after `anchor build`). Verify no hardcoded layout assumptions for InstructionConstraint pinned_accounts.
- [ ] `types.ts`: ValidationPdaAccount + parseValidationPda + VALIDATION_PDA_LAYOUT — these stay UNCHANGED (ValidationPda.pinned_accounts is positional, not touched by this milestone). Verify they are not accidentally broken.
- [ ] `constants.ts`: MAX_PINNED_FORWARD_ACCOUNTS stays 4. Update any comments referencing positional layout.
- [ ] `sdk.ts`: `getCreateComposablePolicyInstruction` — change pinnedAccounts param from `PublicKey[]` to `{ index: number; pubkey: PublicKey }[]` (or equivalent typed tuple). Update the serialization that packs into the instruction args.
- [ ] `sdk.ts`: Any helper that reads/decodes InstructionConstraint from on-chain accounts — verify it handles the new struct.
- [ ] `pnpm --filter @tributary-so/sdk run build` passes
- [ ] `pnpm --filter @tributary-so/sdk run lint` passes
