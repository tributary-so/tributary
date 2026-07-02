# Permissionless composable execution: parameter-constrained schedulers

`execute_composable` is opened to **any caller** (not only
`gateway.signer` / `owner` / `recipient`), secured by **parameter
constraints** on what the caller may influence — not by a registry of
trusted keepers. The caller is a **scheduler** — the same off-chain
poll+execute software of ADR-0014 — that broadcasts a pre-agreed
instruction, may take a tip, and cannot deviate from the policy owner's
economics. This generalises ADR-0004's permissionless-execution principle
from PaymentPolicy to ComposablePolicy and evolves ADR-0014's
gateway-operated scheduler into an **open scheduler layer**: the
gateway-operated scheduler remains one valid scheduler, no longer the
only one.

**Opt-in is per gateway, not per policy.** The gateway is the
operational unit (the scheduler operator per ADR-0014), so a new bit in
`PaymentGateway.feature_flags` (next free: `0x08`), toggled via
`update_gateway_feature_flags`, marks the gateway as an open relay. The
flag controls only **caller-identity relaxation**; the policy-level
safety preconditions are checked cross-account at `execute_composable`
time, not stored on the policy. The enforcement is **caller-conditional**:
a _trusted caller_ (`gateway.signer` / `owner` / `recipient`) is always
admitted with no preconditions — so when a gateway flips the bit,
existing non-conforming policies (`min_output_amount = None`) remain
executable by the gateway's own scheduler
(ADR-0014 status quo) and nothing breaks; a **third-party scheduler**
(any other signer) is admitted only because the gateway is
permissionless, and then the policy must satisfy the preconditions below
or the call reverts. Thus a "permissionless gateway" is precisely
"additionally admits third-party schedulers for conforming policies" —
the operator loses no capability, and gains scheduler capacity for
policies that meet the bar.

**Threat model — what "damage" means.** Four vectors a permissionless
caller could exploit: **(a) hard loss** (recipient receives less than the
policy's guaranteed economics); **(b) MEV within the floor** (a third-party scheduler
routes through an adverse-but-valid pool of the allowlisted forward
program and captures the spread up to the owner-set floor — unavoidable
on a public mempool regardless of permissions); **(c) griefing**
(reverting or early-firing; the keeper burns only its own fees); **(d)
validation gaming** (a Lighthouse assertion evaluating against state the
owner did not pin, firing or suppressing a payment spuriously).
**This ADR closes both (a) and (d)**: (a) via the mandatory-floor shield
below, (d) by pinning validation target accounts at creation (see
"Validation accounts pinned" below). It treats **(b)** as accepted
(with an optional route-locking knob for owners who want to reduce it)
and ignores **(c)**. The reason composable is categorically harder than
subscription (ADR-0004's easy case) is the validation hook — a
subscription has no (d) vector at all — and that hook is now fully
constrained for permissionless execution.

**The three shields (hard-loss closure).** Theft is rendered impossible
by the composition of three on-chain checks: **allowlist**
(`ALLOWED_FORWARD_PROGRAMS`) vets which program may receive the
intermediate; **discriminator pin** (≥1 `ByteRangeCheck` at offset 0,
ADR-0009) vets which instruction of that program; **mandatory
`min_output_amount`** verifies the result. The third is the
route-agnostic, program-agnostic core: it inspects only the verified
balance delta on `intermediate_output`, checked inside
`process_output_and_sweep` in the same transaction as the pull and the
forward. A forward program "can do anything" with the intermediate
tokens it receives as a signer — but the only path that does not revert
is "≥ floor of the output mint lands in `intermediate_output`." Atomic
revert, not refund, is the mechanism; a failed attempt never moves the
user's source funds. The floor is enforced at `execute_composable` only
on the **permissionless path**: a third-party scheduler's call against a
permissionless gateway requires `min_output_amount = Some(>0)` (the
current `Option<u64>` / `Some(0)` disable-paths are rejected for
permissionless execution). Trusted-caller execution is unchanged — a
gateway's own scheduler may still run a no-floor policy.

**Allowlist-growth vetting rule.** A program may be added to
`ALLOWED_FORWARD_PROGRAMS` if its forward is securable by **either** of two
independent safety nets:

- **(Fungible-output path — default.)** The output is fully verifiable via the
  `intermediate_output` balance delta under a `min_output_amount` floor. This
  is the route-agnostic, program-agnostic core and the only path currently
  realised (Meteora DLMM). Programs whose settlement fans out to multiple
  output accounts, or whose "output" is not a clean balance delta, cannot be
  characterised this way.
- **(Route-pinned path — additive.)** The forward's account set is fully pinned
  at creation via the `ForwardAccountsPda` table (see below), so a third-party
  scheduler cannot substitute accounts. This admits a cold relayer without a
  `min_output_amount` floor **for fungible-output programs only** — the owner
  has locked the exact route and accepted its price; the residual risk is
  owner-accepted DEX state drift, not a relayer exploit.

The cold-relayer gate is the OR of these: `min_output_amount = Some(>0)` **OR**
`forward_accounts_pda` configured. Both are sound for fungible outputs. **Non-
fungible-output programs** (settlement not a clean balance delta — e.g. a
Velocity subaccount deposit) are **not** admitted by either path alone: route
pinning is _necessary but not sufficient_ for them, because the settle phase
and forward ix-data are not yet constrained for partial-consumption forwards.
Allowlisting such a program is a separate decision (see "Non-fungible-output
forwards" below) and must not be attempted under this rule as stated.

**Forward-account lookup table (dual safety net).** The
forward program's account set (pool, route, oracles, event queues) is
today fully caller-chosen — a third-party scheduler may route through
any valid pool of the allowlisted program and capture the spread up to
the `min_output_amount` floor (vector (b), accepted). The lookup table
serves two roles depending on the forward's output class:

- **Fungible outputs (swaps) — optional MEV-within-floor mitigation.** This is
  the account-level analog of the byte-level `ByteRangeCheck` ADR-0009 already
  applies to the forward instruction data: the existing check pins _which
  instruction_ runs, this knob optionally pins _which accounts_ it runs
  against. Owners who want to lock the route configure an optional
  positional lookup table; owners who don't, rely on `min_output_amount`
  alone. With a pinned route, a cold relayer is admitted even without a floor
  — the owner locked the exact pool and accepted its price.
- **Non-fungible outputs (e.g. Velocity subaccount deposits) — necessary-but-
  not-sufficient prerequisite.** Route pinning fixes the account topology but
  does not, by itself, make such forwards settleable or fully safe (see
  "Non-fungible-output forwards" below). It is one of three prerequisites, not
  a complete safety argument.

**Non-fungible-output forwards (future; not realised by this ADR's current
code).** A forward whose settlement is not a clean `intermediate_output`
balance delta — e.g. a deposit that credits an external program's internal
subaccount — breaks two assumptions that route pinning does not fix, so it is
**not admitted** by the allowlist rule above as stated:

1. **Settle phase.** `process_output_and_sweep` sweeps only
   `intermediate_output` -> recipient. A partial-consumption forward (deposits
   a configured amount, leaves residue in `intermediate_input`) strands that
   residue. The settle phase must additionally sweep `intermediate_input`
   residue -> **user** (owner token account), so unspent input returns to the
   user. (Returning residue to the user also neutralises the "scheduler
   deposits less than pulled" attack: the user simply receives the change back
   and is never at a loss.)
2. **Forward ix-data.** `ByteRangeCheck` pins the discriminator; the deposit
   amount and other fields remain caller-supplied. Non-fungible forwards need
   additional ix-data constraints to be fully safe under a cold relayer.

Until both are implemented, non-fungible-output programs must not be added to
`ALLOWED_FORWARD_PROGRAMS`. This is tracked as deferred work (bean
tributary-l9qw is the route-pinning prerequisite).

The table is an **address-lookup-table-format array** (`[Pubkey; N]`)
stored in a Tributary-owned PDA — **not a literal on-chain Address
Lookup Table account**, because real ALTs are owned by the ALT program
under an authority model that does not map to "ComposablePolicy PDA is
the owner." Index `i` pins `remaining_accounts[forward_accounts_start +
i]` to `table[i]`. This mirrors the sentinel-disabled, externally-stored
pattern of ADR-0009's `ValidationPda`, and is **opt-in at two sentinel
layers**: (1) `ForwardConfig` carries a sentinel reference
(`Pubkey::default()` = no table, current behaviour preserved) that
toggles whether the table is consulted at all; (2) each entry's
`Pubkey::default()` marks that positional slot as a wildcard (no
constraint on `remaining_accounts` at that index). The table PDA
(`["composable_forward_accounts", composable_policy]`) is lazy-created
only when an owner configures route pinning. The sentinel reference
field is reserved in `ForwardConfig` now so that adopting the mechanism
later requires no account migration.

**Validation accounts pinned in `ValidationPda` (closes validation
gaming).** Validation target accounts are today only **count-pinned**
(`num_validation_accounts`) and supplied positionally by the caller at
execute — so a relayer can substitute a positional slot to trip a
Lighthouse assertion against the wrong state (e.g. feed a different
near-empty token account so "balance < threshold" fires a spurious
topup). The fix pins the target-account pubkeys at **creation**, stored
alongside the assertion data, and validates the caller-supplied
`remaining_accounts` against them at execute. This closes (d) for
**all** policies with validation enabled — it is a structural
improvement, not a permissionless-mode gate. The assertion _data_
(what Lighthouse checks) is untouched; only _which accounts_ it checks
against becomes owner-declared.

`ValidationPda` is promoted from a hand-parsed byte blob to a **typed
Anchor account**, deserialised via `Account<'info, ValidationPda>`
instead of the current raw-offset reads (offsets 8/10 in
`create_composable_policy.rs` and `run_validation_cpi` — the same
fragility class that produced H-04/H-06). It contains:

```
#[account]
pub struct ValidationPda {
    pub bump: u8,
    pub num_pinned_accounts: u8,        // arity ∈ {0,1,2}
    pub pinned_accounts: [Pubkey; 2],   // owner-declared Lighthouse targets
    pub data_len: u16,
    pub data: [u8; MAX_VALIDATION_DATA_SIZE],  // 1024 — assertion bytes,
                                                //   passed verbatim to Lighthouse
}
```

`num_pinned_accounts` is the assertion family's account arity — `0` for
`sysvarClock`, `1` for `tokenAccount`/`mintAccount`/`accountInfo`/
`accountData`/`stakeAccount`/`merkleTree`, `2` for `accountDelta`
(Lighthouse's two-account delta assertion). Max arity 2 sets the
`[Pubkey; 2]` capacity; the old `num_validation_accounts <= 10` loose
bound disappears. `num_validation_accounts` is **dropped from
`ValidationConfig`** entirely (pre-launch, no migration) — the arity
now lives in the pinned set, recoverable as `num_pinned_accounts`.

At execute, for `i in 0..num_pinned_accounts`:
`remaining_accounts[i].key()` must equal `pinned_accounts[i]` or the
call reverts. The pinned-set length is the boundary between the
validation slice and the forward slice of `remaining_accounts` (the
role `num_validation_accounts` used to play). The `ValidationPda`
itself is pulled **out of `remaining_accounts`** into a typed field
(`Option<Account<'info, ValidationPda>>`, `None` when validation is
disabled via the `SystemProgram` sentinel), so `remaining_accounts`
collapses to purely `[...validation_targets, ...forward_accounts]`.
Lighthouse still receives the assertion bytes verbatim and the
declared target accounts as read-only non-signers (ADR-0008's signer
sanitisation is unchanged) — only the account-selection freedom is
removed from the caller.

**Rejected: keeper registry (Path A).** A bonded/whitelisted set of
approved keepers — trusted or slashable — would ship faster and need no
account pinning. Rejected because it is a permissioned system called
permissionless: it adds a registry account, bonding, slashing, and an
exit game; it concentrates trust in an operated set; and it contradicts
ADR-0004's permissionless-execution ethos and the non-custodial thesis.
The registry's trust surface is a liability operated forever; the
parameter-constrained path pays a one-time implementation cost and owes
nothing ongoing.

**Rejected: full route pinning at creation (Sub-approach iii).** Pinning
the entire forward account set (pool, route) per-policy at creation
kills the residual MEV vector entirely but locks the policy to one route
for its lifetime — the owner must reconfigure when a pool migrates or
deprecates, and aggregator routing (dynamic pool selection) is
structurally impossible. The owner-ergonomics are brutal and the
flexibility cost is disproportionate to the residual (b) vector already
accepted. Per-account positional pinning (above) gives owners the same
knob **optionally**, without making it the default.

(bean tributary-whrl)

---

## Amendment (2026-07-02, bean tributary-zvku — Composable v2.1)

**Structural changes shipped:**

1. **InstructionConstraint replaces `target_program` + `ByteRangeCheck[]` +
   the proposed `ForwardAccountsPda`.** All three collapse into one inline
   struct on `ForwardConfig`. The separate `ForwardAccountsPda` typed
   account (scrapped) is replaced by `pinned_accounts: [Pubkey; 4]` inline
   on `InstructionConstraint`. `Pubkey::default()` entry = wildcard slot.
   M=4 covers a Meteora DLMM route (lbPair + reserveX + reserveY + 1 wildcard).

2. **Unified `ValidationSpec` (pre + post, same type).** `Disabled |
ProgramCall { program_id } | Inline { reserved }`. `pre_validation`
   replaces the old `ValidationConfig`. `post_validation` is NEW — runs
   after FORWARD, before SETTLE. `Inline` errors at create (gated on
   tributary-okhd). Two separate ValidationPda accounts: `pre` and `post`
   seeds.

3. **`min_output_amount` REMOVED.** `post_validation` generalizes it.
   Owners use a Lighthouse assertion to check output.

4. **Cold-relayer gate amended:**

   ```
   if !is_trusted_caller:
       has_post_validation = matches!(post_validation, ProgramCall { .. })
       has_route_pin = instruction_constraint.has_effective_pins()
       require!(has_post_validation || has_route_pin)
   ```

5. **Degenerate-pin guard:** `create_composable_policy` rejects
   `InstructionConstraint` with zero effective pins when forward is enabled.

6. **Gateway permissionless bit frozen at create** (bean tributary-1355):
   `FEATURE_PERMISSIONLESS` is set in `create_payment_gateway` and cannot
   be flipped via `update_gateway_feature_flags` (preserved across writes
   alongside `FEATURE_CUSTOM_PROTOCOL_FEE`).

The OR-gate is **sound for fungible outputs only**; non-fungible
(Velocity) is explicitly excluded until deferred epic tributary-2p5g.
