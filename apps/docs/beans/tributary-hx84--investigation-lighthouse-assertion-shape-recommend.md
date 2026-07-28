---
# tributary-hx84
title: "Investigation: Lighthouse assertion shape + recommendation for intermediate-output post_validation"
status: completed
type: task
priority: normal
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T12:12:00Z
parent: tributary-mygq
---

Trace process_output_and_sweep (composable_policy.rs) to confirm what the existing >0 guard covers for deliver-transform. Determine if act mode has any backstop. Prototype the Lighthouse assertion (lighthouse.tokenAccount(intermediateOutputAta).amount(0, '>')) via the SDK facade. Produce the (a)/(b)/(c)/(d) recommendation per the epic body. If recommendation is enforce/default, create follow-up feature beans.

## Summary of Changes

No code changes — this is a security investigation. Deliverable is this
writeup + two follow-up feature beans created under the epic
(tributary-nog1, tributary-58ca). Committed in the bean-status-flip commit.

## Trace: the >0 guard and its coverage

The settlement sweep lives in `sweep_output_to_recipient`
(`programs/tributary/src/instructions/composable/execute_composable.rs:512`),
called only from the deliver-transform branch of Phase 5 SETTLE
(line 1338). It enforces at line 523:

```rust
require!(output_amount > 0, TributaryError::ForwardProducedNoOutput);
```

### Settlement-shape coverage matrix (ADR-0026)

| Shape                | Trigger                                             | `>0` guard?    | Gateway swap-manipulation vector?                                                                                                                                                    |
| -------------------- | --------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| deliver-no-transform | forward disabled, `output_mint == input_mint`       | NO (harmless)  | NONE — forward never runs; intermediate holds deterministic `face` after fee skim. Swept by `sweep_input_to_recipient` (line 598).                                                   |
| deliver-transform    | forward enabled, `output_mint` set + != input       | YES (line 523) | MAGNITUDE ONLY — see below.                                                                                                                                                          |
| act                  | forward enabled, `output_mint == Pubkey::default()` | **NONE**       | FULL — forward consumes input for non-token settlement; Tributary asserts nothing about delivery. Code comment at line 1370 confirms: "owner's `post_validation` is the only floor." |

### Threat 1 — magnitude (deliver-transform): REAL, scope-limited

A malicious/compromised gateway controls the forward CPI instruction data
within the pinned constraint (discriminator at offset 0 + pool_state pin).
For CPMM `swap_base_input`, `minimum_amount_out` lives in the instruction
data; the gateway can set it to 0. The swap returns whatever the pool gives
— potentially dust (1 unit). Tributary's `>0` guard is an EXISTENCE
assertion, not a MAGNITUDE assertion: dust passes. The user authorized a
gross pull of `face + fee` of input; the recipient receives 1 unit of
output. This generalizes the removed `min_output_amount` (v2.1) gap.

### Threat 2 — output-mint substitution: CLOSED

The intermediate_output ATA is validated against the ATA derived from the
policy's declared `output_mint` at line 949:

```rust
require!(
    ctx.accounts.intermediate_output_token_account.key() == expected_output_ata,
    TributaryError::IntermediateAccountMismatch
);
```

ATA derivation is deterministic (owner + token_program + mint). The
gateway cannot substitute a different valid intermediate. For the forward
CPI's own `destination_token_account` slot (CPMM index 11, NOT pinned by
the proposed constraint), if the gateway misroutes it, the swap credits a
different account, Tributary reads 0 in its own intermediate, the `>0`
guard fails, tx reverts. User loses only gas. Fails closed.

### Threat 3 — act mode: NO backstop

Act mode skips intermediate_output ATA creation, the deliver sweep, AND
the `>0` guard (lines 1365-1379). The forward consumes input for a
non-token settlement (e.g. Velocity subaccount deposit). Tributary cannot
observe the delivery on-chain — there is no intermediate_output ATA to
read. The owner's `post_validation` is genuinely the only floor, AND the
target account is use-case-specific (the external settlement account),
not a Tributary-controlled intermediate.

## Prototype: Lighthouse assertion shape

The facade call `lighthouse.tokenAccount(intermediateOutputAta).amount(0, ">")` is already exercised in the test suite — see
`tests/scheduler-evaluator.test.ts:126`:

```typescript
const guard = lighthouse
  .tokenAccount(targetAta)
  .amount(10_000_000, ">")
  .build();
```

For a deliver-transform magnitude floor, the owner supplies:

```typescript
const guard = lighthouse
  .tokenAccount(intermediateOutputAta)
  .amount(ownerFloor, ">=") // e.g. 0 for existence parity, or an economic floor
  .build();
// guard.data        → Buffer stored in the post ValidationPda
// guard.numAccounts → 1
// guard.accounts    → [intermediateOutputAta]
```

Facade shape confirmed; no SDK change needed to express the assertion.
The post ValidationPda seed is `["composable_validation_post", composablePolicy]`.

## Recommendation: (b) SDK default + docs; on-chain stays optional

Rejected alternatives:

- **(a) Enforce post_validation on-chain** — removes legitimate flexibility
  (owners who accept any output, volatile-pool fire-and-forget). For act
  mode it's unenforceable: Tributary cannot know which external account
  the post_validation should target — the observable is use-case-specific.
  Reject.
- **(c) No change** — ignores act mode's real gap (no backstop at all).
  Reject.
- **(d) Scope-limited to act mode** — correctly identifies the gap but
  implies a generic act-mode fix exists. It doesn't: act mode's
  post_validation target is external/use-case-specific. The action is
  necessarily SDK-level (warn + docs), which is (b) scoped to act mode.
  Fold into (b).

### Why (b)

1. **Deliver-transform** — the on-chain `>0` guard already closes the
   catastrophic vectors (no output, wrong destination). The magnitude gap
   is an owner-economic preference, not a protocol-safety invariant. The
   SDK should NOT default to emitting a post_validation here (pure
   redundancy with the on-chain guard for existence; the magnitude floor
   is the owner's call). DOCS should show the one-liner for owners who
   want a floor.

2. **Act mode** — NO on-chain backstop. The SDK builder should WARN at
   build time when an act-mode policy is created without a post_validation
   ProgramCall, because the owner is flying blind. But it must NOT throw
   (block) — the target is use-case-specific, Tributary can't validate it.

3. **On-chain** — the existing `>0` guard stays as the hard existence
   floor for deliver-transform. No new on-chain enforcement. No act-mode
   guard (meaningless without a known target).

### Answers to the epic's questions

1. **`amount > 0` sufficient, or `>= owner_floor`?** — For deliver-transform, the on-chain guard is `>0` (existence). A magnitude floor is the owner's economic choice via optional post_validation. For act mode, the assertion shape is entirely use-case-specific.
2. **Enforce on-chain or SDK-default?** — SDK-default + docs. Enforcing is wrong (see rejected (a)).
3. **Does the existing `>0` guard make post_validation redundant for deliver-transform?** — YES for existence. The gap is magnitude (owner-economic), covered by optional post_validation. Act mode is the real hole.
4. **Cost (extra Lighthouse CPI + ValidationPda per policy)?** — Acceptable but OPTIONAL. Owners who want the floor pay for it; owners who don't, don't.

## Follow-up feature beans created

Per the epic directive ("If (a) or (b): create follow-up feature beans"):

- **tributary-nog1** (feature, packages/sdk): SDK builder warning for
  act-mode composable policies created without post_validation.
- **tributary-58ca** (feature, apps/docs): Docs page + ADR-0031 locking
  in the decision (on-chain `>0` guard stays; no enforcement; SDK
  defaults/warnings).

The epic tributary-mygq stays `todo` — its new feature children are not
yet complete.
