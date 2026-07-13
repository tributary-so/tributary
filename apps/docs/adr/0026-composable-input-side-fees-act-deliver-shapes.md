# Composable input-side fees + act/deliver settlement shapes

The composable fee path is rebased from **output-side** (fees assessed on the
forward's output token, post-swap) to **input-side** (fees assessed on the
gross pull, pre-forward). This is motivated by **act-mode forwards** —
forwards that consume input but produce no fungible output token (e.g. a
Velocity perp-subaccount deposit). The old model could not fee-route such a
forward: there is no output balance to skim from.

## Fee model

- **Gross pull.** The composable pull moves `face + fee` from the user's
  token account. The fee is skimmed from `intermediate_input` BEFORE the
  forward runs. After skim, `intermediate_input` holds exactly `face` — the
  amount the forward instruction consumes (`amount_in = face`).
- **NET-on-pull hardcoded.** `is_net_mode = true` is hardcoded for the
  composable fee path. The alternative (GROSS mode: pull `face`, skim fee
  from it, forward consumes `face − fee`) would make the forward's
  `amount_in` depend on the mutable gateway-fee-bps — a relayer-integration
  nightmare, and the `InstructionConstraint` has no amount-field pin. NET
  makes the forward ix relayer-agnostic and ix-stable regardless of fee-bps
  changes.
- **Fee accounts flip to `input_mint`.** `gateway_fee_account`,
  `protocol_fee_account`, and `scheduler_ata` are all denominated in
  `input_mint`. Gateway operators now earn in the input currency (pre-launch;
  no migration beyond fee ATAs must be input_mint).

## Caps and delegate (gross-denominated)

All composable caps bind on the **gross pull**, not the face:

- `delegated_amount >= face + fee`.
- PayAsYouGo `max_chunk_amount`, `max_amount_per_period`, and the rolling
  period accumulator — all validated and advanced on gross.
- `forward_amount` (caller-supplied) stays as **face** (what the forward
  consumes, = `amount_in` in the swap ix).

Fee-bps hikes can fail execution at the delegate OR at a PayAsYouGo cap.
Both are user-protective. The SDK ships `requiredDelegatedAmount(face,
gateway)` to size delegate approvals; a gateway fee-change signal lets
clients re-approve proactively.

## Residual routing (asset separation by what the forward touched)

| Intermediate balance                                       | Destination                    | Rationale                                               |
| ---------------------------------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `intermediate_input` residue (forward ran, under-consumed) | **User**                       | Returned principal; fee already earned on authorization |
| `intermediate_output` (forward produced)                   | **Recipient**                  | The delivery                                            |
| Fee (on gross pull)                                        | gateway / protocol / scheduler | Non-refundable on authorized gross                      |

## Settlement shapes (three)

| Shape                                          | forward  | `output_mint`                  | `>0` guard | ATA created    |
| ---------------------------------------------- | -------- | ------------------------------ | ---------- | -------------- |
| 1. **Deliver, no transform** (same-mint topup) | disabled | `== input_mint`                | n/a        | input only     |
| 2. **Deliver, transform** (swap)               | enabled  | set, `!= input_mint`           | KEPT       | input + output |
| 3. **Act** (Velocity/collateral)               | enabled  | `Pubkey::default()` (sentinel) | SKIPPED    | input only     |

- **Deliver mode accountability:** Tributary asserts the output EXISTS (`>0`).
  The output AMOUNT floor is the owner's job via `post_validation`.
- **Act mode accountability:** Tributary asserts nothing about delivery. The
  owner's `post_validation` is the only floor.

## Create-time hard rejects

- **forward disabled AND `output_mint != input_mint`** — nonsensical (no
  transform step to reconcile two mints). Already enforced pre-0026; unchanged.
- **Act mode** (`output_mint == Pubkey::default()` + forward enabled): the
  caller passes `SystemProgram` as the `output_mint` account. The handler
  skips output-ATA creation and the deliver sweep. `NATIVE_OUTPUT` flag is
  incompatible with act mode (rejected at create — no output to unwrap).

## Rejected alternatives

- **GROSS mode for composable (fee subtracted from face).** Rejected: the
  forward's `amount_in` would vary with the mutable gateway-fee-bps. A
  relayer building the forward ix offline could not predict `amount_in`
  without knowing the current fee, and the `InstructionConstraint` has no
  field to pin the amount. NET hardcoding makes the ix stable.
- **Fee on output (the v2.1 model).** Rejected: act-mode forwards produce no
  output balance to skim from. The model simply cannot fee-route them.
- **Separate `forward_amount` for fee vs face.** Rejected: introduces a
  second caller-supplied amount, doubling the attack surface for
  amount-confusion bugs. NET-on-pull derives the fee from face + bps
  deterministically; no second amount needed.

## SDK impact

- `createComposablePolicy`: `outputMint` is now optional — `PublicKey.default`
  (sentinel) selects act mode. The `output_mint` account slot receives
  `SystemProgram` when act mode is selected.
- `executeComposable`: fee accounts (`gatewayFeeAccount`,
  `protocolFeeAccount`) now resolve to `input_mint` ATAs. Recipient account
  resolution is shape-aware (output-mint for deliver-transform, input-mint
  otherwise).
- New: `requiredDelegatedAmount(face, gateway)` — computes the gross pull
  (`face + fee`) for delegate-approval sizing.
