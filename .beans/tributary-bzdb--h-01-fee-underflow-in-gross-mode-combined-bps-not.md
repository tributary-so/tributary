---
# tributary-bzdb
title: 'H-01: Fee Underflow in Gross Mode — Combined BPS Not Validated'
status: todo
type: task
priority: high
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T05:51:21Z
parent: tributary-4kt4
---

# H-01: Fee Underflow in Gross Mode — Combined BPS Not Validated

| Field          | Value                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**   | High                                                                                                                                      |
| **File**       | `programs/tributary/src/instructions/execute_payment.rs:237-244`                                                                          |
| **Related**    | `programs/tributary/src/instructions/transfer.rs:109-113`, `programs/tributary/src/instructions/composable/execute_composable.rs:376-378` |
| **Program ID** | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ`                                                                                              |
| **Framework**  | Anchor 0.31.1                                                                                                                             |

---

## Description

In gross mode (the default, `feature_flags & 0x02 == 0`), the recipient amount is calculated by subtracting both the gateway fee and the protocol fee from the payment amount:

```rust
// execute_payment.rs:237-244 (gross mode branch)
let recipient = payment_amount
    .checked_sub(gateway_fee)
    .ok_or(TributaryError::ArithmeticOverflow)?
    .checked_sub(protocol_fee)
    .ok_or(TributaryError::ArithmeticOverflow)?;
```

Where:

```
gateway_fee = (payment_amount * gateway_fee_bps) / 10000
protocol_fee = (payment_amount * protocol_fee_bps) / 10000
```

This means: `recipient = payment_amount * (10000 - gateway_fee_bps - protocol_fee_bps) / 10000`

**The combined BPS sum is never validated.** While each individual BPS value is capped at 10000 on write, the sum `gateway_fee_bps + protocol_fee_bps` can equal or exceed 10000. When this happens:

- **Equal to 10000:** `recipient = 0`. The recipient gets nothing. The entire payment is consumed by fees.
- **Greater than 10000:** `checked_sub` fails with `ArithmeticOverflow`. **Every payment through this gateway becomes permanently unexecutable.**

This affects all three fee-calculation sites (execute_payment, transfer, execute_composable), but the fix must be applied at the three write points where BPS values are set.

### The Math

```
Let G = gateway_fee_bps
Let P = protocol_fee_bps (either config.protocol_fee_bps or gateway.custom_protocol_fee_bps)

If G + P >= 10000:
  gateway_fee = amount * G / 10000
  protocol_fee = amount * P / 10000

  If G + P == 10000:
    gateway_fee + protocol_fee == amount (recipient = 0, payment succeeds but recipient gets nothing)

  If G + P > 10000:
    gateway_fee + protocol_fee > amount
    => checked_sub fails => ArithmeticOverflow
    => ALL payments permanently fail for this gateway
```

### Entry Points That Set BPS Without Combined Validation

| Instruction                          | File                             | Line  | Sets                      | Validates       |
| ------------------------------------ | -------------------------------- | ----- | ------------------------- | --------------- |
| `handler_create_payment_gateway`     | `create_payment_gateway.rs`      | 47    | `gateway_fee_bps`         | `<= 10000` only |
| `handler_change_gateway_fee_bps`     | `change_gateway_fee_bps.rs`      | 35    | `gateway_fee_bps`         | `<= 10000` only |
| `handle_update_gateway_protocol_fee` | `update_gateway_protocol_fee.rs` | 49-52 | `custom_protocol_fee_bps` | `<= 10000` only |

None of these check `gateway_fee_bps + protocol_fee_bps < 10000`.

---

## Attack Scenario

1. **Gateway authority** calls `create_payment_gateway` with `gateway_fee_bps = 5000` (50%). Valid — individual cap is 10000.

2. **Program admin** later calls `update_gateway_protocol_fee` with `custom_protocol_fee_bps = 5000` (50%). Valid — individual cap is 10000. The `FEATURE_CUSTOM_PROTOCOL_FEE` flag is enabled for this gateway.

3. Combined BPS = 5000 + 5000 = **10000** (100%).

4. When `execute_payment` runs in gross mode:

   - `gateway_fee = payment_amount * 5000 / 10000 = payment_amount / 2`
   - `protocol_fee = payment_amount * 5000 / 10000 = payment_amount / 2`
   - `recipient = payment_amount - payment_amount/2 - payment_amount/2 = 0`

5. The payment **succeeds** but the recipient receives **zero tokens**. All funds are stolen as fees.

**Worse variant:** If `gateway_fee_bps = 6000` and `custom_protocol_fee_bps = 5000` (combined 11000), then `checked_sub` fails and **all payments are permanently bricked** for every user with an active policy through this gateway. Users cannot cancel fast enough if the gateway signer already triggered payments.

---

## Impact

- **Recipient fund theft:** When combined BPS = 10000, payments execute successfully but the recipient gets nothing. All funds go to fee recipients.
- **Payment DOS / fund lockout:** When combined BPS > 10000, all payments fail with `ArithmeticOverflow`. Users with active policies through this gateway cannot receive payments. Funds remain in user token accounts but the subscription is broken.
- **Affects all payment paths:** `execute_payment`, `transfer`, and `execute_composable` all compute fees identically.
- **No recovery path:** There is no admin function to force-fix a gateway's fee configuration. The gateway authority must manually reduce fees.

---

## Proof of Concept

```rust
// Given:
let payment_amount: u64 = 1_000_000; // 1 USDC (6 decimals)
let gateway_fee_bps: u16 = 6000;     // 60%
let protocol_fee_bps: u16 = 5000;    // 50% (custom_protocol_fee_bps)
// Combined: 11000 bps > 10000

// In gross mode (is_amount_net() == false):

let gateway_fee = payment_amount
    .checked_mul(gateway_fee_bps as u64) // 1_000_000 * 6000 = 6_000_000_000
    .unwrap()
    .checked_div(10000)                  // 600_000
    .unwrap();

let protocol_fee = payment_amount
    .checked_mul(protocol_fee_bps as u64) // 1_000_000 * 5000 = 5_000_000_000
    .unwrap()
    .checked_div(10000)                   // 500_000
    .unwrap();

let recipient = payment_amount
    .checked_sub(gateway_fee)  // 1_000_000 - 600_000 = 400_000
    .unwrap()
    .checked_sub(protocol_fee) // 400_000 - 500_000 = PANIC! ArithmeticOverflow
    .unwrap();

// Result: Every payment through this gateway fails.
// All users with active PaymentPolicy accounts are stuck.
```

**Edge case (combined = exactly 10000):**

```rust
let gateway_fee_bps: u16 = 5000;
let protocol_fee_bps: u16 = 5000;
// Combined: 10000 bps == 100%

let gateway_fee = 1_000_000 * 5000 / 10000 = 500_000;
let protocol_fee = 1_000_000 * 5000 / 10000 = 500_000;

let recipient = 1_000_000 - 500_000 - 500_000 = 0;

// Payment succeeds! Recipient gets zero. All funds stolen as fees.
```

---

## Patch

### 1. Add error variant

**File:** `programs/tributary/src/error.rs`

```diff
     #[msg("Composable policy not found")]
     ComposablePolicyNotFound,
+    #[msg("Combined fee BPS must be less than 10000")]
+    CombinedFeeBpsExceedsMax,
 }
```

### 2. Add validation helper to PaymentGateway

**File:** `programs/tributary/src/state/payment_gateway.rs`

Add this method to the second `impl PaymentGateway` block (after line 82):

```diff
     pub fn is_custom_protocol_fee_enabled(&self) -> bool {
         self.feature_flags & Self::FEATURE_CUSTOM_PROTOCOL_FEE != 0
     }
+
+    /// Validate that gateway_fee_bps + protocol_fee_bps < 10000.
+    /// Must be called after both values are set.
+    pub fn validate_combined_bps(&self, protocol_fee_bps: u16) -> Result<()> {
+        let total = self.gateway_fee_bps as u32
+            + protocol_fee_bps as u32;
+        require!(
+            total < 10000,
+            TributaryError::CombinedFeeBpsExceedsMax
+        );
+        Ok(())
+    }
 }
```

### 3. Patch `create_payment_gateway`

**File:** `programs/tributary/src/instructions/create_payment_gateway.rs`

The handler needs the `config` account's `protocol_fee_bps` to validate against. The config account is already in the context. Add the combined check after individual validation:

```diff
     pub fn handler_create_payment_gateway(
         ctx: Context<CreatePaymentGateway>,
         gateway_fee_bps: u16,
         name: [u8; 32],
         url: [u8; 64],
     ) -> Result<()> {
         // Validate fee basis points
         require!(gateway_fee_bps <= 10000, TributaryError::InvalidFeeBps);

         let gateway = &mut ctx.accounts.gateway;
         let clock = Clock::get()?;

         gateway.authority = ctx.accounts.authority.key();
         gateway.fee_recipient = ctx.accounts.fee_recipient.key();
         gateway.gateway_fee_bps = gateway_fee_bps;
         gateway.is_active = true;
         gateway.created_at = clock.unix_timestamp;
         gateway.bump = ctx.bumps.gateway;
         gateway.name = name;
         gateway.url = url;
         gateway.signer = ctx.accounts.authority.key();

+        // Validate that combined BPS (gateway + protocol default) < 10000
+        gateway.validate_combined_bps(ctx.accounts.config.protocol_fee_bps)?;
+
         emit!(PaymentGatewayCreated {
```

### 4. Patch `change_gateway_fee_bps`

**File:** `programs/tributary/src/instructions/change_gateway_fee_bps.rs`

The config account is already in context. After setting the new BPS, validate:

```diff
     pub fn handler_change_gateway_fee_bps(
         ctx: Context<ChangeGatewayFeeBps>,
         new_fee_bps: u16,
     ) -> Result<()> {
         let gateway = &mut ctx.accounts.gateway;
         let old_fee_bps = gateway.gateway_fee_bps;

         require!(new_fee_bps <= 10000, TributaryError::InvalidFeeBps);

         gateway.gateway_fee_bps = new_fee_bps;

+        // Validate combined BPS with effective protocol fee
+        let effective_protocol_bps = if gateway.is_custom_protocol_fee_enabled() {
+            gateway.custom_protocol_fee_bps
+        } else {
+            ctx.accounts.config.protocol_fee_bps
+        };
+        gateway.validate_combined_bps(effective_protocol_bps)?;
+
         emit!(GatewayFeeBpsChanged {
```

### 5. Patch `update_gateway_protocol_fee`

**File:** `programs/tributary/src/instructions/update_gateway_protocol_fee.rs`

After setting `custom_protocol_fee_bps`, validate combined BPS. When the custom fee is disabled, the protocol default is used, so we must validate against the effective BPS:

```diff
     pub fn handle_update_gateway_protocol_fee(
         ctx: Context<UpdateGatewayProtocolFee>,
         args: UpdateGatewayProtocolFeeArgs,
     ) -> Result<()> {
         let gateway = &mut ctx.accounts.gateway;

         if args.use_custom_protocol_fee {
             gateway.feature_flags |= PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE;
         } else {
             gateway.feature_flags &= !PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE;
         }

         require!(
             args.custom_protocol_fee_bps <= 10000,
             TributaryError::InvalidFeeBps
         );
         gateway.custom_protocol_fee_bps = args.custom_protocol_fee_bps;

+        // Validate combined BPS with effective protocol fee
+        let effective_protocol_bps = if gateway.is_custom_protocol_fee_enabled() {
+            gateway.custom_protocol_fee_bps
+        } else {
+            ctx.accounts.config.protocol_fee_bps
+        };
+        gateway.validate_combined_bps(effective_protocol_bps)?;
+
         msg!(
```

---

## Summary of All Changes

```
error.rs                             +2 lines  (new error variant)
state/payment_gateway.rs             +9 lines  (validate_combined_bps method)
create_payment_gateway.rs            +2 lines  (call validate_combined_bps)
change_gateway_fee_bps.rs            +7 lines  (compute effective BPS, call validate)
update_gateway_protocol_fee.rs       +7 lines  (compute effective BPS, call validate)
```

The validation uses `u32` accumulation to avoid overflow in the addition itself. The threshold is strictly `< 10000` (not `<=`) to prevent the zero-recipient edge case.

---

## Testing Instructions

### 1. Test combined BPS rejection at gateway creation

```typescript
// create_payment_gateway with gateway_fee_bps = 9500
// config.protocol_fee_bps defaults to 100 (1%)
// Combined: 9500 + 100 = 9600 < 10000 → should SUCCEED

// create_payment_gateway with gateway_fee_bps = 10000
// Combined: 10000 + 100 = 10100 >= 10000 → should FAIL with CombinedFeeBpsExceedsMax
```

### 2. Test combined BPS rejection on fee change

```typescript
// Setup: gateway with gateway_fee_bps = 5000, protocol_fee_bps = 100
// Action: change_gateway_fee_bps to 10000
// Combined: 10000 + 100 = 10100 → should FAIL with CombinedFeeBpsExceedsMax

// Action: change_gateway_fee_bps to 9899
// Combined: 9899 + 100 = 9999 < 10000 → should SUCCEED
```

### 3. Test combined BPS rejection on protocol fee update

```typescript
// Setup: gateway with gateway_fee_bps = 5000
// Action: update_gateway_protocol_fee with custom_protocol_fee_bps = 5000
// Combined: 5000 + 5000 = 10000 → should FAIL with CombinedFeeBpsExceedsMax

// Action: update_gateway_protocol_fee with custom_protocol_fee_bps = 4999
// Combined: 5000 + 4999 = 9999 < 10000 → should SUCCEED
```

### 4. Test payments still work after fix

```typescript
// Setup: gateway_fee_bps = 200, protocol_fee_bps = 100 (combined 300 bps = 3%)
// Execute a payment with amount = 1_000_000
// Verify: gateway_fee = 20_000, protocol_fee = 10_000, recipient = 970_000
```

### 5. Run existing test suite

```bash
anchor test
```

All existing tests must pass. Any test that previously set combined BPS >= 10000 should be updated to use valid values.

---

## References

- [Solana Security Best Practices — Arithmetic Overflow](https://solana.com/docs/programs/faq#arithmetic-over--underflow)
- [Anchor Error Handling](https://www.anchor-lang.com/docs/the-accounts-struct#constraints)
- Fee calculation: `programs/tributary/src/instructions/execute_payment.rs:229-245`
- Fee calculation (transfer): `programs/tributary/src/instructions/transfer.rs:109-113`
- Fee calculation (composable): `programs/tributary/src/instructions/composable/execute_composable.rs:376-378`
- BPS write points: `create_payment_gateway.rs:47`, `change_gateway_fee_bps.rs:35`, `update_gateway_protocol_fee.rs:49-52`
