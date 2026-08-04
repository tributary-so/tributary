---
# tributary-dmez
title: '#10: Require distinct gateway roles (authority / signer / fee_recipient)'
status: scrapped
type: task
priority: normal
created_at: 2026-07-07T11:49:01Z
updated_at: 2026-07-08T18:59:47Z
parent: tributary-daxr
---

Audit finding #10 (High): The three gateway roles (authority, signer, fee_recipient) can all be the same key. Single-key compromise = full gateway control.

**Location:** create_payment_gateway.rs (and change_gateway_signer / change_gateway_fee_recipient)

**Fix:** At gateway creation, require authority/signer/fee_recipient to be distinct pubkeys. Use the existing DistinctPubKeysRequired error variant.

**Acceptance:**
- [ ] create_payment_gateway rejects authority == signer, authority == fee_recipient, signer == fee_recipient
- [ ] Unit test covering all three collision cases
- [ ] cargo build clean
