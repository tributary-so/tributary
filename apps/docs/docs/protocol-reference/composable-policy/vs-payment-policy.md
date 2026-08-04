# ComposablePolicy vs. PaymentPolicy

Tributary exposes two families of pull-payment policies that share the same
`PolicyType` enum, `UserPayment` account, `PaymentGateway`, and
fee-distribution logic — but differ sharply in their execution model.

## Decision matrix

| Axis                       | PaymentPolicy                                                                                                                               | ComposablePolicy                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Custody model**          | Non-custodial. User approves delegate; gateway pulls directly.                                                                              | Non-custodial. Same delegate approval; pull routes through an intermediate ATA.                                                                                       |
| **Execution**              | Single CPI: `transfer` from user → recipient + fees.                                                                                        | 7-phase: `BYTE-RANGE CHECKS` → `PULL` (gross) → `SKIM` (input-side fees) → `PRE-VALIDATE` (opt) → `FORWARD` (opt) → `POST-VALIDATE` (opt) → `SETTLE`.                 |
| **Supported hooks**        | None.                                                                                                                                       | Validation (Lighthouse) + Forward (Meteora DLMM, Raydium CPMM/CLMM, Orca Whirlpool), each independently disableable.                                                  |
| **Intermediate accounts**  | None. Funds move directly user_token → recipient_token.                                                                                     | Two ATAs owned by the ComposablePolicy PDA; created lazily, closed at end of every execute.                                                                           |
| **PDA seeds**              | `["payment_policy", user_payment, policy_id]`                                                                                               | `["composable_policy", user_payment, policy_id]`                                                                                                                      |
| **ID counter**             | `user_payment.created_policies_count`                                                                                                       | `user_payment.created_composable_count`                                                                                                                               |
| **CU cost**                | Lower — one Token CPI, no allocation.                                                                                                       | Higher — ATA create + optional CPI(s) + fee math + two ATA closes.                                                                                                    |
| **Rent churn per execute** | None.                                                                                                                                       | Yes — intermediates are created and closed each call; rent returns to fee_payer but costs CU.                                                                         |
| **Fee path**               | Direct (single transfer splits fees off the payment amount; honors `FEATURE_NET_AMOUNT`).                                                   | Same `calculate_fees`, but **input-side** — fees are skimmed from the gross pull in Phase 1b before the forward runs (ADR-0026; NET-on-pull hardcoded, flag ignored). |
| **Settlement shapes**      | Single (direct `transfer` to recipient).                                                                                                    | Three: deliver-no-transform (same-mint) / deliver-transform (swap) / act mode (`output_mint=Pubkey::default()`, ADR-0026).                                            |
| **Delegate model**         | v0 legacy global `PaymentsDelegate` PDA (`["payments"]`) OR v1 per-user `UserPayment` PDA (`["user_payment", owner, mint]`). Both accepted. | Same dual-delegate acceptance; v1 UserPayment PDA is the SDK default.                                                                                                 |
| **Schedule math**          | `shared::schedule::{validate_policy_execution, advance_policy}`                                                                             | Same functions, same calendar-month arithmetic (M-04).                                                                                                                |
| **Permissionless execute** | Yes — any gateway signer, the user, or the recipient.                                                                                       | Yes — same `fee_payer ∈ {gateway.signer, user_payment.owner, recipient}` constraint; cold relayers additionally require post_validation OR a route pin (ADR-0016).    |
| **Use cases**              | Simple recurring billing, milestone escrows, pay-as-you-go with no conditional logic.                                                       | Programmable conditional payments: "topup if balance low", "pull USDC deliver WSOL", native-SOL delivery, Velocity subaccount deposits (act mode).                    |
| **Forward / swap**         | Not supported.                                                                                                                              | Opt-in via `ForwardConfig.instruction_constraint.program_id` (Meteora DLMM, Raydium CPMM/CLMM, Orca Whirlpool).                                                       |
| **Native SOL delivery**    | Not supported.                                                                                                                              | Opt-in via `FORWARD_FLAG_NATIVE_OUTPUT` (WSOL → SOL unwrap).                                                                                                          |
| **External CPI**           | None.                                                                                                                                       | Lighthouse (read-only assertion) + 4 DEX programs (swap). Both hard-allowlisted.                                                                                      |

## When to use PaymentPolicy

Pick `PaymentPolicy` when:

- You want the **simplest** pull payment — fixed schedule, fixed amount,
  fixed recipient, same-mint delivery.
- Recurring billing, milestone escrow, or pay-as-you-go with **no
  conditional logic** and **no token conversion**.
- CU budget is tight (one Token CPI vs. an ATA create/close cycle).
- You do not need to assert on-chain state before paying.

## When to use ComposablePolicy

Pick `ComposablePolicy` when at least one of these is true:

- **Conditional execution** — the payment should only fire if some on-chain
  predicate holds (e.g. "recipient's hot wallet USDC balance is below
  threshold"). Use the validation hook + Lighthouse.
- **Cross-token delivery** — the user pays in token A but the recipient
  wants token B (e.g. pull USDC, deliver WSOL). Use the forward hook +
  Meteora DLMM.
- **Native SOL delivery** — recipient wants SOL, not WSOL. Use the forward
  hook + `FORWARD_FLAG_NATIVE_OUTPUT`.
- **Programmable auto-topup** — pull and deliver the same token, but
  through a PDA-owned intermediate so future upgrades can insert a swap or
  assertion without changing the user-facing flow. Use the disabled-forward
  (same-mint topup) path.

## Behavior with both hooks disabled

A `ComposablePolicy` with `instruction_constraint.program_id == Pubkey::default()`
and `pre/post_validation == ValidationSpec::Disabled` is functionally close
to a `PaymentPolicy` — same pull, same fee split, same schedule math — but:

- It still pays the **intermediate-ATA hop** cost (create + close per
  execute).
- It lives in the `["composable_policy", …]` PDA namespace.
- Its ID comes from `created_composable_count`, not `created_policies_count`.

If you never need hooks, prefer `PaymentPolicy` — it is strictly cheaper
and simpler. Reserve `ComposablePolicy` for policies that benefit from at
least one hook, or for which you anticipate adding one later.

## Counter independence

Because the two policy families draw IDs from independent counters on
`UserPayment`, a single user can hold both a `PaymentPolicy` and a
`ComposablePolicy` with overlapping numeric IDs without collision:

```
UserPayment {
  created_policies_count:   1   → PaymentPolicy #1 at ["payment_policy", …, 1]
  created_composable_count: 1   → ComposablePolicy #1 at ["composable_policy", …, 1]
}
```

The seeds themselves are distinct, so even the address spaces do not
overlap.

## Migration path

There is **no on-chain migration** between `PaymentPolicy` and
`ComposablePolicy` — they are separate account types with separate PDAs.
To "convert", delete one and create the other. The user's `UserPayment`
account and delegate approval carry over unchanged, because both policy
families use the same pull-delegate (UserPayment PDA).

## Related pages

- [ComposablePolicy overview](overview.md)
- [Validation hook](validation-hook.md)
- [Forward hook](forward-hook.md)
- [Native output](native-output.md)
- [Allowlists & sentinels](allowlists-and-sentinels.md)
- [Security model](security-model.md)
