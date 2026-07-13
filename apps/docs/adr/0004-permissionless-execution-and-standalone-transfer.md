# Permissionless execution and the standalone `transfer` instruction

Payment execution is **permissionless**: any transaction signed by
`gateway.signer` lands, regardless of who the caller is. There is no
per-call ACL beyond the signer check. This lets gateways run shared,
high-availability executor services without whitelisting individual
operator keys.

The protocol also exposes a standalone `transfer` instruction that wraps
an SPL `transfer` + memo event **and** participates in fees + referral
rewards. We chose to integrate fees/referrals into `transfer` rather
than ship a bare wrapper, so one-time payments cannot be used to bypass
the protocol/gateway fee split.

`create_user_payment` **does** require the `owner` to sign
(`owner: Signer` in `instructions/user/create_user_payment.rs`). The
signature binds the UserPayment PDA identity — seeds are
`["user_payment", owner, token_mint]` — so an attacker cannot
front-run a user and create the account out from under them. What is
outsourcable is the **rent**: a separate `fee_payer` Signer pays the
account rent and can be a gateway/relayer, so onboarding is gasless
for the user in SOL terms while still requiring their signature. The
user still has to approve the token delegate on their ATA themselves,
which is the actual trust boundary.
