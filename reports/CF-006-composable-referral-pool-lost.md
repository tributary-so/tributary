# CF-006: Referral Pool Silently Lost in Composable Fee Skim — Recipient Overpaid

> **Severity:** 🟡 5 (MEDIUM)  
> **Category:** Economic / Arithmetic  
> **Status:** Open  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**File:** `programs/tributary/src/instructions/composable/execute_composable.rs:361–496` (`skim_input_fees`)

---

## Root Cause

`skim_input_fees` calls `calculate_fees` which computes four fee carve-outs:

```rust
let fee_breakdown = calculate_fees(
    face_amount,
    gateway.gateway_fee_bps,
    gateway.effective_protocol_share_bps(config.protocol_share_bps),
    gateway.scheduler_share_bps,
    gateway.referral_allocation_bps,
    gateway.is_referral_enabled(),  // ← referral pool computed when true
    true, // NET-on-pull
)?;
```

Inside `calculate_fees`, `gateway_residual` is reduced by `referral_pool`:

```rust
let gateway_residual = total_fee
    .checked_sub(protocol_cut)?
    .checked_sub(scheduler_cut)?
    .checked_sub(referral_pool)?;  // ← referral_pool deducted from residual
```

But `skim_input_fees` only transfers **three** of the four carve-outs out of `intermediate_input`:

| Cut                 | Transferred?           | Destination                         |
| ------------------- | ---------------------- | ----------------------------------- |
| `protocol_cut`      | ✅                     | `protocol_fee_account`              |
| `scheduler_cut`     | ✅                     | scheduler ATA / gateway fee account |
| `gateway_residual`  | ✅                     | `gateway_fee_account`               |
| **`referral_pool`** | **❌ NOT TRANSFERRED** | **stays in `intermediate_input`**   |

After skim: `intermediate_input_balance = gross_pull - (protocol + scheduler + gateway_residual) = face + referral_pool`.

The comment at line 1212–1213 claims "After this, intermediate_input holds exactly `face`" — **this is wrong when referral is enabled.**

The regular `execute_payment` path calls `process_referral_rewards()` (execute_payment.rs:241) to distribute the pool. The composable path has no equivalent call.

---

## Exploit Scenario

### Deliver-no-transform mode (forward disabled, same mint)

```
Gateway configured:
  gateway_fee_bps       = 500     (5%)
  referral_allocation   = 2500    (25% of gateway fee → referral pool)
  referral_tiers        = [5000, 3000, 2000]
  FEATURE_REFERRAL      = enabled

Composable policy: deliver-no-transform (forward disabled, input_mint == output_mint)
  face_amount = 1_000_000_000 (1000 USDC)

Execution:
  Phase 1: gross_pull = 1_050_000_000 (face + 50M fee) → intermediate_input
  Phase 1b: skim_input_fees:
    total_fee       = 50_000_000
    protocol_cut    = 10_000_000  → protocol_fee_account ✓
    scheduler_cut   = 0
    referral_pool   = 12_500_000  → NOT TRANSFERRED ✗
    gateway_residual = 27_500_000 → gateway_fee_account ✓

    intermediate_input remaining = 1_050_000_000 - 10M - 0 - 27.5M = 1_012_500_000

  Phase 5 (deliver-no-transform): sweep full intermediate to recipient
    recipient receives 1_012_500_000  ← OVERPAID by 12_500_000

  Referral accounts: receive NOTHING.
```

### Deliver-transform / act mode

The forward instruction's `amount_in` field is not byte-range-pinned (only the discriminator at offset 0 is pinned). A cold relayer can set `amount_in = face + referral_pool`, consuming the extra balance through the swap. The output goes to the recipient (deliver-transform) or is consumed by the act program (act mode). Referrers still receive nothing.

---

## Impact Assessment

| Dimension                 | Value                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Recipient overpayment** | `referral_pool = total_fee × referral_allocation_bps / 10000` per execution                               |
| **Max overpayment**       | With `referral_allocation_bps = 2500` and `gateway_fee_bps = 500`: 1.25% of the face amount per execution |
| **Referrer loss**         | Entire referral pool — all three tiers receive zero                                                       |
| **Who is affected**       | Any composable policy on a gateway with referral enabled and `referral_allocation_bps > 0`                |

---

## Patch

### Option A — Disable referral in composable fee calculation (minimal fix)

If referral distribution is intentionally unsupported for composable (the composable path's `remaining_accounts` layout doesn't include referral accounts):

```diff
 // programs/tributary/src/instructions/composable/execute_composable.rs
 // In skim_input_fees:

 let fee_breakdown = calculate_fees(
     face_amount,
     gateway.gateway_fee_bps,
     gateway.effective_protocol_share_bps(config.protocol_share_bps),
     gateway.scheduler_share_bps,
     gateway.referral_allocation_bps,
-    gateway.is_referral_enabled(),
+    false, // Composable: referral pool not distributed — don't carve it out
     true,
 )?;
```

This zeros out `referral_pool` and gives the full residual to the gateway. The gateway authority still receives the correct total fee.

### Option B — Add referral distribution to composable (complete fix)

Add referral accounts to the `remaining_accounts` layout for composable execution, and call `process_referral_rewards` from the intermediate input before the forward/settle phases. This is more complex (changes the `remaining_accounts` protocol) but fully aligns composable with the PaymentPolicy path.

**Recommendation:** Option A as an immediate fix. Option B as a feature addition if referral support is desired for composable policies.
