---
# tributary-4g8n
title: 'L7: Fix ligthHouse typo and null deref in topup-balance.test.ts'
status: completed
type: task
priority: low
created_at: 2026-06-21T19:27:49Z
updated_at: 2026-06-21T19:29:22Z
---

Audit finding L7 (LOW, code quality/possible null deref). tests/topup-balance.test.ts:157-160 has a variable named ligthHouseProgram (th→ht typo) and accesses .data on a possibly-null AccountInfo returned by getAccountInfo. Rename to lighthouseProgram and add an explicit null check.

## Todos
- [x] Rename ligthHouseProgram → lighthouseProgram
- [x] Add explicit null check before .data access
- [x] Verify tsc / lint passes
- [ ] Stage source + bean files (NOT reports/), commit

## Summary of Changes

- Renamed ligthHouseProgram → lighthouseProgram in tests/topup-balance.test.ts.
- Added explicit null check before .data access so a missing account fails with a clear assertion instead of an opaque TypeError.
- Verified with tsc --noEmit and prettier.

Bean complete.
