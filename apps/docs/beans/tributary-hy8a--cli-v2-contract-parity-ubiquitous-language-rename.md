---
# tributary-hy8a
title: 'CLI v2: contract-parity + ubiquitous-language rename'
status: todo
type: epic
priority: high
created_at: 2026-06-28T19:19:01Z
updated_at: 2026-06-30T06:31:38Z
---

## Why

`apps/cli` is stuck in v1 and speaks the wrong dialect.

- **Terminology violation.** `CONTEXT.md` puts `subscription` on the _Avoid_ list (`subscription (that is one _variant_), plan, mandate`). The CLI topic is literally `subscription`, and `subscription create` only wires the **Subscription** variant of `PolicyType` — `Milestone` and `PayAsYouGo` SDK methods (`createMilestone`, `createPayAsYouGo`, `getCreateMilestonePolicyInstruction`, `getCreatePayAsYouGoPolicyInstruction`) are unreachable.
- **Composable is invisible.** None of `create_composable_policy`, `execute_composable`, `change_composable_status`, `delete_composable_policy` have a CLI surface, despite all four being in the SDK (`getCreateComposablePolicyInstruction`, `executeComposable`, `changeComposablePolicyStatus`, `deleteComposablePolicy`).
- **v1 instructions missing too.** `delete_user_payment`, `transfer`, `update_gateway_referral_settings`, `update_gateway_protocol_fee` are all in the contract + SDK but have no command. (README.md L190-217 _documents_ the last two — they were planned, never landed.)
- **README is fictional.** Describes Commander.js, a `tributary-cli` binary, hyphenated command names (`create-subscription`…), and two commands that don't exist. `oclif readme` is already wired in `prepack` — just never run.
- **Over-engineering.** Ponytail review of the current tree finds ~380-420 lines removable: 3 near-identical abstract base classes, 3 near-identical `subscription pause/resume/delete` files, 5 near-identical `pda/*` files, 3 near-identical `gateway fee-bps/fee-recipient/signer` files, 2 `referral show` files, a duplicated `program config` vs `pda config`, plus a 160-line inline `releaseRules` map and a 470-line fictional README.

## Scope (for discussion — not a task list yet)

Two intertwined tracks. Decide which is in/out before spinning child tasks.

### Track A — Rename to the ubiquitous language
- Topic `subscription` → `policy` (the PaymentPolicy family).
- `policy create` grows a `--variant subscription|milestone|pay-as-you-go` flag wiring all three `PolicyType` branches (mirrors `sdk.createSubscription` / `createMilestone` / `createPayAsYouGo` + their low-level ix-only sisters).
- `policy pause`/`resume`/`delete` collapse to one `policy status --status paused|active|deleted` (or `policy set-status`).
- `payments execute` stays (it's the verb, not the noun); consider `payment execute` singular for grammar — open question.

### Track B — Surface the rest of the contract
- `composable` topic: `create` (with `--validation <lighthouse-assertion-json|->`, `--forward <program> --input-mint … --output-mint … --min-output …`), `execute` (`--forward-ix <file|->`, `--forward-amount`), `status`, `delete`. The Lighthouse facade in `packages/sdk/src/lighthouse.ts` should be exposed so assertions can be built from a JSON spec file.
- `policy` (PaymentPolicy) gaps: `policy create --variant milestone`, `--variant pay-as-you-go`.
- `user delete` (`delete_user_payment` — needs SDK method; today tests build the ix by hand).
- `gateway referral-settings` (`update_gateway_referral_settings`), `gateway protocol-fee` (`update_gateway_protocol_fee` — admin-only).
- `transfer` (the bare `transfer` instruction + `sdk.transfer`).
- Delegate lifecycle: `delegate approve`/`revoke`/`migrate` (the UserPayment-PDA approve is currently hidden inside `createSubscription`; users who already have a UserPayment can't re-approve after a revoke).
- Optional: rich queries already in SDK (`getPaymentPoliciesByRecipient`, `…ByGateway`, `…ByUser`, `getComposablePolicy`, `getComposablePolicies…`) — do these belong in the CLI or in a separate explorer?

### Track C — Cleanup (mechanical, can land first)
- Collapse the 3 base classes → 1; collapse the duplicated command triplets via shared runners; kill `program config` (dup of `pda config`); `Buffer.alloc(64)`; `--policy` required on `execute`; `oclif readme` regenerate; extract `releaseRules` to `.releaserc` or drop.

## Open questions for the grill

1. **One binary or two?** Should composable be a separate topic (`cli composable create`) or a `--composable` flag on `policy create`? CONTEXT.md says they are _the same primitive_, different knob settings — argues for the flag. Engineering cost argues for the topic (composable create needs many more args). ADR-0015 favors the narrative merge; ADR-0014/0016 favor the operational split.
2. **Lighthouse assertion UX.** Build from a JSON spec file (CLI-friendly, scriptable) or expose the fluent facade as a sub-DSL? Spec file wins for ops; facade wins for demos.
3. **Where does the scheduler live?** The composable scheduler (`tests/scheduler-evaluator.test.ts`) is off-chain. Does the CLI expose a `trigger evaluate` runner, or is that its own service?
4. **Permissions model.** Several commands need different signers (admin vs gateway-authority vs gateway-signer vs owner vs fee-payer). Today the CLI uses one keypair for everything. Multi-key support (`--admin-keypath`, `--authority-keypath`) is documented in the fictional README — do we actually need it?
5. **In scope: emergency pause / protocol admin writes?** `update_protocol_fee`, `set emergency_pause`. Probably yes — without them the CLI can't operate a deployment.

## Non-goals (likely)

- Surfacing the legacy global `PaymentsDelegate` PDA path beyond the existing `pda delegate` lookup and the `delegate migrate` cmd above — it's deprecated, only kept for back-compat.
- A TUI / interactive mode.
- Re-implementing what `solana account`/`spl-token display` already do.

## Out of scope (definitely)

- Anything in `packages/sdk` beyond wiring its existing methods — SDK gaps (`deleteUserPayment`) get their own beans.
- Landing-page / docs-site copy.

## Reference

- Ponytail review of `apps/cli`: ~380-420 lines removable (see Track C).
- Contract instruction list: `programs/tributary/src/lib.rs` + `AGENTS.md## Instructions`.
- Terminology authority: `CONTEXT.md` (PaymentPolicy / ComposablePolicy / PolicyType / `subscription` on the Avoid list).
- Tests proving every instruction works end-to-end: `tests/tributary.test.ts` (v1, 4308 lines), `tests/composable.test.ts` (1889 lines), `tests/topup-balance{,-swap,-sol}.test.ts`, `tests/scheduler-evaluator.test.ts`.
- Related completed bean: `tributary-w2ha` (Composable: SDK + CLI Support) — landed SDK half only.

## Decisions

Resolved by **citing existing ADRs**, not re-deciding architecture. Each maps
to an epic Open Question.

1. **One binary or two (composable topic vs `--composable` flag)?** →
   **Separate `composable` topic.** **ADR-0007** makes ComposablePolicy a
   _separate account type_ with its own PDA namespace and distinct fields
   (`forward_config`, `validation_config`, `total_input`, `total_output`); a
   flag on `policy create` cannot carry that create-arg surface. **ADR-0015 is
   a positioning/narrative decision (landing-page voice), not a CLI-structure
   decision** — it does not override ADR-0007. Reflected in `tributary-bq1l`.
2. **Lighthouse assertion UX?** → **spec-file → facade.** **ADR-0013**: the
   facade owns only the Lighthouse `target_account(s)` and returns
   `{ data, numAccounts, accounts }`; the CLI consumes it from a JSON spec
   (`--validation <file|->`). CLI-idiomatic and scriptable.
3. **Where does the scheduler live?** → **off-chain service, not the CLI.**
   **ADR-0014** (cron spine + 30s poll, stateless, gateway-operated) +
   **ADR-0016** (open relay layer via the 0x08 gateway flag). The CLI ships
   `composable execute` (a single relayer fire); the loop is out of scope.
4. **Permissions / multi-key?** → **non-goal.** **ADR-0006**: the program
   stores no per-gateway fee-payer; gas sponsorship is a client/relayer concern.
   One keypair suffices; multi-key (`--admin-keypath`, …) is deferred.
5. **Emergency pause / protocol admin?** → `update_gateway_protocol_fee` IS in
   scope (`tributary-exsr`). **`set emergency_pause` is UNSURFACEABLE** —
   verified: every instruction only _reads_ `config.emergency_pause` as a guard
   and `initialize` sets it `false`; **there is no setter instruction** in
   `programs/tributary/src`. Deferred to a separate contract bean. `config show`
   exposes the flag read-only.

### Findings surfaced during decomposition

- **SDK gap:** `delete_user_payment` exists on-chain but has **no SDK method**
  (tests build the ix by hand). Created standalone prerequisite
  **`tributary-d2i0`** (SDK `deleteUserPayment`); `tributary-zllt` is blocked on
  it. (Per epic "Out of scope": SDK gaps get their own beans.)
- **SDK in-flight refactor:** `getCreateComposablePolicyInstruction` still takes
  the pre-**ADR-0016** `numValidationAccounts`. ADR-0016 beans `tributary-ru3b`
  / `tributary-3pvf` (both `todo`) will drop it and pin validation accounts at
  creation. `tributary-bq1l` is blocked-by `tributary-3pvf` so it targets the
  post-refactor signature (no throwaway work).
- **Deferred (non-goal):** rich SDK queries
  (`getPaymentPoliciesByRecipient|ByGateway|ByUser`, `getComposablePolicies…`) —
  open whether they belong in the CLI or a separate explorer. Not decomposed.

## Decomposition

- [ ] `tributary-p6n3` — CLI: Track C cleanup (collapse base classes, dedup commands, fix README) · **blocks all siblings**
- [ ] `tributary-onx8` — CLI: rename subscription→policy topic + `--variant` flag + status collapse · blocked-by `tributary-p6n3`
- [ ] `tributary-exsr` — CLI: surface v1 gaps (transfer, gateway referral-settings, protocol-fee) · blocked-by `tributary-p6n3`
- [ ] `tributary-zllt` — CLI: user delete (`delete_user_payment`) · blocked-by `tributary-p6n3` + **`tributary-d2i0`** (external SDK prereq)
- [ ] `tributary-piso` — CLI: delegate lifecycle (approve/revoke/migrate) · blocked-by `tributary-p6n3`
- [ ] `tributary-bq1l` — CLI: composable topic (create/execute/status/delete) · blocked-by `tributary-p6n3` + **`tributary-3pvf`** (ADR-0016 SDK refactor)

**External prerequisite (not a child of this epic):**

- [ ] `tributary-d2i0` — SDK: add `deleteUserPayment` method · blocks `tributary-zllt`

**Critical path:** `tributary-p6n3` (cleanup) → everything else in parallel,
except `tributary-bq1l` which also waits on `tributary-3pvf`, and
`tributary-zllt` which also waits on `tributary-d2i0`.

<!-- hordr:workflow=coordinator -->
