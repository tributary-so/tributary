---
# tributary-bni6
title: 'CLI: add oneTime + upTo variants to payment-policy create'
status: completed
type: feature
priority: normal
created_at: 2026-07-10T07:35:28Z
updated_at: 2026-07-13T08:47:10Z
blocked_by:
    - tributary-r0b2
---

The current payment-policy create only supports subscription/milestone/pay-as-you-go. Add support for the OneTime (ADR-0019) and UpTo (ADR-0020) variants via the --variant flag.

SDK already has: getCreateOneTimePolicyInstruction, and UpTo support in the program.

## Checklist
- [x] Add 'one-time' and 'up-to' to --variant options
- [x] Wire oneTime: --amount, --due-date, --expiry
- [x] Wire upTo: --max-amount, --valid-after, --deadline
- [x] Update examples + help text
- [x] Build + lint passes

Blocked by: tributary-r0b2 (the namespace rename must land first)

## Summary of Changes

Extended `payment-policy create` with two new `--variant` options:

- **one-time** (ADR-0019): wires `--amount`, `--due-date` (optional, <=0/immediate), `--expiry` (optional) to `sdk.createOneTimePayment()`.
- **up-to** (ADR-0020): wires `--max-amount` (required), `--valid-after` (optional, <=0/immediate), `--deadline` (required) to `sdk.createUpToAuthorization()`.

Other changes in `apps/cli/src/commands/payment-policy/create.ts`:
- Refactored the variant dispatch from if/else-if chain to a `switch` (satisfies `unicorn/prefer-switch`, flattens complexity).
- Broadened `--amount` description to `[subscription, one-time]` and `--expiry` to `[pay-as-you-go, one-time]` (same semantics, reused flag).
- Added 4 examples (2 one-time, 2 up-to) and updated the command description.
- Build (tsc) + lint (eslint) pass; one residual `complexity` warning remains on `run()` — inherent to per-variant flag validation, not worth abstracting.

No SDK or program changes — the builders already existed.
