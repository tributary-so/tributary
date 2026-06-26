---
# tributary-iajd
title: 'M9: Dedupe METEORA_DLMM/LIGHTHOUSE test constants into tests/constants.ts'
status: completed
type: task
priority: normal
created_at: 2026-06-22T14:04:57Z
updated_at: 2026-06-22T14:11:27Z
---

METEORA_DLMM_PUBKEY and LIGHTHOUSE_PUBKEY are duplicated across tests/composable.test.ts and tests/topup-balance.test.ts. These must match the on-chain allowlists (ALLOWED_FORWARD_PROGRAMS, ALLOWED_VALIDATION_PROGRAMS in programs/tributary/src/constants.rs). Drift causes silent wrong-allowlist test passes.

Fix: extract to tests/constants.ts with header doc warning about the program-file sync requirement; import in both test files.

Report: reports/M9-test-program-id-constants-duplicated.md

## Summary of Changes

- Created `tests/constants.ts` exporting `METEORA_DLMM_PUBKEY` and `LIGHTHOUSE_PUBKEY` with doc comments warning about the programs/tributary/src/constants.rs sync requirement.
- Refactored `tests/composable.test.ts` and `tests/topup-balance.test.ts` to import from `./constants` instead of declaring locally.
- Preserved the 'Meteora DLM is the only program…' context comment in topup-balance.test.ts (kept adjacent to import) and lifted the broader rationale (Token Program drain vector) into the constants.ts doc.

## Drift check
No drift found — both test files and `constants.rs` agree on both pubkey values.

## Verification
- `tsc -p tsconfig.json`: zero errors in tests/ (7342 pre-existing errors elsewhere, unrelated).
- Grep confirms definitions only in `tests/constants.ts`; test files only have usages.

## Out of scope (separate findings, not touched)
- ADMIN_KEYPAIR dedupe — H9 finding.
- Runtime fs.readFileSync sanity assertion — heavy-handed, not requested.

## Note on the report
`reports/M9-test-program-id-constants-duplicated.md` contains stale illustrative example strings that don't match real constants.rs (e.g. `LBUZKhRxPF3XUpBCjp4YzTKxSd9Y41H5E2mVDxJ2jnj`). The actual code was clean; the report's snippets are just wrong examples.
