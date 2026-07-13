---
# tributary-r2nd
title: Fix SDK + tests after ScheduleType removal
status: completed
type: task
priority: high
created_at: 2026-06-18T08:53:29Z
updated_at: 2026-06-18T09:10:15Z
---

Replace all ScheduleType references in packages/sdk/ and tests/ with PolicyType. ScheduleType was deleted and unified into PolicyType. ComposablePolicy now has policy_type: PolicyType instead of schedule: ScheduleType.

## Field mapping (ScheduleType → PolicyType)
- ScheduleType::Timed → PolicyType::Subscription
- ScheduleType::Usage → PolicyType::PayAsYouGo
- ScheduleType::Milestone → PolicyType::Milestone
- schedule → policy_type (field/arg name)
- next_execution_due → next_payment_due
- max_executions → max_renewals
- frequency → payment_frequency
- amounts → milestone_amounts
- timestamps → milestone_timestamps
- current → current_milestone
- total → total_milestones

## Plan
- [x] Audit all ScheduleType/schedule references in packages/sdk/src/
- [x] Update packages/sdk/src/sdk.ts (removed ScheduleType import, renamed schedule arg → policyType)
- [x] packages/sdk/src/types.ts already clean (ScheduleType type was auto-removed by IDL regen)
- [x] Audit all references in tests/*.ts
- [x] Update tests/composable.test.ts (timed→subscription, schedule→policyType, maxExecutions→maxRenewals, nextExecutionDue→nextPaymentDue, frequency→paymentFrequency)
- [x] Rebuild SDK (pnpm build in packages/sdk — clean build)
- [x] Verify tsc compiles in tests/ and packages/sdk/ (both clean — remaining errors are pre-existing in sdk-react/sdk-x402, unrelated)



## Summary of Changes

### packages/sdk/src/sdk.ts
- Removed `ScheduleType` from type imports
- Renamed `getCreateComposablePolicyInstruction` parameter `schedule` → `policyType`
- Updated JSDoc accordingly

### packages/sdk/src/types.ts
- Already clean (ScheduleType was auto-removed when IDL regenerated)

### tests/composable.test.ts
- `defaultTimedSchedule()` → `defaultSubscriptionPolicy()`
- Object shape: `{ timed: { maxExecutions, frequency, nextExecutionDue } }` → `{ subscription: { maxRenewals, paymentFrequency, nextPaymentDue } }`
- All call sites: `const schedule = ...` → `const policyType = ...`
- All arg passing: `.createComposablePolicy(schedule, ...)` → `.createComposablePolicy(policyType, ...)`
- Assertions: `policy.schedule.timed.*` → `policy.policyType.subscription.*`
- Test description: "timed schedule" → "subscription policy"

### tests/topup-balance.test.ts
- Object shape: `{ usage: { ... } }` → `{ payAsYouGo: { ... } }`
- Variable: `const schedule = ...` → `const policyType = ...`
- Fixed padding size from `new Array(1)` to `new Array(88)` (matching PayAsYouGo.padding = [u8; 88])
- All assertions: `policy.schedule.usage.*` → `policy.policyType.payAsYouGo.*`
- Test description: "usage schedule" → "pay-as-you-go policy"

### Verification
- `pnpm build` in packages/sdk: clean (tsup + DTS)
- `tsc --noEmit` in packages/sdk: 0 errors
- `tsc --noEmit` in tests/: 0 errors in test files (remaining errors are pre-existing in sdk-react/sdk-x402)
- `grep -rn ScheduleType` in packages/sdk/src/ + tests/: 0 matches
