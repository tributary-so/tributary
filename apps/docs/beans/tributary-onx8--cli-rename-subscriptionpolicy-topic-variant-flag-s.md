---
# tributary-onx8
title: 'CLI: rename subscription→policy topic + --variant flag + status collapse'
status: completed
type: task
priority: high
created_at: 2026-06-29T07:51:25Z
updated_at: 2026-06-30T07:27:37Z
parent: tributary-hy8a
blocked_by:
    - tributary-p6n3
---

Parent: `tributary-hy8a` — CLI v2 epic
Track: A (rename) · Blocked-by: `cli-cleanup`

## Requirement

Bring the CLI topic vocabulary into line with `CONTEXT.md`: the
**PaymentPolicy** family is `policy`, and `policy create` must wire **all
three** `PolicyType` variants (today only `Subscription` is reachable).
Collapse the three lifecycle verbs into one status command. Grammar-fix the
execution topic to singular.

## Spec

- Rename topic `subscription` → `policy`. File moves under
  `apps/cli/src/commands/policy/`.
- `policy create` gains `--variant subscription|milestone|pay-as-you-go`
  (default `subscription`). Each branch calls the matching SDK method:
  - `subscription` → `sdk.createSubscription` (high-level, ATA+delegate) or
    `getCreateSubscriptionPolicyInstruction` (ix-only via `--instruction-only`).
  - `milestone` → `sdk.createMilestone` / `getCreateMilestonePolicyInstruction`.
  - `pay-as-you-go` → `sdk.createPayAsYouGo` /
    `getCreatePayAsYouGoPolicyInstruction`.
- Collapse `subscription pause|resume|delete` (3 cmds) → one
  `policy status --status paused|active|deleted` backed by
  `sdk.changePaymentPolicyStatus`.
- `payments execute` → `payment execute` (singular; it is the verb, not the
  noun). Keep an alias if cheap, else just rename.
- `subscription list` → `policy list`.

### Decisions cited (not re-decided)

- **ADR-0002** — `PolicyType` has exactly three variants (`Subscription`,
  `Milestone`, `PayAsYouGo`) in one 128-byte fixed layout. The `--variant` flag
  is a 1:1 mirror of this enum; no fourth value, no "composable" value (that is
  ADR-0007, a separate account type → separate topic, handled in the composable
  child).
- **`CONTEXT.md`** — `subscription` is on the Avoid list (it is one _variant_);
  `policy` / `PaymentPolicy` / `PolicyType` are the canonical nouns. This child
  is the terminology correction the Avoid list demands.

## Acceptance Criteria

- [ ] No command/file/topic named `subscription` remains in `apps/cli/src`
      (grep clean).
- [ ] `policy create --variant milestone` and `--variant pay-as-you-go` each
      produce a runnable transaction end-to-end against Surfpool.
- [ ] `policy status --status paused|active|deleted` replaces the three old
      verbs; old verbs removed.
- [ ] `payment execute` (singular) works; `--policy` still required.

## Test Plan

- Mirror the three variant flows from `tests/tributary.test.ts` (subscription /
  milestone / pay-as-you-go create+execute) as CLI smoke tests against
  Surfpool.
- Assert `changePaymentPolicyStatus` is invoked for each status value.
- Negative: `policy create --variant bogus` fails with a clear enum error.
- Lint + build clean.

## Workflow

routing: implementer · terminology authority = `CONTEXT.md`.

## Summary of Changes

Renamed subscription topic to policy. policy create now wires all three PolicyType variants via --variant subscription|milestone|pay-as-you-go. Collapsed pause/resume/delete into one policy status --status paused|active|deleted command. Renamed payments execute to payment execute (singular topic). subscription list is now policy list. Deleted subscription/ directory. Updated package.json topics. Regenerated README and manifest.
