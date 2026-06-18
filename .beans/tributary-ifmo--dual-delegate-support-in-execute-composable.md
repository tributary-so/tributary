---
# tributary-ifmo
title: Dual delegate support in execute_composable
status: completed
type: feature
priority: high
created_at: 2026-06-14T11:33:08Z
updated_at: 2026-06-18T10:07:19Z
---

Make execute_composable.rs accept both payments_delegate and user_payment PDA as valid delegation keys, matching execute_payment.rs compatibility. Only the initial pull (Step 3) uses the resolved delegate authority; all other CPIs (validation, forward, sweeps) continue to use the UserPayment PDA since it owns the intermediate ATAs.

- [x] Analyze execute_payment.rs dual-delegate pattern
- [ ] Add payments_delegate account to ExecuteComposable struct
- [ ] Relax user_token_account constraint to accept either delegate
- [ ] Resolve delegate in handler; use pull authority for Step 3 only
- [ ] Update SDK to pass paymentsDelegate account
- [ ] Build + lint
