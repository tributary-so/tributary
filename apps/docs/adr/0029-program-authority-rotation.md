# Program authority rotation — `change_program_authority`

Adds a top-level `change_program_authority` instruction that rotates
`ProgramConfig.admin`. The current admin must sign; the new admin is
recorded as a regular `Pubkey` (no signer requirement at rotate time —
taking possession is a separate concern, see "Rejected alternatives").
`fee_recipient` is intentionally left untouched.

This closes the M-02 audit finding: previously `admin` was set at
`initialize` and immutable, so a lost or compromised admin key
permanently locked protocol fees, the emergency-pause flag, and
gateway deletion.

## Decision

### Instruction shape

```rust
ChangeProgramAuthority {
    #[account(mut)] admin: Signer<'info>,            // current admin
    pub new_admin: UncheckedAccount<'info>,          // non-default check only
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,
}
```

- `admin` signer + `config.admin == admin.key()` constraint — same
  auth pattern as `update_gateway_protocol_fee`.
- `new_admin` only checked against `Pubkey::default()` (reuses the
  `InvalidAmount` sentinel used elsewhere for "pubkey must be set").
  No signer requirement on `new_admin`: a rotation is a future-state
  change; the new key only matters on the next admin-gated call, at
  which point it must sign.
- Emits `ProgramAuthorityChanged { old_admin, new_admin }` so
  indexers can flag the rotation. No separate "two-step accept" event.

### `fee_recipient` not rotated

`fee_recipient` is a separate field, used by every payment execution
to route protocol fees. Rotating the admin must not silently redirect
fee flow — those are independent operational concerns. If the new
admin wants a different fee recipient, that is a follow-up change
under its own auth path (which now exists, because the new admin can
admin-gate it).

### No timelock / multisig at the program level

The instruction is a single-signer, immediate-effect rotation. Timelock
and multisig are **operational** concerns: the deployer is expected to
put a multisig / Squads / timelocked wallet behind `admin` at deploy
time. Encoding a timelock on-chain would lock the protocol to one
specific timelock implementation and is the wrong layer.

The ADR records this explicitly so future "why isn't there a delay?"
questions have a documented answer.

### Top-level instruction, not in a domain subdir

Like `initialize`, this is a singleton that doesn't belong to gateway
/ payment / user / referral / composable. It sits in
`instructions/change_program_authority.rs` next to `initialize.rs`.

## Rejected alternatives

1. **Two-step rotation (propose + accept)** — Solidity-style
   `proposeNewAdmin` + `acceptAdmin`. More secure against typos, but
   adds a second pending-admin field to `ProgramConfig` (eating into
   the padding reserve) and a second instruction, for a rotation that
   should happen extremely rarely. The typo risk is mitigated by the
   `ProgramAuthorityChanged` event — indexers and the rotating admin
   see the new key immediately and can rotate again if wrong. KISS.

2. **On-chain timelock** — delay rotation by N slots before effect.
   Wrong layer: locks the protocol to one timelock design, and any
   timelock short enough to be useful for emergency rotation is short
   enough to be theatre. Operational timelocks (Squads, Overture, a
   custom SPL-governed wallet) are external and already supported
   because `admin` is just a `Pubkey`.

3. **Multisig baked in** — same layering problem. The program accepts
   any `Pubkey` as admin; making that key a 2/3 Squads vault is a
   deploy-time choice, not a program-level concern.

4. **Rotate `fee_recipient` atomically** — tempting (new admin
   probably wants fees sent somewhere new), but couples two distinct
   operational changes. A key rotation under duress (compromised
   admin) should NOT also redirect fee flow — that's a separate
   decision the new admin makes on its own schedule.
