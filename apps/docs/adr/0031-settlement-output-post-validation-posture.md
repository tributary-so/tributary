# Settlement output post_validation — on-chain `>0` guard stays; no enforcement; SDK defaults

ADR-0026 introduced three settlement shapes (deliver-no-transform,
deliver-transform, act) and stated that the on-chain `output_amount > 0`
guard covers deliver-transform existence while act mode relies on the
owner's `post_validation`. This ADR locks in the follow-up decision:
**should Tributary enforce a post_validation on-chain, or stay with the
owner-optional / SDK-default posture?**

## Decision

**No on-chain enforcement of post_validation.** The on-chain
`output_amount > 0` guard (`sweep_output_to_recipient`,
`execute_composable.rs:523`) stays as the hard **existence** floor for
deliver-transform. Owners who want a **magnitude** floor (output ≥ N)
opt in via a Lighthouse `post_validation` assertion. The SDK provides
defaults and warnings; the program does not reject policies that lack a
post_validation.

### Coverage by settlement shape

| Shape                | On-chain guard                                                                                                     | Gateway magnitude vector?                                                                 | post_validation role                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| deliver-no-transform | n/a (forward disabled; `face` swept deterministically)                                                             | none                                                                                      | not needed                                                            |
| deliver-transform    | `output_amount > 0` (existence + wrong-destination closed via ATA-derivation check at `execute_composable.rs:949`) | **dust**: gateway sets swap `minimum_amount_out = 0`, recipient gets 1 unit, guard passes | optional; owner-economic magnitude floor                              |
| act                  | **none** (no intermediate_output ATA; forward consumes input for non-token settlement)                             | **full**: forward delivers nothing observable to Tributary                                | the only backstop, but target is use-case-specific (external account) |

### Why not enforce on-chain

1. **Act mode is unenforceable.** The post_validation target in act mode
   is the external settlement account (e.g. a Velocity subaccount), not a
   Tributary-controlled intermediate. The program cannot know which
   account the assertion should target — it is composable-policy-specific.
   An on-chain "require post_validation = ProgramCall" check would force
   every act-mode policy to wire a Lighthouse assertion even when the
   delivery is not cleanly on-chain observable, removing the shape
   entirely.
2. **Deliver-transform is already covered for existence.** The
   catastrophic vectors — no output at all, output delivered to the wrong
   account — fail closed: the `>0` guard reverts the transaction and the
   user loses only gas. The residual gap is **magnitude** (dust), which
   is an owner-economic preference, not a protocol-safety invariant.
3. **Flexibility.** Legitimate use cases accept any non-zero output
   (volatile pools where any execution beats none, trusted gateways).
   Forcing a floor removes those use cases.

### The output-mint substitution vector (closed)

A gateway controls the forward CPI's `remaining_accounts` and, within the
pinned constraint, the instruction data. For Raydium CPMM
`swap_base_input`, the `destination_token_account` (account index 11) is
**not** pinned by the proposed `InstructionConstraint` (pins: pool_state
@index 3, amm_config @index 2). If the gateway misroutes the destination,
the swap credits a different account; Tributary reads 0 in its own
validated intermediate (`execute_composable.rs:949` ATA-derivation check);
the `>0` guard fails; tx reverts. ATA derivation is deterministic
(owner + token_program + mint), so there is exactly one valid
intermediate_output for the declared `output_mint` — no substitution is
possible. This closes threat (2) from the investigation epic for all
forward programs, not just CPMM.

## Rejected alternatives

1. **(a) Enforce post_validation on-chain for deliver-transform + act
   mode.** Rejected: unenforceable for act mode (target is external), and
   removes legitimate flexibility for deliver-transform (owners who accept
   any non-zero output).
2. **(c) No change / document only.** Rejected: ignores act mode's real
   gap — there is literally no on-chain backstop, and an owner who doesn't
   read the source will not realize their forward can deliver nothing.
   The SDK must warn.
3. **(d) Scope-limited to act mode.** Correct gap analysis but implies a
   generic act-mode fix exists. It does not: the post_validation target
   is use-case-specific. The action is necessarily SDK-level (warn +
   docs), which is option (b).

## SDK + docs impact

- **SDK builder warning (tributary-nog1):** when an act-mode composable
  policy is created without a `post_validation` ProgramCall, emit
  `console.warn` pointing at this ADR and the security-model page. Warn,
  not throw — the target is use-case-specific.
- **Docs (this ADR + security-model.md §7):** document the per-shape
  posture and the deliver-transform magnitude-floor recipe:
  ```typescript
  lighthouse
    .tokenAccount(intermediateOutputAta)
    .amount(ownerFloor, ">=")
    .build();
  ```
- **On-chain:** no change. The existing `>0` guard is the existence
  floor; post_validation generalizes the removed `min_output_amount`
  (v2.1) as an owner-optional magnitude floor.

## Cost

A post_validation ProgramCall costs one Lighthouse CPI + one
`ValidationPda` account (`["composable_validation_post", composablePolicy]`,
≤512 bytes assertion data) per policy. Acceptable as an **opt-in** —
owners who want the floor pay for it; owners who don't, don't.
