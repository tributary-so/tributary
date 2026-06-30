# Unified gateway fee model with scheduler incentive

Supersedes ADR-0006 (per-gateway fee model). Pre-launch: no live economic
dependency on the old independent-fee model, and fee amounts are small
enough that existing policies absorb the change without reload.

The protocol moves from **two independent fee numbers** —
`protocol_fee_bps` on `ProgramConfig` (bps-of-payment, default 100) plus
`gateway_fee_bps` on `PaymentGateway` (bps-of-payment, gateway-set) — to
**one total fee** (`gateway_fee_bps`, gateway-authority-set) decomposed
into **carve-outs** at settle time. The gateway authority controls the
total; the total is then split into four cuts:

- **Protocol cut** = `total_fee × protocol_share_bps`, where
  `protocol_share_bps` is a GLOBAL rate on `ProgramConfig`
  (protocol-admin-set). Per-gateway override via
  `FEATURE_CUSTOM_PROTOCOL_FEE` — the override is **admin-granted**, not
  gateway-controlled, and may be zero (subsidise a strategic partner).
- **Scheduler cut** = `total_fee × scheduler_share_bps`, where
  `scheduler_share_bps` is PER-GATEWAY (gateway-authority-set). This is
  the financial incentive for third-party scheduler execution (ADR-0016):
  without it, a third party has no reason to crank an execute.
- **Referral pool** = `total_fee × referral_allocation_bps`, per-gateway,
  unchanged from ADR-0005. Tiered by `referral_tiers_bps` across three
  levels. Gated by `FEATURE_REFERRAL`.
- **Gateway residual** = `total_fee − protocol − scheduler − referral`,
  routed to `gateway.fee_recipient`. The balancing item.

Constraint at every gateway-fee-bps / share write site:
`protocol_share + scheduler_share + referral_allocation ≤ 10000 bps`.
The residual is what the gateway keeps; it may be zero but never
negative.

**No absolute protocol floor.** ADR-0006 insulated the protocol take as
an independent bps-of-payment; the unified model bounds it by the gateway
fee (a gateway charging 30 bps total at 50% protocol share pays 15 bps to
the protocol). The protocol admin's lever is the global
`protocol_share_bps` rate (and per-gateway overrides): **as long as a
gateway wants to earn anything, the protocol earns too** — a zero-fee
gateway pays no one, which is the gateway's choice. An absolute floor was
considered (Q2 of the design grilling) and rejected: it would require a
minimum-total-fee constraint that overrides gateway pricing autonomy,
and the share rate already gives the admin a clean lever.

**NET_AMOUNT (`FEATURE_NET_AMOUNT`) survives, orthogonal to the split.**
Gross mode: the policy face amount is pulled, fees subtracted from it
(recipient bears the fee). Net mode: fees added on top, the sum pulled
(sender bears the fee). Once the total fee is sized (gross- or
net-basis), it decomposes into the four cuts above as normal. See
`shared/fees.rs` for the gross/net mechanics — unchanged.

**Scheduler cut routing.** On the **trusted path** (`signer ==
gateway.signer`), the scheduler cut merges into the `gateway.fee_recipient`
transfer — the gateway self-rebates (it ran its own scheduler), no extra
account, one merged transfer (compute win). On the **permissionless path**
(any other signer — a third-party scheduler per ADR-0016, or the owner /
recipient self-cranking), the scheduler cut routes to the signer's token
account, supplied as a `remaining_account`; the program verifies
`owner == signer && mint == source_mint`. This optimises the common case
(gateway self-executes: no new account) and keeps the incentive on-chain
for the permissionless case (third party sees the credit in their ATA, no
off-chain trust).

**Scope: protocol-wide.** Both PaymentPolicy and ComposablePolicy share
the same `PaymentGateway` config and fee math; the unified model replaces
the shared fee path, so both families benefit from the scheduler
incentive. This generalises ADR-0004's permissionless-execution principle
to PaymentPolicy in practice: a third-party scheduler now has an economic
reason to crank a subscription, not just a composable policy.

**Rejected alternatives.**

- _Additive scheduler slice._ Keep ADR-0006's two independent numbers;
  carve the scheduler cut from the gateway fee only, leave protocol fee
  as independent bps-of-payment. Rejected: the two-number model is
  confusing for gateway operators, and bolting the scheduler cut onto the
  old model leaves the protocol fee inconsistent with "the gateway fee is
  the one economic knob." The unified model is simpler and makes the
  scheduler incentive first-class.

- _Global scheduler share._ Considered during design (would give
  third-party schedulers perfectly uniform economics across all gateways).
  Rejected: it strips the gateway authority of control over their own
  scheduler economics — a high-margin gateway may want to pay schedulers
  more to attract competitive execution; a low-margin gateway may not.
  Per-gateway scheduler share preserves gateway autonomy while still
  letting schedulers reason about per-gateway rates before opting in.

- _Absolute protocol floor_ (`min_protocol_fee_bps` / `min_gateway_fee_bps`).
  Considered (Q2 of design grilling) to protect the protocol treasury from
  race-to-bottom gateway pricing. Rejected: in the carve-out model the
  floor only works as a minimum-total-fee constraint, which overrides
  gateway pricing autonomy; the global share rate already gives the
  protocol admin a clean lever, and the custom-override path handles
  strategic-partner cases (including zero).

- _Consolidated scheduler cut for all trusted callers._ Considered
  routing the scheduler cut to `gateway.fee_recipient` whenever any of
  ADR-0016's trusted three (gateway.signer / owner / recipient) executes.
  Rejected: when the owner or recipient self-cranks they did the work,
  not the gateway — paying the gateway would misallocate the incentive.
  Consolidation applies only when `signer == gateway.signer` (the
  gateway's own scheduler); everyone else gets the cut to their own
  account.
