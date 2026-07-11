# CF-001: Missing `has_one = user_payment` in `execute_payment` — Cross-Account Token Drain

> **Severity:** 🔴 10 (CRITICAL)  
> **Category:** Account Validation  
> **Status:** Open — **BLOCKS DEPLOY**  
> **PoC Tier:** `[PoC-PROSE]` (structured attacker-narrative; verified by code inspection)  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**File:** `programs/tributary/src/instructions/payment/execute_payment.rs:35–41`

```rust
#[account(
    mut,
    seeds = [
        PAYMENT_POLICY_SEED,
        payment_policy.user_payment.as_ref(),   // ← BUG: self-referential
        payment_policy.policy_id.to_le_bytes().as_ref()
    ],
    bump = payment_policy.bump,
    constraint = payment_policy.status == PolicyStatus::Active @ TributaryError::PolicyPaused,
)]
pub payment_policy: Box<Account<'info, PaymentPolicy>>,
```

**Missing:** `has_one = user_payment` or explicit `constraint = payment_policy.user_payment == user_payment.key()`

---

## Root Cause

The PDA seed derivation for `payment_policy` uses `payment_policy.user_payment.as_ref()` — a field read from the **policy account's own deserialized data**, not from the `user_payment` context account's runtime key.

PDA verification with self-referential seeds is a well-known Solana security anti-pattern. It proves the policy account IS the canonical PDA for whatever `user_payment` pubkey is stored in its bytes, but it does **not** bind the policy to the `user_payment` account actually passed in the transaction context. An attacker can pass a mismatched pair: their own policy + the victim's UserPayment.

Every sibling instruction in the program avoids this pattern by using the **context account's** key:

```rust
// change_payment_policy_status.rs:22–26 — CORRECT
seeds = [PAYMENT_POLICY_SEED, user_payment.key().as_ref(), policy_id...]

// delete_payment_policy.rs:28–32 — CORRECT
seeds = [PAYMENT_POLICY_SEED, user_payment.key().as_ref(), policy_id...]

// execute_payment.rs:37 — VULNERABLE
seeds = [PAYMENT_POLICY_SEED, payment_policy.user_payment.as_ref(), ...]
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ account's own data
```

---

## Downstream Constraint Trace (why nothing else catches it)

| Constraint                                                  | What it checks                                                  | Why it doesn't save you                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| `payment_policy` PDA seeds                                  | Policy is canonical PDA for `payment_policy.user_payment` field | Passes — uses stored field, not context account                 |
| `user_payment` PDA seeds                                    | UserPayment is canonical PDA for `owner + token_mint`           | Passes — victim's UserPayment is a real account                 |
| `gateway.key() == payment_policy.gateway`                   | Gateway matches the policy's stored gateway                     | Passes — attacker uses their own gateway                        |
| `gateway.is_active`                                         | Gateway is active                                               | Passes — attacker created it active                             |
| `user_token_account.key() == user_payment.token_account`    | Token account belongs to the context UserPayment                | Passes — victim's token account belongs to victim's UserPayment |
| `token_account_has_any_delegate(...)`                       | Delegate is UserPayment PDA or legacy PaymentsDelegate          | Passes — victim has delegate set (standard)                     |
| `recipient_token_account.owner == payment_policy.recipient` | Recipient ATA owner matches policy recipient                    | Passes — attacker's recipient                                   |
| `fee_payer == gateway.signer \|\| ...`                      | Caller authorized                                               | Passes — attacker is their own gateway signer                   |

**No constraint anywhere validates that `payment_policy.user_payment == user_payment.key()`.**

---

## Exploit Scenario

### Setup (attacker prepares their own accounts)

```
Attacker: Eve (keypair: eve_keypair)
Victim:   Bob (has UserPayment U2 with delegate set, 1_000_000 USDC balance)

1. Eve creates PaymentGateway G:
     authority  = eve
     signer     = eve
     fee_bps    = 0
     is_active  = true

2. Eve creates UserPayment U1:
     owner       = eve
     token_mint  = USDC
     token_account = eve_usdc_ata

3. Eve creates PaymentPolicy P1 under U1:
     user_payment = U1   (stored in P1's data)
     recipient    = eve_wallet
     gateway      = G
     policy_type  = PayAsYouGo {
         max_chunk_amount      = u64::MAX
         max_amount_per_period = u64::MAX
         period_length_seconds  = 31_536_000  // 1 year
         current_period_start   = now
         current_period_total   = 0
     }
     status = Active
```

### Attack (single transaction)

```
Eve calls execute_payment:
  fee_payer              = eve          (== G.signer ✓)
  payment_policy         = P1           (PDA seeds use P1.user_payment = U1 ✓)
  user_payment           = U2           (PDA seeds use U2.owner + U2.token_mint ✓)
                                          ^^^ VICTIM'S account
  user_token_account     = bob_usdc_ata (key == U2.token_account ✓)
  recipient_token_account = eve_usdc_ata(owner == P1.recipient ✓)
  gateway                = G            (key == P1.gateway ✓, is_active ✓)
  config                 = ProgramConfig (emergency_pause == false ✓)
  payment_amount         = 1_000_000

Handler executes:
  resolve_delegate(user_payment = U2, ...) → resolves U2's PDA
  validate_policy_execution passes (PayAsYouGo, chunk > 0, <= max)
  calculate_fees: total_from_user = 1_000_000 (fee_bps = 0)
  delegated_amount >= 1_000_000 ✓ (Bob has approved delegate)
  user_token_account.amount >= 1_000_000 ✓

  CPI: transfer_checked(
    from   = bob_usdc_ata,
    to     = eve_usdc_ata,     ← ATTACKER
    amount = 1_000_000,
    authority = U2_PDA         ← victim's PDA signs
  )

  Result: 1_000_000 USDC moves from Bob → Eve.
```

### Why the CPI succeeds

The CPI is signed with the **UserPayment PDA's** seeds. `resolve_delegate` (delegation.rs:34–41) reads `user_payment` (the context account = U2) and constructs signer seeds from U2's owner, token_mint, and bump. The SPL Token program verifies the delegate on `bob_usdc_ata` is U2's PDA — which it is. The transfer is authorized by the victim's own delegation authority.

---

## Impact Assessment

| Dimension                    | Value                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Fund loss**                | Full victim token balance (up to `delegated_amount`)                                                    |
| **Preconditions**            | Victim must have a Tributary delegate set (standard for any user who has created a policy)              |
| **Privilege required**       | None — permissionless                                                                                   |
| **Atomicity**                | Single transaction                                                                                      |
| **Capital cost to attacker** | ~0.05 SOL (rent for U1, G, P1, and ATAs — all attacker-owned, recoverable)                              |
| **Profit**                   | Victim's entire token balance                                                                           |
| **Detectability**            | Transaction would appear on-chain; the mismatched accounts are visible but no on-chain guard rejects it |

---

## Patch

### Option A — Change PDA seeds to use context account (preferred, matches siblings)

```diff
 // programs/tributary/src/instructions/payment/execute_payment.rs

 #[account(
     mut,
-    seeds = [
-        PAYMENT_POLICY_SEED,
-        payment_policy.user_payment.as_ref(),
-        payment_policy.policy_id.to_le_bytes().as_ref()
-    ],
+    seeds = [
+        PAYMENT_POLICY_SEED,
+        user_payment.key().as_ref(),
+        payment_policy.policy_id.to_le_bytes().as_ref()
+    ],
     bump = payment_policy.bump,
     constraint = payment_policy.status == PolicyStatus::Active @ TributaryError::PolicyPaused,
 )]
 pub payment_policy: Box<Account<'info, PaymentPolicy>>,
```

This matches the pattern used by `change_payment_policy_status.rs:24` and `delete_payment_policy.rs:30` exactly. The PDA is now derived from the **context account's runtime key**, which binds the policy to the UserPayment actually passed in the transaction. If `payment_policy.user_payment != user_payment.key()`, the PDA won't match and Anchor rejects the account.

### Option B — Add explicit has_one constraint (equivalent)

```diff
 #[account(
     mut,
     seeds = [
         PAYMENT_POLICY_SEED,
         payment_policy.user_payment.as_ref(),
         payment_policy.policy_id.to_le_bytes().as_ref()
     ],
     bump = payment_policy.bump,
+    has_one = user_payment,
     constraint = payment_policy.status == PolicyStatus::Active @ TributaryError::PolicyPaused,
 )]
 pub payment_policy: Box<Account<'info, PaymentPolicy>>,
```

`has_one` enforces `payment_policy.user_payment == user_payment.key()` at runtime. Functionally identical to Option A.

**Recommendation:** Option A. It makes the seed pattern consistent across all instructions, eliminating the cognitive load of "why does execute_payment look different from the others?"

---

## Verification

After applying the patch:

1. **Negative test:** Construct a transaction with mismatched `payment_policy` + `user_payment`. It must fail with Anchor's `ConstraintSeeds` error (PDA mismatch).

2. **Positive test:** Construct a transaction with matching accounts (normal flow). It must succeed.

3. **Regression check:** `change_payment_policy_status` and `delete_payment_policy` already use the `user_payment.key().as_ref()` pattern — verify they still pass.

4. **Fuzz test (recommended):** Create a stateful fuzz harness that randomizes `(policy, user_payment)` pairs and asserts that only matching pairs succeed in `execute_payment`.
