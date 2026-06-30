# Per-gateway fee model with feature-flag gating

> **SUPERSEDED by [ADR-0017](0017-unified-fee-model.md)** — retained for
> rationale history. The unified gateway-fee carve-out model (one
> `gateway_fee_bps` total, decomposed into protocol / scheduler /
> referral / residual) replaces the two-independent-numbers model below.
> The feature-flag descriptions below remain accurate; the fee math they
> gate is what changed.

Every payment splits a fee slice to the protocol (default 100 bps, sent
to `ProgramConfig.fee_recipient`) and a fee slice to the gateway
(`gateway.gateway_fee_bps`, sent to `gateway.fee_recipient`). Combined
protocol + gateway bps must be <10000, enforced at every fee-bps write
site — `create_payment_gateway`, `change_gateway_fee_bps`, and
`update_gateway_protocol_fee` (the protocol-admin fee setter). The other
gateway change/update instructions (`change_gateway_fee_recipient`,
`change_gateway_signer`, `update_gateway_feature_flags`,
`update_gateway_referral_settings`) do not write fee bps and so do not
re-run the check; `update_gateway_feature_flags` additionally cannot
toggle the `FEATURE_CUSTOM_PROTOCOL_FEE` bit, so it cannot change the
effective fee either.

The program stores **no** per-gateway fee-payer field. Gas sponsorship
("fee sponsoring") is a purely client/relayer concern: whoever builds
and signs the Solana transaction pays its compute fee. The program only
constrains _execution authority_ (`fee_payer.key()` must be
`gateway.signer`, `user_payment.owner`, or `recipient` — see
`execute_payment` / `execute_composable`), not the fee payer of the
outer transaction.

Gateway-level behaviour is gated by a `feature_flags: u8` bit-field
rather than separate bools or per-flag accounts:

- `FEATURE_REFERRAL` (0x01) — turn on referral reward distribution
- `FEATURE_NET_AMOUNT` (0x02) — gateway fee computed on post-protocol
  amount instead of gross
- `FEATURE_CUSTOM_PROTOCOL_FEE` (0x04) — let this gateway override the
  protocol fee bps (subject to admin-set ceiling)

A bit-field costs 1 byte; an account-level feature system costs rent
forever and adds an extra account to every execution. Flags are rare and
binary, so the trade-off is obvious.

**Known limitation (deferred, see bean tributary-yqnw / H-04):** every
gateway-admin operation — fee changes, signer rotation, flag toggles —
is single-sig with no timelock and no multisig. A compromised gateway
authority key can redirect fees or rotate the signer atomically. The
protocol admin has the same shape on `ProgramConfig`. Mitigation via
Squads/Realms multisig is an operational responsibility, not a program
change; documented in SECURITY.md.
