# CF-022: Referral Code Squatting — Owner Doesn't Sign

> **Severity:** ⚪ 2 (INFO)  
> **Category:** Access Control  
> **File:** `programs/tributary/src/instructions/referral/create_referral_account.rs:7–9`  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

```rust
/// CHECK: The owner account - does NOT need to sign
#[account()]
pub owner: AccountInfo<'info>,
```

Anyone can create a referral account with any owner key and any available code. Since `init` prevents duplicate PDA creation, this squats the code — the real owner can never create that code themselves.

## Impact

62^6 ≈ 56 billion possible codes. Attacker wastes their own rent. Victim can use a different code. But if the attacker sets themselves as the referrer on the squatted account, they redirect the L1 referral reward when someone uses that code.

## Patch (optional)

If permissionless creation is a design choice, document it. Otherwise:

```diff
-pub owner: AccountInfo<'info>,
+pub owner: Signer<'info>,
```

This forces the owner to authorize their own referral code creation. Trade-off: prevents on-chain referral assignment (where a gateway assigns codes to users without the user's involvement).
