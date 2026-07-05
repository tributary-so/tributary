# Composable settlement semantics

Three settlement rules are pinned in `execute_composable` that are not
implied by the rest of the design. Each closes a real money-flow bug
that surfaced during the audit / integration phase.

1. **`min_output_amount` is checked against the NET (post-fee) output,
   not the gross.** A naive reading would check the gross swap output
   against `min_output_amount`, then deduct fees, leaving the recipient
   with less than the floor. DeFi convention is that the floor is what
   the user actually receives — so we deduct protocol + gateway fees
   from the swap output first and check the remainder against
   `min_output_amount`. (bean tributary-qmns)

2. **`forward_amount` is rejected for non-PayAsYouGo policies.** The
   `execute_composable` instruction accepts an optional `forward_amount`
   argument. For `PayAsYouGo` it is the per-call chunk (legitimate, the
   variant is caller-supplied by design). For `Subscription` and
   `Milestone`, however, the schedule already fixes the amount — so
   accepting a `forward_amount` would let any gateway signer charge
   above the agreed amount and drain the user. The fix rejects
   `Some(_)` for non-PayAsYouGo variants and uses the schedule amount
   unconditionally. (bean tributary-7o4z, severity C-1)

3. **The NATIVE_OUTPUT flag unwraps WSOL to native SOL via a Tributary-
   controlled `closeAccount` sweep, not a generic wrap/unwrap forward.**
   The naive design would allowlist the Token Program as a forward
   target and let the gateway "unwrap" via `closeAccount`. But
   `closeAccount` takes a caller-supplied `destination`, and a gateway
   could redirect the WSOL to itself. Instead, `forward_flags` bit 0
   (`FORWARD_FLAG_NATIVE_OUTPUT`) switches the post-swap sweep from a
   `transfer_checked` to a Tributary-owned `closeAccount` whose
   `destination` is pinned on-chain to `composable_policy.recipient`.
   This is opt-in (the default "WSOL delivery to recipient ATA" path is
   unchanged) and requires `output_mint == NATIVE_MINT` at create-time.
   (bean tributary-hgp7)

Together these three rules make the composable money flow invariant:
the gateway can never redirect funds to anyone except the pinned
recipient, the protocol fee account, and the gateway fee account.

---

## Amendment (2026-07-02, bean tributary-zvku — Composable v2.1)

**Rule 1 (`min_output_amount`) is REMOVED.** The `min_output_amount` field
has been deleted from `ForwardConfig`. The new `post_validation` phase
generalizes it: owners use a Lighthouse assertion to check output (or any
other post-forward state). The NET/gross question is the owner's problem —
the fee breakdown is emitted in the `ComposableExecuted` event for
transparency.

Rules 2 and 3 are unchanged.

---

## Amendment (2026-07-05, bean tributary-cqr4 — Composable v2.2: input-side fees)

**Rule 1's successor (the `>0` guard) is now mode-conditional.** With the
move to input-side fees (ADR-0026), Tributary no longer calculates fees on
the output balance — the `>0` check survives only as an **existence
assertion** on the forward's output, and only in **deliver-transform** mode.

| Settlement shape                  | `>0` guard                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Deliver, no transform (same-mint) | n/a — no forward, no output                                                   |
| Deliver, transform (swap)         | **KEPT** — Tributary asserts output EXISTS                                    |
| Act (Velocity/collateral)         | **SKIPPED** — no fungible output; owner's `post_validation` is the only floor |

The output AMOUNT floor (how much output is "enough") remains the owner's
job via `post_validation` in all modes. Tributary's role is accountability
that delivery happened at all — and in act mode, by definition, it did not.
