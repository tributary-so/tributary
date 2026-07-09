---
# tributary-3z45
title: 'L-01: emergency_pause kill-switch is non-functional; no post-init config setters'
status: todo
type: bug
priority: low
tags:
    - security
    - audit
created_at: 2026-07-09T12:05:42Z
updated_at: 2026-07-09T12:05:42Z
---

## Security Audit Finding (L-01)

**Severity:** Low
**Report:** `reports/L-01-emergency-pause-not-settable.md`
**Files:** `programs/tributary/src/state/program_config.rs:17`, `programs/tributary/src/instructions/initialize.rs:38`

### Issue

`ProgramConfig.emergency_pause` is checked by every execution path (`constraint = !config.emergency_pause`) but is written in exactly one place — `initialize` — where it is hardcoded to `false`. There is no on-chain instruction that can set it to `true`. Same gap applies to `config.fee_recipient` and `config.protocol_share_bps`: immutable after init despite being runtime-relevant. `change_program_authority` rotates only `config.admin`.

Result: the kill-switch the code clearly intends cannot be triggered through the deployed instruction surface. During a live incident the only remediation is a BPF upgrade (requires the upgrade authority, not `config.admin`) — too slow for an active-drain response.

Not a direct exploit; an incident-response / operability gap. Should be resolved before mainnet.

### Fix

Add an admin-gated config-mutation instruction (`update_program_config`) gated by `config.admin == admin.key()`, supporting:
- `emergency_pause: Option<bool>` (enable the kill-switch),
- `fee_recipient: Option<Pubkey>` (reject `Pubkey::default()`),
- `protocol_share_bps: Option<u16>` (`<= 10000`).

Emit a `ProgramConfigUpdated` event. If pause-by-admin is intentionally avoided in favour of upgrade-only pause, document that explicitly in the `ProgramConfig` struct and remove the impression of a working kill-switch.

## Acceptance Criteria

- [ ] Admin-gated config-mutation instruction added (or upgrade-only pause documented)
- [ ] `emergency_pause` can actually be toggled to `true` and halts all execution paths
- [ ] Instruction rejects non-admin signers
- [ ] Test: paused config blocks `execute_payment` / `execute_composable` / `transfer`
