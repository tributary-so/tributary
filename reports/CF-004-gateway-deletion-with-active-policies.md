# CF-004: Gateway Deletion Allowed With Active Policies — Payments Permanently Bricked

> **Severity:** 🟡 6 (MEDIUM)  
> **Category:** State Machine  
> **Status:** Open  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**File:** `programs/tributary/src/instructions/gateway/delete_payment_gateway.rs:12–28`

```rust
#[account(
    mut,
    seeds = [GATEWAY_SEED, authority.key().as_ref()],
    bump = gateway.bump,
    close = admin,
    // ← NO constraint on active policy count
)]
pub gateway: Box<Account<'info, PaymentGateway>>,
```

The code even acknowledges the risk: `// NOTE: Deleting a gateway with active policies will cause policies to become stale!`

**Compare with `delete_user_payment.rs:20–21` (correct):**

```rust
constraint = user_payment.active_policies_count == 0 @ TributaryError::HasActivePolicies,
constraint = user_payment.active_composable_count == 0 @ TributaryError::HasActiveComposables,
```

---

## Root Cause

`PaymentGateway` does not track an active-policy count. `UserPayment` tracks both `active_policies_count` and `active_composable_count`, but these are scoped to the user+mint pair, not the gateway. There is no O(1) way to check whether any policies reference a gateway at deletion time.

The gateway is simply closed and zeroed. Every `PaymentPolicy` and `ComposablePolicy` that stores `gateway: Pubkey` pointing at the deleted account now references a non-existent account. On next `execute_payment` / `execute_composable` call, Anchor fails to deserialize the gateway account (it's been zeroed and returned to System Program ownership), and the transaction reverts.

---

## Exploit Scenario

### Rogue/compromised admin bricks a gateway's payment infrastructure

```
1. Gateway G is operational, serving 10,000 active payment policies.
   Users have delegated token amounts to their UserPayment PDAs.

2. Gateway authority key is compromised (or the authority goes rogue).

3. Authority calls delete_payment_gateway.
   → Gateway account closed, lamports refunded to admin.
   → Gateway data zeroed, ownership transferred to System Program.

4. All 10,000 policies are now permanently un-executable:
   - execute_payment tries to load gateway as Account<PaymentGateway>
   - Account is zero bytes, owned by System Program
   - Deserialization fails → every execution reverts

5. Users cannot recover:
   - Cannot re-associate their policies with a new gateway (no instruction)
   - Cannot execute payments (gateway deserialization fails)
   - Must delete and recreate their policies under a new gateway
   - Delegate approvals persist on their token accounts (must manually revoke)
```

---

## Impact Assessment

| Dimension     | Value                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| **Fund loss** | No direct theft, but all scheduled payments under the gateway stop executing                  |
| **Scope**     | All PaymentPolicy and ComposablePolicy accounts referencing the deleted gateway               |
| **Recovery**  | Users must individually delete + recreate policies under a new gateway + re-approve delegates |
| **Privilege** | Gateway authority (single key)                                                                |

---

## Patch

### Option A — Track active policy count on PaymentGateway (requires migration)

```diff
 // state/payment_gateway.rs
 pub struct PaymentGateway {
     // ... existing fields ...
+    pub active_policy_count: u32,
+    pub active_composable_count: u32,
     pub padding: [u8; 115],  // reduce to accommodate new fields
 }
```

Then add to `delete_payment_gateway.rs`:

```rust
constraint = gateway.active_policy_count == 0 @ TributaryError::HasActivePolicies,
constraint = gateway.active_composable_count == 0 @ TributaryError::HasActiveComposables,
```

Requires incrementing/decrementing the counters in `create_payment_policy`, `delete_payment_policy`, `create_composable_policy`, `delete_composable_policy`, and `execute_*` (when a policy completes).

### Option B — Require gateway deactivation + cooldown (simpler, no migration)

```diff
 #[account(
     mut,
     seeds = [GATEWAY_SEED, authority.key().as_ref()],
     bump = gateway.bump,
     close = admin,
+    constraint = !gateway.is_active @ TributaryError::Unauthorized,
 )]
 pub gateway: Box<Account<'info, PaymentGateway>>,
```

Force the authority to first set `is_active = false` (via `update_gateway_feature_flags` or a new instruction), wait for any in-flight executions to drain, then delete. This doesn't prevent bricking active policies but at least forces a two-step process that's harder to do accidentally.

### Option C — Accept the risk + add documentation (minimum)

Add a prominent warning and emit an event:

```rust
emit!(PaymentGatewayDeleted {
    gateway: gateway.key(),
    authority: authority.key(),
    name: gateway.name,
    // warning: policies referencing this gateway are now bricked
});
```

**Recommendation:** Option A (proper fix) if a migration is planned. Option B as an interim measure.
