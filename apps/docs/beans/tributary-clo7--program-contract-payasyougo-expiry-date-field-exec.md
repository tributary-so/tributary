---
# tributary-clo7
title: 'Program contract: PayAsYouGo expiry_date field + execute gate'
status: todo
type: feature
priority: high
created_at: 2026-07-02T13:05:05Z
updated_at: 2026-07-02T13:05:39Z
parent: tributary-5lv3
---

Add optional `expiry_date: Option<i64>` to the PayAsYouGo variant and enforce it at execute time. Lives under the implementation epic (tributary-5lv3). Parent milestone: tributary-f99q.

## Acceptance criteria (TDD)

- [ ] **RED** `policies/payg.rs`: test `validate_payg_policy` accepts `None`, accepts `Some(future>0)`, rejects `Some(0)` and `Some(negative)`.
- [ ] Add `expiry_date: Option<i64>` (9 bytes) to `PayAsYouGo`; carve from the 88-byte padding (→ 79). Variant stays exactly 128 bytes (ADR-0002).
- [ ] Extend `validate_payg_policy` — only constraint: `expiry_date > 0` when `Some` (mirrors OneTime). GREEN.
- [ ] **RED** `shared/schedule.rs` PayAsYouGo arm: execute fails with `PolicyExpired` when `current_time > expiry`; permitted at `current_time == expiry` (`<=`, mirrors OneTime).
- [ ] Add the expiry gate next to the existing OneTime check. Reuse `TributaryError::PolicyExpired`. GREEN.
- [ ] **RED** backward-compat: a zeroed PayAsYouGo byte-slice deserializes to `expiry_date == None`.
- [ ] GREEN (verify borsh `Option` discriminant 0 == `None`).
- [ ] Thread the field through the `create_payment_policy` PayAsYouGo arm (instruction arg + account write).
- [ ] `pnpm run lint` + `anchor test` clean.

## Notes

- No new `PolicyStatus`. Soft execute-time gate only.
- Orthogonal to the rolling period cap — whichever trips first wins.
