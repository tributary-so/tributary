---
# tributary-dilx
title: Scheduler composable remaining_accounts assembly is broken (validation PDA + post-validation)
status: completed
type: bug
priority: critical
created_at: 2026-07-14T11:58:26Z
updated_at: 2026-07-14T12:02:59Z
---

ComposableScheduler.resolveFireValidationTargets places the ValidationPda at remaining_accounts[0] and deriveValidationTarget guesses the Lighthouse target, both wrong. ADR-0016 pulled ValidationPda OUT of remaining_accounts; the slice is now owner-pinned Lighthouse targets only, then forward accounts, then post-validation pinned targets, optionally scheduler_ata. Prefilter has same root-cause confusion. Fix: mirror CLI execute.ts — parseValidationPda + read pinnedAccounts, no valPda in remaining_accounts, add post-validation handling.

## Summary of Changes

`apps/scheduler/src/composable.ts`:

1. **Imports**: dropped `parseValidationPdaData` + `deriveValidationTarget` (dead after fix); added `parseValidationPda`, `getPostValidationPda`, type `ValidationPdaAccount`. Dropped unused `getAssociatedTokenAddressSync`.

2. **`resolveFireValidationTargets` → `resolveValidationTargets(spec, valPda)`**: now returns the owner-pinned Lighthouse targets (`parsed.pinnedAccounts.slice(0, numPinnedAccounts)`), NOT the ValidationPda. The ValidationPda is a dedicated Anchor account (`pre_validation_pda` / `post_validation_pda`), per ADR-0016. The old comment claiming 'remaining_accounts[0] MUST be the ValidationPDA' was the smoking gun — opposite of the contract.

3. **`fire()` assembly**: now builds `[...preTargets, ...forwardAccounts, ...postTargets]` matching the program contract. Post-validation targets were previously missing entirely.

4. **`prefilter()`**: two-phase batch fetch. Phase 1 fetches ValidationPDAs to read the owner-pinned Lighthouse targets; phase 2 batch-fetches those targets. Replaces the hardcoded recipient / recipient_ata guess. Multi-account assertion families (`accountDelta`, etc.) defer to fire path instead of being silently skipped.

Root cause: the scheduler predated ADR-0016 (which pulled ValidationPda out of remaining_accounts) and was never updated. Every policy with validation enabled failed `ValidationPdaMismatch` on-chain because remaining[0] was the ValidationPda, not a pinned Lighthouse target.

Verified: `pnpm --filter scheduler run lint` clean, `tsc --noEmit` clean.
