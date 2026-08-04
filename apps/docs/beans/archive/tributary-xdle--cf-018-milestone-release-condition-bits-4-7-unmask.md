---
# tributary-xdle
title: 'CF-018: Milestone release_condition bits 4-7 unmasked'
status: completed
type: bug
priority: low
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-14T06:29:20Z
parent: tributary-gq3x
---

# CF-018: Milestone `release_condition` Bits 4–7 Unmasked

> **Severity:** ⚪ 2 (INFO)
> **Category:** Validation Gap
> **File:** `programs/tributary/src/policies/milestone.rs:48–49`
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

```rust
let signer_bits = release_condition & !RELEASE_DUE_DATE; // = & 0b11111110
require!(signer_bits.count_ones() <= 1, ...);
```

`release_condition = 0b10001` (bit 0 + bit 4): `signer_bits = 0b10000`, `count_ones() = 1` → passes. Bit 4 is never checked by any `RELEASE_*` constant. The policy behaves like `release_condition = 0b00001` (due-date only), silently dropping the intended restriction.

## Impact

No on-chain exploit — unused bits are ignored at execute time. But masks SDK bugs: an SDK setting a restriction in a high bit would silently pass validation with weaker security than intended.

## Patch

```diff
+require!(
+    release_condition & 0b11110000 == 0,
+    TributaryError::InvalidAmount
+);
```

## Summary of Changes

CF-018 fixed in `programs/tributary/src/policies/milestone.rs` (`validate_milestone_policy`):

- Added `require!(release_condition & 0b11110000 == 0, ...)` before the existing signer-bits exclusivity check. Bits 4-7 are unused by any `RELEASE_*` constant; previously an SDK setting a high bit would silently pass validation while behaving as a weaker policy (high bits ignored at execute time).
- Added regression test `rejects_unused_release_bits` covering `0b10001` (bit 0 + unused bit 4).

All 10 `policies::milestone::tests` pass.
