---
# tributary-akcd
title: 'CF-002: FEATURE_PERMISSIONLESS silently cleared by update_gateway_referral_settings'
status: completed
type: bug
priority: critical
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:22:57Z
parent: tributary-gq3x
---

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

## Summary of Changes

**CF-002 fix landed** in `programs/tributary/src/instructions/gateway/update_gateway_referral_settings.rs`:

- Preservation mask in the `feature_flags` write path now covers both `FEATURE_CUSTOM_PROTOCOL_FEE` (0x04) AND `FEATURE_PERMISSIONLESS` (0x08), matching the mask in `update_gateway_feature_flags.rs:47–52`. Previously only 0x04 was preserved, silently bricking cold-relayer composable policies whenever a gateway authority touched referral settings.
- Added 4 unit tests in the same module:
  - `referral_settings_preserves_permissionless_bit` — the core regression test from the bean's verification section.
  - `referral_settings_does_not_clear_permissionless_via_zero` — the malicious-path regression (`feature_flags = Some(0)`).
  - `referral_settings_does_not_set_permissionless_bit` — bit is also not smugglable IN via this path (frozen-at-create invariant).
  - `referral_and_feature_flag_write_sites_share_preservation_mask` — audit hook that fails loudly if the two flag-write sites ever drift apart.

**Audit of remaining `update_gateway_*` sites** (per bean's 'Additionally…' instruction):
- `update_gateway_feature_flags.rs` — already correct (the reference mask).
- `update_gateway_protocol_fee.rs` — surgical `|= FEATURE_CUSTOM_PROTOCOL_FEE` / `&= !FEATURE_CUSTOM_PROTOCOL_FEE`; never a full overwrite, PERMISSIONLESS safe.
- `update_gateway_scheduler_share.rs` — does not touch `feature_flags`.

No other write site exhibits the missing-bit pattern.

**Verification:**
```
cargo test --package tributary --lib instructions::gateway::
→ 7 passed; 0 failed
```
