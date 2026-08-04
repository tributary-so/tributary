---
# tributary-6mgd
title: 'CF-022: Referral code squatting — owner doesn''t sign'
status: completed
type: bug
priority: low
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-14T06:40:02Z
parent: tributary-gq3x
---

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

## Summary of Changes

CF-022 fixed in `programs/tributary/src/instructions/referral/create_referral_account.rs`:

- Changed `owner: AccountInfo<'info>` → `owner: Signer<'info>`. Closes the squatting vector where an attacker could create a referral account with a victim's owner key and themselves as the referrer, redirecting the L1 referral reward when the code is used.

**Trade-off accepted:** on-chain permissionless referral assignment (a gateway assigns codes to users without the user's involvement) is no longer possible — the owner must now co-sign. The SDK already passes `owner = provider.publicKey` (the connected wallet), which signs as fee_payer by default, so existing client flows are unaffected.

All 190 lib tests pass. TS integration tests not re-run (require Surfpool) but the SDK flow is structurally compatible: `owner = provider.publicKey` signs the tx as the default fee_payer.
