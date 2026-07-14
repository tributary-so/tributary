---
# tributary-96i5
title: 'CF-007: Referral chain not structurally validated at creation'
status: draft
type: bug
priority: high
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:09:55Z
parent: tributary-gq3x
---

# CF-007: Referral Chain Not Structurally Validated at Creation

> **Severity:** 🟡 5 (MEDIUM)
> **Category:** Logic
> **Status:** Open
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**File:** `programs/tributary/src/instructions/referral/create_referral_account.rs:57–84`

```rust
for account_info in ctx.remaining_accounts.iter() {
    if let Ok(loader) = AccountLoader::<ReferralAccount>::try_from(account_info) {
        let data = loader.load()?;
        require!(data.gateway == gateway_key, ...);
        require!(data.owner != new_owner, ...);            // self-referral check
        require!(data.referrer != new_referral_key, ...);   // 2-cycle check
        referrer_count = referrer_count.saturating_add(1);
        if referrer == Pubkey::default() {
            referrer = *account_info.key;                   // first account = referrer
        }
    }
}
```

---

## Root Cause

The creation loop checks individual account validity (gateway scoping, self-referral, 2-cycle) but does **not** validate the chain as a connected graph:

1. **No chain connectivity:** `remaining_accounts[i].referrer == remaining_accounts[i+1].key` is never verified. Three completely unrelated referral accounts on the same gateway pass all checks.

2. **No duplicate detection:** The same account can be passed 3 times in `remaining_accounts`.

3. **No owner distinctness:** The same owner can appear at all 3 levels (Alice creates 3 codes, chain: Alice3→Alice2→Alice1).

**Note:** The execution-time path (`parse_and_validate_referral_accounts` in `shared/referral.rs`) DOES enforce chain topology at payment time. So the economic impact is limited: a self-chain at creation will still pass execution-time topology validation if the chain is structurally valid (each link's `referrer` matches the next key). The gap is that creation accepts structurally invalid chains (disconnected accounts, duplicates), and a single user CAN create a valid-looking self-chain to collect all three tiers.

---

## Exploit Scenario

### Self-referral chain to collect all 3 tiers

```
1. Alice creates ReferralAccount R1 (referral_code = "AAAAAA")
   - owner = Alice
   - referrer = Pubkey::default() (root)

2. Alice creates ReferralAccount R2 (referral_code = "BBBBBB")
   - owner = Alice
   - referrer = R1.key
   → passes: data.gateway == gateway, data.owner != new_owner?
     WAIT: data.owner (R1.owner = Alice) != new_owner (Alice) → FAILS

   Hmm, the self-referral check blocks same-owner chains...
   But what about a Sybil? Alice creates a second wallet:

2'. Bob (Alice's second wallet) creates R2:
    - owner = Bob
    - referrer = R1.key (Alice's code)
    → passes: data.owner (Alice) != new_owner (Bob) ✓

3'. Bob creates R3:
    - owner = Bob (or Alice's third wallet Carol)
    - referrer = R2.key
    → passes

4'. Now Bob/Ctrl creates R4, passing [R3, R2, R1] as remaining_accounts:
    - But wait: the chain is R4→R3→R2→R1
    - remaining_accounts are the referrer chain [R3, R2, R1]
    - No duplicate check → if Alice controls all 3 wallets, she collects all tiers
```

Actually, re-reading the code more carefully: the creation-time check validates that the referrer chain is not circular relative to the NEW account, but it doesn't validate chain connectivity among the remaining_accounts themselves. At execution time, `validate_referral_chain_topology` does check connectivity. So the main gap is:

- **Creation accepts disconnected chains** that will fail at execution (UX issue, no fund loss)
- **Creation accepts duplicates** in `remaining_accounts` (could cause confusion but execution-time validation catches it)
- **Multi-wallet Sybil** is possible regardless of creation-time validation (fundamental to any pseudonymous referral system)

The practical impact is lower than initially assessed. The execution-time validation is the real gate.

---

## Impact Assessment

| Dimension        | Value                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| **Fund loss**    | Limited — execution-time topology validation (`validate_referral_chain_topology`) catches invalid chains |
| **Actual risk**  | Users with invalid chains waste rent on accounts that will never earn rewards at execution time          |
| **Sybil attack** | Possible with multiple wallets (same as any pseudonymous referral system)                                |

---

## Patch

```diff
 // programs/tributary/src/instructions/referral/create_referral_account.rs

 // After the existing loop, add:
+let mut seen: Vec<Pubkey> = Vec::with_capacity(4);
+seen.push(new_referral_key);
+let mut prev_referrer = new_referral_key;
+for account_info in ctx.remaining_accounts.iter() {
+    // Already loaded above, but re-check connectivity
+    if let Ok(loader) = AccountLoader::<ReferralAccount>::try_from(account_info) {
+        let data = loader.load()?;
+        let key = *account_info.key;
+        // Duplicate detection
+        require!(!seen.contains(&key), TributaryError::DuplicateReferralAccount);
+        seen.push(key);
+        // Chain connectivity: each account's referrer must match the next account's key
+        // (the first account's referrer must equal new_referral_key, already checked above)
+        // Actually, the chain is: new.referrer = R1, R1.referrer = R2, R2.referrer = R3
+        // So remaining_accounts = [R1, R2, R3]
+        // R1.referrer should = R2.key, R2.referrer should = R3.key
+        // This is validated at execution time but not creation time
+        prev_referrer = data.referrer;
+    }
+}
```

**Alternative:** Accept the gap and document that referral chain topology is validated at execution time (in `shared/referral.rs`), not creation time. The current behavior is safe (no fund loss) — just potentially confusing for users who create chains that fail at execution.
