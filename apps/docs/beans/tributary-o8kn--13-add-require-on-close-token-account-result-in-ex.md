---
# tributary-o8kn
title: '#13: Add require on close_token_account result in execute_composable'
status: scrapped
type: task
priority: normal
created_at: 2026-07-07T11:49:56Z
updated_at: 2026-07-08T19:00:53Z
parent: tributary-daxr
---

Audit finding #13 (Medium): In execute_composable.rs, close_token_account is called to close intermediate ATAs and return rent to fee_payer. If the close fails silently (e.g., account already closed by another tx, or non-zero balance), the intermediate ATA leaks and rent is stranded.

The close_token_account helper already returns Result<()>, and the calls already propagate with ?. But we should add an explicit post-close assertion that the intermediate ATA is truly empty (lamports == 0) as defense-in-depth.

**Location:** execute_composable.rs — Phase 5 settlement + close section (~line 1457-1492)

**Fix:** After each close_token_account call, add a require! that the account lamports == 0. Alternatively, the existing ? propagation is sufficient — evaluate whether the extra check adds value or just burns CU.

**Acceptance:**
- [ ] Evaluate whether the explicit post-close lamport check is needed (the ? already propagates errors)
- [ ] If yes: add require!(ata.lamports() == 0) after each close_token_account call
- [ ] If no: document why ? propagation is sufficient
- [ ] cargo build clean
