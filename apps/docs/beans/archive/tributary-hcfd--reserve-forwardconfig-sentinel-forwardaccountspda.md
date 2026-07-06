---
# tributary-hcfd
title: Reserve ForwardConfig sentinel + ForwardAccountsPda seed for optional route pinning
status: scrapped
type: task
priority: low
created_at: 2026-06-27T14:43:59Z
updated_at: 2026-07-02T08:01:21Z
parent: tributary-pdj8
---

**DEFERRED per epic tributary-pdj8** (low priority; optional route pinning).

Reserves the data-layout space for the OPTIONAL forward-account lookup table from ADR-0016, so the route-pinning knob can ship later without an account migration. Does NOT implement the validation read — just reserves the field + seed. Low priority; can be deferred until the route-pinning knob is actually wanted.

**ForwardConfig** (`state/composable_policy.rs`): add a sentinel field `forward_accounts_pda: Pubkey` (`Pubkey::default()` = no table, current behaviour preserved). Recompute `ForwardConfig::SIZE`. ComposablePolicy has 32 bytes padding — verify the field fits or adjust padding. Field is reserved/unused for now: create_composable_policy should default it to `Pubkey::default()` and execute_composable should skip the (not-yet-implemented) lookup-table read when it sees the sentinel.

**constants.rs**: add `COMPOSABLE_FORWARD_ACCOUNTS_SEED: &[u8] = b"composable_forward_accounts"`.

**Optional**: stub a `ForwardAccountsPda` struct (or just a comment marking it reserved per ADR-0016) so the seed isn't dangling.

**Acceptance**: the sentinel field exists in ForwardConfig and round-trips through create/execute as disabled; the seed constant is defined; no behaviour change (the lookup table is reserved, not active). A later task can implement the `remaining_accounts[forward_start+i] == table[i]` validation read without resizing any account.

Independent — no dependencies on tasks A/B/C.

## Reasons for Scrapping

Reservation-only scope (add sentinel field + seed, no behaviour) is superseded by the full implementation in epic tributary-l9qw / child tributary-q82g. Re-evaluation during grilling (2026-07-02): the forward-account table is not optional MEV mitigation — it is the SOLE cold-relayer safety net for non-fungible-output forwards (Drift/Velocity deposits). Reserving a field without implementing the read is dead weight when the read is now committed. Replaced by: tributary-l9qw (epic) + tributary-q82g (impl).
