---
# tributary-pnaf
title: 'Composable: Integration Tests'
status: in-progress
type: task
priority: normal
created_at: 2026-06-10T18:44:20Z
updated_at: 2026-06-10T19:07:12Z
parent: tributary-msk8
blocked_by:
    - tributary-g91h
---

Phase 6 of composable implementation. Full test coverage.

- [ ] Unit: ScheduleType validation (Timed timing, Milestone ordering, Usage period tracking)
- [ ] Unit: ByteRangeCheck offset/length/expected validation
- [ ] Integration: create composable policy (timed schedule, no validation) → verify account data
- [ ] Integration: execute_composable basic forward CPI → verify token transfers + fees
- [ ] Integration: validation CPI pass → forward CPI proceeds
- [ ] Integration: validation CPI fail → tx reverts, no token movement
- [ ] Integration: fee distribution (protocol + gateway) correctness
- [ ] Integration: slippage protection (min_output_amount check)
- [ ] Integration: intermediate ATA creation + cleanup
- [ ] Integration: edge cases — insufficient delegation, paused policy, wrong byte-range check, invalid forward program
- [ ] Verify: anchor test passes all

Files: tests/
