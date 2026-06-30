---
# tributary-bq1l
title: 'CLI: composable topic — create/execute/status/delete'
status: completed
type: task
priority: high
created_at: 2026-06-29T07:51:25Z
updated_at: 2026-06-30T08:01:07Z
parent: tributary-hy8a
blocked_by:
    - tributary-p6n3
    - tributary-3pvf
---

Parent: `tributary-hy8a` — CLI v2 epic
Track: B (surface contract) · Blocked-by: `cli-cleanup` AND `tributary-3pvf`
(SDK lighthouse facade must pass **pinned** validation accounts at creation per
ADR-0016; the current `getCreateComposablePolicyInstruction` still takes the
pre-refactor `numValidationAccounts`, so building now = throwaway).

## Requirement

Give `ComposablePolicy` a first-class CLI surface — `composable create /
execute / status / delete` — exposing the validation (Lighthouse) and forward
(Meteora DLMM) hooks as opt-in flags, driven by a JSON spec file for
scriptability.

## Spec

New topic `apps/cli/src/commands/composable/`. It is a **separate topic**, not
a `--composable` flag on `policy create` — see Decision below.

- **`composable create`**
  - `--variant subscription|milestone|pay-as-you-go` (same `PolicyType` enum,
    ADR-0002).
  - `--validation <file|->` — a JSON spec consumed by the `lighthouse` facade
    (`packages/sdk/src/lighthouse.ts`): the file maps to
    `lighthouse.tokenAccount(ata).amount(n,"<").build()` etc. Produces
    `{ data, accounts }`; the accounts become the **pinned** validation targets
    (ADR-0016). Omit the flag → validation disabled (`SystemProgram` sentinel,
    ADR-0009).
  - `--forward <program> --input-mint … --output-mint … --min-output …
[--native-output] [--forward-ix-template <file>]` — builds the
    `ForwardConfig` incl. the offset-0 discriminator `ByteRangeCheck`
    (ADR-0009). Omit → forward disabled (`Pubkey::default()` sentinel).
  - `--output-mint native` + `--native-output` sets the NATIVE_OUTPUT flag
    (ADR-0010 #3).
- **`composable execute`**
  - `--forward-ix <file|->` (forward program instruction data; empty if forward
    disabled) and `--forward-amount <u64>` (**PayAsYouGo-only**; client-side
    reject for other variants per ADR-0010 #2).
  - Caller assembles `remaining_accounts` as `[...validation_targets,
...forward_accounts]` (ADR-0013 scope rule: the facade owns only the
    Lighthouse targets; Tributary's full remaining-accounts list stays in the
    caller).
  - Permissionless: any signer may relay for a gateway with the 0x08 open-relay
    flag (ADR-0016); a cold relayer requires `min_output_amount = Some(>0)`.
- **`composable status`** — wraps `sdk.changeComposablePolicyStatus`.
- **`composable delete`** — wraps `sdk.deleteComposablePolicy`.

### Decisions cited (NOT re-decided — resolves epic Open Q1/Q2/Q3)

- **ADR-0007** → **separate `composable` topic, not a `--composable` flag.**
  ComposablePolicy is a _separate account type_ with its own PDA namespace and
  distinct fields (`forward_config`, `validation_config`, `total_input`,
  `total_output`); a flag on `policy create` cannot carry the create-arg
  surface. **ADR-0015 is a positioning/narrative decision (landing-page voice),
  not a CLI-structure decision** — it does not override ADR-0007's operational
  separation. _(Resolves Open Q1.)_
- **ADR-0013** → validation UX is **spec-file → facade** (CLI-idiomatic,
  scriptable), not a fluent sub-DSL. The facade owns only the Lighthouse
  `target_account(s)` and returns `{ data, numAccounts, accounts }`; the caller
  (CLI) assembles Tributary's full `remaining_accounts`. _(Resolves Open Q2.)_
- **ADR-0009** → both hooks are sentinel-disabled; omitting `--validation` /
  `--forward` disables them. Forward-enabled requires ≥1 offset-0
  `ByteRangeCheck`.
- **ADR-0010** → `min_output_amount` is checked against the **NET** (post-fee)
  output; `--forward-amount` is **PayAsYouGo-only** (reject client-side for
  Subscription/Milestone); `--native-output` uses the Tributary-owned
  `closeAccount` sweep pinned to `recipient`.
- **ADR-0008** → no CLI privilege concern (signer sanitization is on-chain); CLI
  just supplies accounts positionally.
- **ADR-0016** → validation target accounts are **pinned at creation** (stored
  in the typed `ValidationPda`), `num_validation_accounts` is **dropped**. This
  is why the child is blocked-by `tributary-3pvf` — the SDK create signature
  changes. Cold-relayer execution requires `min_output_amount = Some(>0)`.
- **ADR-0014** → the scheduler is an **off-chain service** (cron spine + 30s
  poll), _not_ a CLI command. The CLI ships `composable execute` (a single
  relayer fire); the loop is out of scope. _(Resolves Open Q3.)_

## Acceptance Criteria

- [ ] `composable create --variant pay-as-you-go` with a Lighthouse JSON spec + a forward config creates a policy end-to-end on Surfpool.
- [ ] `composable create` with neither `--validation` nor `--forward` produces
      the sentinel-disabled (PaymentPolicy-like) topup shape.
- [ ] `composable execute --forward-amount N` succeeds for PayAsYouGo and is
      **rejected client-side** for Subscription/Milestone.
- [ ] `composable status` / `composable delete` round-trip.
- [ ] A cold relayer can `execute` against a 0x08-flagged gateway only when
      `min_output_amount = Some(>0)`.

## Test Plan

- Port the flows from `tests/composable.test.ts`, `tests/topup-balance.test.ts`,
  `tests/topup-balance-swap.test.ts`, and `tests/topup-balance-sol.test.ts` as
  CLI smoke tests against Surfpool (these already prove every instruction
  end-to-end).
- Validate the Lighthouse JSON-spec → facade mapping against the assertion
  families in `packages/sdk/src/lighthouse.ts` (tokenAccount, mintAccount,
  accountInfo, accountData, accountDelta, sysvarClock, stakeAccount,
  merkleTree).
- Negative: forward-enabled without an offset-0 ByteRangeCheck → program error;
  `--forward-amount` on a Subscription → client error.
- Lint + build clean.

## Workflow

routing: implementer · cannot start until `tributary-3pvf` lands the pinned
validation accounts in the SDK facade.

## Summary of Changes

Added composable topic with create/execute/status/delete commands. composable create supports --variant (PolicyType enum), --validation (JSON spec consumed by lighthouse facade per ADR-0013), --forward (program + discriminator + min-output + native-output per ADR-0009/0010). composable execute assembles remaining_accounts positionally, rejects --forward-amount for non-PayAsYouGo client-side (ADR-0010 #2). composable status wraps changeComposablePolicyStatus. composable delete wraps deleteComposablePolicy. Added composable topic to package.json.
