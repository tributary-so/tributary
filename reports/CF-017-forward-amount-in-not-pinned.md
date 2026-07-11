# CF-017: Forward CPI `amount_in` Not Pinned — Cold Relayer Can Vary Swap Input

> **Severity:** 🔵 3 (LOW)  
> **Category:** CPI / Economic  
> **File:** `programs/tributary/src/instructions/composable/execute_composable.rs:867–889`  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

`validate_byte_ranges` pins the forward instruction's discriminator (offset 0) but does NOT pin the `amount_in` field in the Meteora DLMM swap instruction. A cold relayer can supply different `amount_in` values across executions, as long as the discriminator matches.

The `amount_in` is bounded by the intermediate balance (the forward program can only consume what's in `intermediate_input`). But within that bound, the relayer controls how much of the intermediate balance is swapped.

## Impact

In isolation, this is by design (ADR-0021: byte-range checks pin the selector, not the data fields). The interaction with CF-006 (referral pool left in intermediate) amplifies it: the relayer can set `amount_in = face + referral_pool`, consuming the undistributed referral pool through the forward.

## Patch

If tighter control is desired, add a byte-range check for the `amount_in` field offset in the Meteora DLMM swap instruction format:

```diff
 // At policy creation, add a ByteRangeCheck pinning the amount_in field:
 data_checks[1] = ByteRangeCheck {
-    // ... existing discriminator pin
+    offset: AMOUNT_IN_OFFSET,  // offset of amount_in in the DLMM swap ix
+    length: 8,
+    expected: face_amount.to_le_bytes(),  // must match exactly
 };
```

Alternatively, accept the current behavior as designed and document that `amount_in` is relayer-controlled and bounded by the intermediate balance. The fix for CF-006 (zeroing out the referral pool) removes the amplification vector.
