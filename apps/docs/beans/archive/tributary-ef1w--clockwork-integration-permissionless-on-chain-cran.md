---
# tributary-ef1w
title: 'Clockwork integration: permissionless on-chain cranking of due subscription PaymentPolicies'
status: scrapped
type: feature
priority: normal
created_at: 2026-07-01T12:27:52Z
updated_at: 2026-07-02T12:01:58Z
---

## Goal

Integrate [clockwork-xyz/clockwork](https://github.com/clockwork-xyz/clockwork) on-chain automation so that subscription-type PaymentPolicies (the variant with a fixed `next_payment_due` timestamp) get cranked **permissionlessly and on-chain** — without requiring the gateway-operated off-chain scheduler of ADR-0014 to be running.

## Why

- Subscription policies are the **pure-timestamp-trigger** case. ADR-0014 explicitly keeps the cron spine for timestamp triggers; Clockwork replaces the *operator-run* cron with an *on-chain, rent-funded* cron thread — a competing/open scheduler in the sense of ADR-0016's open scheduler layer, applied to the ADR-0004 PaymentPolicy easy case (no validation hook, no (d) vector).
- Removes gateway uptime as a correctness dependency for the simplest, highest-volume policy type.
- One integration unblocks recurring subscriptions for any gateway that opts in, with no keeper infra to run.

## Scope (in)

- Subscription variant of **PaymentPolicy** only (fixed `next_payment_due`, `amount`, `max_renewals`/auto-renew). NOT milestone, NOT PayAsYouGo, NOT ComposablePolicy (those stay on the ADR-0014 poll loop — composable has the validation+forward hooks that need off-chain context).
- Clockwork **cron-trigger threads** firing `execute_payment` for a single policy PDA.

## Scope (out — explicit)

- ComposablePolicy cranking (validation predicate + forward routing → off-chain context required, ADR-0014/0016).
- Milestone time-based release (could be a follow-up; out for v1).
- Keeper registry / bonding (ADR-0016 rejected this; Clockwork is the alternative path).

## Open questions to resolve before coding

1. **Who creates the thread, and who funds rent?** Options: (a) owner opts in at `create_payment_policy` time via a flag + extra lamports; (b) gateway creates threads in a batch scan; (c) a separate `enable_clockwork_crank` instruction on an existing policy. (a) is cleanest if we accept the thread is owner-owned.
2. **Thread authority / fee model.** Clockwork thread pays for its own execution from a fund. Confirm the thread's fund account topology and whether `execute_payment`'s fee-payer role conflicts (the scheduler-signer cut of ADR-0018 — does the thread count as the "scheduler signer" and earn `scheduler_share_bps`? If so, where does it route?).
3. **Account resolution.** Clockwork fires a fixed instruction with a fixed account set. `execute_payment` needs: PaymentPolicy, UserPayment, PaymentGateway, ProgramConfig, user source ATA, recipient ATA, protocol/gateway/scheduler fee ATAs, token program, clock. All are deterministic from the policy PDA except the scheduler-cut ATA when the cranker self-executes. Pin the full account vector into the thread's instruction template.
4. **Cadence.** Subscription `payment_frequency` is per-policy; the thread cron must match. Build the cron expression from `payment_frequency` (we already have `getPaymentFrequency` helpers in the SDK).
5. **Lifecycle.** What happens on `delete_payment_policy`, on `max_renewals` hit, on `change_payment_policy_status` (pause)? Thread should be closed/funded-drained when the policy reaches a terminal state. Decide: on-chain hook vs. off-chain reconciliation.

## Tasks

- [ ] Research: read clockwork-xyz/clockwork README + thread/trigger program IDL. Confirm supported trigger types (cron), thread fund model, instruction template format, mainnet/devnet program IDs. Pin a version/commit.
- [ ] Decide open questions 1–5 above; write a short design note + propose an ADR (next free number) capturing the decision. Coordinate with ADR-0014 (cron spine) and ADR-0016 (open scheduler layer) — frame Clockwork as one more scheduler in that layer, not a replacement.
- [ ] SDK: helper to build the Clockwork thread-creation instruction for a subscription policy (cron expr from `payment_frequency`, pinned `execute_payment` account vector, fund amount). Lives in `packages/sdk`.
- [ ] SDK: optional convenience — bundle thread creation into the subscription creation flow (like `createSubscription` today) behind an opt-in flag.
- [ ] Program (Rust): **only if** open-question #2 demands it — if the thread earns the scheduler cut, decide routing. Prefer a zero-program-change path (thread = unpaid cranker, no scheduler cut) if feasible.
- [ ] Tests (`tests/`): a jest/Surfpool test that creates a subscription policy, spins a Clockwork thread against a local Clockwork program (or mocks the trigger by calling `execute_payment` with the thread's account vector), advances the clock, and asserts the payment fires and the thread fund decrements.
- [ ] Docs: update `apps/scheduler/README.md` and the integration guide to describe the Clockwork path as an alternative to running the off-chain scheduler. Note the trade-off (rent cost vs operator uptime).
- [ ] Write the ADR once the design is locked.

## References

- Repo: https://github.com/clockwork-xyz/clockwork
- ADR-0004: permissionless execution + standalone `transfer` (the PaymentPolicy easy case)
- ADR-0014: composable scheduler trigger model (cron spine for timestamp triggers — Clockwork is an on-chain cron spine alternative)
- ADR-0016: open scheduler layer (Clockwork = one more permissionless scheduler)
- ADR-0018: unified fee model — scheduler cut (`scheduler_share_bps`) routing must be resolved for the thread (open Q #2)
- Existing off-chain scheduler: `apps/scheduler/` (node-cron, gateway-operated)
- SDK subscription flow: `sdk.createSubscription(...)` in `packages/sdk`



## STALE CHECK (2026-07-02)

Clockwork (clockwork-xyz) shut down its mainnet operations. This integration may be dead. Recommend scrapping unless there's a fork or alternative being tracked. Decision needed from Fabian.



## REASCTIONS FOR SCRAPPING (2026-07-02)

Clockwork (clockwork-xyz) shut down mainnet operations. No active fork or alternative identified. Scrapping as stale. Reopen if a successor project emerges.
