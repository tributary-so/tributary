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
