# Referral chain hardened at execution: re-validated + payer-bound

The v1 referral design validated the chain once at `create_referral_account`
time and trusted it at execution. C-02 showed this was a vector: a payer
could supply any referral accounts at execute time, in any order, with
no binding to their own referral relationship. The fix re-validates the
chain **at every execution** and binds it to the payer (bean
tributary-361p).

The execution-time validation rules:

- `remaining_accounts[0]` **must** be the payer's own `ReferralAccount`
  (asserted against the payer wallet, else `PayerReferralMismatch`).
- The chain is walked via `referrer` pointers: `chain[i].referrer ==
chain[i+1].key`, head bound to `payer_referral.referrer`.
- Duplicates are rejected via a small fixed-size `Vec<Pubkey>` seen-set
  (a `BTreeSet` was tried first and triggered a BPF stack overflow under
  driftsort — lesson learnt).
- Reward tiers are assigned by **depth** (L1 = direct referrer first),
  not by SDK-supplied array position — which also fixed a latent bug
  where the SDK's order was being reversed on-chain.

The new `remaining_accounts` layout is a breaking API change:
`[payer_referral, L1, L2, L3, ATA_L1, ATA_L2, ATA_L3]` (was
`[L1, L2, L3, …]`). SDK callers must prepend the payer's own referral
via the `buildReferralRemainingAccounts` helper.

Re-validating at execution costs extra CU per payment (chain walk + 3
optional loads). The alternative — trust-once-at-create — is cheaper but
leaves the chain topology unverified at the moment money actually moves,
which is exactly what C-02 exploited. On a payments primitive, pay the
CU.
