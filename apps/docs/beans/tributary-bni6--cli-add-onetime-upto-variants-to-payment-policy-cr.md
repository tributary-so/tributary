---
# tributary-bni6
title: 'CLI: add oneTime + upTo variants to payment-policy create'
status: todo
type: feature
priority: normal
created_at: 2026-07-10T07:35:28Z
updated_at: 2026-07-10T07:35:39Z
blocked_by:
    - tributary-r0b2
---

The current payment-policy create only supports subscription/milestone/pay-as-you-go. Add support for the OneTime (ADR-0019) and UpTo (ADR-0020) variants via the --variant flag.

SDK already has: getCreateOneTimePolicyInstruction, and UpTo support in the program.

## Checklist
- [ ] Add 'one-time' and 'up-to' to --variant options
- [ ] Wire oneTime: --amount, --due-date, --expiry
- [ ] Wire upTo: --max-amount, --valid-after, --deadline
- [ ] Update examples + help text
- [ ] Build + lint passes

Blocked by: tributary-r0b2 (the namespace rename must land first)
