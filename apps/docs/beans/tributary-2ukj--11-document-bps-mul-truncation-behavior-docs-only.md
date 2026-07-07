---
# tributary-2ukj
title: '#11: Document bps_mul truncation behavior (docs only)'
status: todo
type: task
priority: normal
created_at: 2026-07-07T11:49:31Z
updated_at: 2026-07-07T11:49:39Z
parent: tributary-daxr
---

Audit finding #11 (Medium): bps_mul truncates toward zero (integer division drops remainder). Dust per call < 10000 base units stays with the user in gross mode but is kept by protocol/gateway in net mode. Over millions of payments this is a measurable value leak.

**Scope: DOCUMENTATION ONLY** — the user explicitly scoped this to docs, no code change.

**Location:** shared/fees.rs — bps_mul function

**Fix:** Add a doc comment on bps_mul that explicitly states:
1. Truncation direction (toward zero)
2. Per-call dust bound (< 10000 base units = bps)
3. Who benefits from the dust (protocol/gateway in net mode, user in gross mode)
4. Example: 1 USDC at 100 bps → 99 base units fee (exact = 99.99)

**Acceptance:**
- [ ] Doc comment on bps_mul covers truncation direction + dust bound + beneficiary
- [ ] Existing C-1 test (bps_mul_truncates_toward_zero) still passes
- [ ] cargo build clean
