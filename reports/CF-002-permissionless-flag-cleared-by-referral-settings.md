# CF-002: `FEATURE_PERMISSIONLESS` Silently Cleared by `update_gateway_referral_settings`

> **Severity:** 🟠 8 (HIGH)  
> **Category:** Access Control / State Machine  
> **Status:** Open — **Fix before release**  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**File:** `programs/tributary/src/instructions/gateway/update_gateway_referral_settings.rs:50–55`

```rust
if let Some(flags) = args.feature_flags {
    let protected_bit = gateway.feature_flags & PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE;
    gateway.feature_flags = (flags
        & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
        | protected_bit;
}
```

**Compare with `update_gateway_feature_flags.rs:47–52` (correct):**

```rust
let preserved_bits = gateway.feature_flags
    & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
        | PaymentGateway::FEATURE_PERMISSIONLESS);   // ← includes 0x08
```

---

## Root Cause

Feature flag constants:

```rust
pub const FEATURE_REFERRAL: u8 = 0x01;
pub const FEATURE_NET_AMOUNT: u8 = 0x02;
pub const FEATURE_CUSTOM_PROTOCOL_FEE: u8 = 0x04;
pub const FEATURE_PERMISSIONLESS: u8 = 0x08;
```

`update_gateway_feature_flags` correctly preserves both `CUSTOM_PROTOCOL_FEE` (0x04) and `PERMISSIONLESS` (0x08) in its `preserved_bits` mask. But `update_gateway_referral_settings` only preserves `CUSTOM_PROTOCOL_FEE` (0x04), dropping `PERMISSIONLESS` (0x08).

The bit-clearing is **silent** — the gateway authority calls an instruction named "update referral settings" and unintentionally destroys the permissionless execution capability.

---

## Exploit Scenario

### Accidental destruction (most likely)

```
1. Admin creates gateway with initial_feature_flags = 0x08 (PERMISSIONLESS)
   → gateway.feature_flags = 0b00001000

2. Gateway authority calls update_gateway_referral_settings:
     feature_flags = Some(0x01)  // "enable referral program"
     referral_allocation_bps = Some(1000)
     referral_tiers_bps = Some([5000, 3000, 2000])

3. Handler executes:
   protected_bit = 0x08 & 0x04 = 0x00         ← PERMISSIONLESS not in mask
   result = (0x01 & 0x03) | 0x00 = 0x01
   gateway.feature_flags = 0b00000001          ← PERMISSIONLESS DESTROYED

4. All cold-relayer composable executions now fail:
   gateway.is_permissionless() returns false
   → execute_composable rejects non-trusted signers
   → all third-party scheduler policies lose liveness
```

### Malicious destruction (compromised gateway authority)

```
1. Gateway running with PERMISSIONLESS enabled, serving multiple users'
   composable policies via cold relayers.

2. Compromised gateway authority calls update_gateway_referral_settings
   with feature_flags = Some(0x00).
   → PERMISSIONLESS cleared.
   → All cold-relayer-dependent policies become un-executable.
   → Users' composable policies are bricked (cannot advance schedule).

3. The bit cannot be re-set (no instruction toggles it post-create).
```

---

## Impact Assessment

| Dimension      | Value                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Fund loss**  | Indirect — no direct theft, but policies lose liveness (users miss scheduled payments)                            |
| **Permanence** | Irreversible — no instruction can re-set `FEATURE_PERMISSIONLESS` post-creation                                   |
| **Trigger**    | Any call to `update_gateway_referral_settings` with a `feature_flags` argument                                    |
| **Likelihood** | High — the instruction is routinely called to configure referral programs, and the bug is in the normal code path |

---

## Patch

```diff
 // programs/tributary/src/instructions/gateway/update_gateway_referral_settings.rs

 if let Some(flags) = args.feature_flags {
-    let protected_bit = gateway.feature_flags & PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE;
+    let preserved_bits = gateway.feature_flags
+        & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
+           | PaymentGateway::FEATURE_PERMISSIONLESS);
     gateway.feature_flags = (flags
         & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
-        | protected_bit;
+        | preserved_bits;
 }
```

This matches the preservation mask in `update_gateway_feature_flags.rs:47–52`.

---

## Verification

```rust
#[test]
fn referral_settings_preserves_permissionless_bit() {
    let mut gw = gateway_with_fee(500);
    gw.feature_flags = PaymentGateway::FEATURE_PERMISSIONLESS; // 0x08

    // Simulate: args.feature_flags = Some(0x01)
    let flags = 0x01u8;
    let preserved_bits = gw.feature_flags
        & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE | PaymentGateway::FEATURE_PERMISSIONLESS);
    gw.feature_flags = (flags & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
        | preserved_bits;

    assert!(
        gw.is_permissionless(),
        "PERMISSIONLESS bit must survive referral settings update"
    );
    assert!(gw.is_referral_enabled(), "referral bit should be set");
}
```

Additionally, audit every `update_gateway_*` instruction for the same missing-bit pattern.
