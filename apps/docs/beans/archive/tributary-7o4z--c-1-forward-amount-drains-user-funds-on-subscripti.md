---
# tributary-7o4z
title: 'C-1: forward_amount drains user funds on Subscription/Milestone composable'
status: completed
type: bug
priority: critical
created_at: 2026-06-25T13:28:14Z
updated_at: 2026-06-26T06:45:23Z
parent: tributary-etbw
---

execute_composable.rs:798 ignores schedule_amount when forward_amount=Some, so any gateway signer can charge ABOVE the configured subscription/milestone amount. Only PayAsYouGo legitimately needs a caller-supplied chunk.

Impact: subscription invariant broken; under an adversarial/permissionless gateway a user can be drained past the agreed amount.

Fix: reject forward_amount for non-PayAsYouGo policy types (return schedule_amount unconditionally), OR clamp input_amount=min(forward_amount, schedule_amount) for non-PayAsYouGo. PayAsYouGo path keeps its chunk semantics.

Location: programs/tributary/src/instructions/composable/execute_composable.rs:798-804
Verify: add test that execute_composable with forward_amount > schedule_amount on a Subscription fails (or charges exactly schedule_amount).

## Summary of Changes

C-1 fixed: `forward_amount` is now rejected for non-PayAsYouGo composable policies.

**Root cause:** `execute_composable` line 808 unconditionally used `forward_amount` when `Some`, ignoring `schedule_amount` returned by `validate_policy_execution`. Any gateway signer could pass `forward_amount > schedule_amount` and drain user funds past the agreed subscription/milestone amount.

**Fix** (`programs/tributary/src/instructions/composable/execute_composable.rs:803-818`):
- `forward_amount` is now accepted ONLY for `PolicyType::PayAsYouGo` (where it IS the chunk, validated inside `validate_policy_execution`).
- For `Subscription` / `Milestone`, passing `Some(amount)` returns `InvalidAmount`. Callers must pass `None` and the configured `schedule_amount` is used.

**Test added** (`tests/composable.test.ts`):
- `Execute composable — Subscription rejects forwardAmount (C-1)`: creates a Subscription composable policy (amount=100_000), approves delegate=10_000_000, then calls `executeComposable` with `forwardAmount=99_999_999`. Asserts `InvalidAmount`. Pre-fix this failed with `InsufficientDelegatedAmount` (the drain attempt); post-fix it fails earlier at the policy-type guard.

**Verification:** `anchor test` → 70 cargo + 76 tributary + 18 composable = 164 tests, 0 failures. TDD cycle: RED (InsufficientDelegatedAmount) → GREEN (InvalidAmount).
