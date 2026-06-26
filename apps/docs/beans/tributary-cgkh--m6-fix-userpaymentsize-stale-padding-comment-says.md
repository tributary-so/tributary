---
# tributary-cgkh
title: 'M6: Fix UserPayment::SIZE stale padding comment (says 209, value is 210)'
status: completed
type: task
priority: normal
created_at: 2026-06-22T12:56:18Z
updated_at: 2026-06-22T13:00:37Z
---

Trivial doc fix: the inline comment after UserPayment::SIZE says 'padding: [u8; 209]' but the actual field is [u8; 210]. Update to match. Also investigate if the 2-byte padding delta was intentional.

Report: reports/M6-user-payment-size-comment-mismatch.md

## Summary of Changes

- One-line comment fix in `programs/tributary/src/state/user_payment.rs`: `// padding: [u8; 209]` → `// padding: [u8; 210]` to match the actual field.
- No behavioral change; cargo build succeeds.

## Discovery during this fix
The report's arithmetic was itself off — actual SIZE values are 382 (pre-composability) → 380 (current). Git history shows 2 bytes went missing in commit c8e00ef when adding 9 bytes of new fields but reducing padding by 11. Origin of the 2-byte reduction is undocumented. If padding were [u8; 212], SIZE would return to 382 and restore byte-for-byte mainnet-account compatibility.

**Follow-up recommended** (deferred — outside M6 scope): investigate whether the 2-byte reclamation was intentional; if not, restore padding to [u8; 212] to preserve original account size. Will offer this as a follow-up bean at the end of the run.
