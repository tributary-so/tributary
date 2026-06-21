---
# tributary-j6ri
title: 'L8: Replace fragile RPC error string match with regex on stable code'
status: in-progress
type: task
priority: low
created_at: 2026-06-21T19:30:22Z
updated_at: 2026-06-21T19:32:01Z
---

Audit finding L8 (LOW, test maintainability). tests/topup-balance.test.ts:678-683 hardcodes a long RPC error string including a program address and hex code 0x1771. Brittle to RPC provider serialization changes. Replace with a regex matching the stable signal (the error code 6001 / 0x1771).

## Todos
- [x] Replace literal-string toContain with regex match on error code
- [ ] Verify tsc / lint / prettier passes
- [x] Stage source + bean files (NOT reports/), commit
