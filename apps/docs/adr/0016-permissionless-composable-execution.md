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
`ALLOWED_FORWARD_PROGRAMS` if its forward is securable by **any** of three
independent safety nets:

- **(Fungible-output path — default.)** The output is fully verifiable via the
  `intermediate_output` balance delta under a `min_output_amount` floor. This
  is the route-agnostic, program-agnostic core and the only path currently
  realised (Meteora DLMM). Programs whose settlement fans out to multiple
  output accounts, or whose "output" is not a clean balance delta, cannot be
  characterised this way.
- **(Route-pinned path — additive.)** The forward's account set is fully pinned
  at creation via the `InstructionConstraint.pinned_accounts` table (see
  below), so a third-party scheduler cannot substitute accounts. This admits a
  cold relayer without a `min_output_amount` floor **for fungible-output
  programs only** — the owner has locked the exact route and accepted its
  price; the residual risk is owner-accepted DEX state drift, not a relayer
  exploit.
- **(Act-mode path — additive, ADR-0026.)** The forward settles in **act
  mode** (`output_mint == Pubkey::default()` per ADR-0026): no output ATA, no
  deliver sweep, no `>0` output guard. Tributary's invariant is "no more than
  `face` leaves `intermediate_input`, any residue returns to the user"
  (ADR-0026's `sweep_input_residual_to_user` + the balance bound on the
  intermediate ATA, which the ComposablePolicy PDA owns per ADR-0008). The
  owner's `post_validation` (`ValidationSpec::ProgramCall { .. }`) is the
  sole assertion that the forward did what the owner intended. **Act-mode
  admission requires `post_validation` configured** — a create-time reject
  bakes the requirement in directly, so for act mode `has_route_pin` alone
  does not satisfy the cold-relayer gate.

The cold-relayer gate (as amended by the v2.1 Amendment below) is the OR of
`has_post_validation` and `has_route_pin`. Both fungible paths are sound; act
mode additionally **requires** `post_validation` (rejected at create
otherwise — the owner's post-forward assertion is the only floor on act-mode
delivery, ADR-0026). Programs whose settlement safety is a composite over
multiple on-chain fields (the "Drift class" — see "Non-fungible-output
forwards" below) remain unsecurable by any of the three paths and must not be
allowlisted.

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
- **Non-fungible outputs (act-mode forwards) — `post_validation` is the
  floor.** Route pinning fixes the account topology; ADR-0026's act mode +
  residue→user sweep fix the settlement. The owner's `post_validation`
  assertion is the remaining floor on delivery quality (see
  "Non-fungible-output forwards" below). For programs whose safety state is
  not a single Lighthouse-readable field (the Drift class), no floor exists —
  those remain unadmitted.

**Non-fungible-output forwards (act mode, realised by ADR-0026).** A forward
whose settlement is not a clean `intermediate_output` balance delta — e.g. a
deposit that credits an external program's internal subaccount — is admitted
via the **act-mode path** above. Two assumptions that route pinning alone does
not fix were resolved by ADR-0026 and the 2026-07-06 grilling (bean
tributary-2p5g):

1. **Settle phase — RESOLVED by ADR-0026.** `sweep_input_residual_to_user`
   (`execute_composable.rs:534`) sweeps `intermediate_input` residue -> **user**
   (owner token account) in addition to the deliver sweep. A
   partial-consumption forward (deposits a configured amount, leaves residue)
   returns the unspent input to the user. This neutralises the "scheduler
   deposits less than pulled" attack: the user receives the change back and is
   never at a loss. Fees are skimmed input-side on the gross pull (Phase 1b,
   `execute_composable.rs:1198`) before the forward runs; the residue is
   returned principal, non-refundable-as-fees-go.
2. **Forward ix-data amount pinning — DROPPED (toothless post-0026).**
   `ByteRangeCheck` pins the discriminator; the deposit amount in the forward
   ix data is caller-supplied and intentionally **not** pinned by Tributary.
   NET-on-pull hardcoding means `intermediate_input` holds exactly `face`
   post-skim; the intermediate ATA is owned by the ComposablePolicy PDA
   (ADR-0008), so SPL token balance semantics bound the forward CPI to at most
   `face`; any under-consumption is swept -> user. The amount-confusion attack
   is fully neutralised by the (balance bound + residue→user + NET-on-pull)
   triad. Amount-byte pinning is a forward-program-specific, client-side
   concern — not Tributary's invariant. Tributary enforces the balance bound;
   the client builds a correct ix for the target program.

**What act mode is for.** Act mode serves forwards whose settlement is a
verifiable state change in a single on-chain account field readable by
Lighthouse: stake deposits (`stakeAccount`), token burns / deflationary
mechanisms (`mintAccount` supply field), NFT mint to target (`accountInfo`
existence), LP position creation (`accountInfo` on a new position account),
single-field collateral deposits where the balance is a clean u64 in a known
struct slot.

**Lighthouse limitations (the Q4 boundary).**

- **Brittle byte-offset assertions.** Lighthouse reads at a fixed byte offset;
  a forward-program upgrade can shift the struct layout. This is
  safe-by-failure: a shifted offset reads garbage -> the assertion fails -> the
  deposit is vetoed -> the owner reconfigures. There is no principal-loss
  path; only a liveness regression until the owner updates the assertion.
- **The Drift class — excluded.** Programs whose safety state is off-chain-
  derived from multiple on-chain fields (collateral, deposits, PnL, oracle
  prices, etc.) have no single account field a Lighthouse assertion can assert
  against. "Subaccount data changed" is too weak to be a meaningful floor.
  Drift / Velocity perp-subaccount leverage is the motivating anti-example:
  evaluated and **rejected** on these grounds. Such programs are not servable
  by act mode and must not be allowlisted.
- **Principal safety vs. quality-of-service.** Tributary's invariant
  (residue→user + balance bound) holds regardless of `post_validation`; the
  owner's assertion in act mode is **quality-of-service**, not principal
  safety. The floor is the owner's assurance the forward did the intended
  work; a missing or wrong assertion can grief delivery quality but cannot
  lose principal.

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
    pub data: [u8; MAX_VALIDATION_DATA_SIZE],  // 512 — assertion bytes,
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
   account (scrapped) is replaced by `pinned_accounts: [Pubkey; 2]` inline
   on `InstructionConstraint`. `Pubkey::default()` entry = wildcard slot.
   M=2 (reduced from 4, 2026-07-12, bean tributary-u8n4) — the canonical
   Meteora DLMM swap pins only the lbPair (`tests/topup-balance-swap.test.ts`,
   `numPinnedAccounts: 1`); capacity 2 covers it with headroom for a second pin.

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

The OR-gate is **sound for fungible outputs and for act-mode forwards with
`post_validation` configured** (ADR-0026). Programs in the Drift class
(off-chain-derived composite state) remain excluded — see "Non-fungible-output
forwards" above.

---

## Amendment (2026-07-06, bean tributary-2p5g — act-mode admission rule)

ADR-0026 shipped the act-mode settlement mechanism (residue→user sweep,
input-side fee skim, NET-on-pull hardcoding, the three settlement shapes).
This amendment records the allowlist-rule consequence and the scope decisions
from the 2026-07-06 grilling. No code changes — the mechanism shipped under
ADR-0026; this is the admission-rule + boundary-documentation follow-up.

**Decisions:**

- **Q1 — rescope.** The settle-phase residue→user sweep and the gross-pull /
  NET-on-pull fee model are DONE by ADR-0026 (code-confirmed:
  `sweep_input_residual_to_user` at `execute_composable.rs:534`, `is_act` at
  line 779, Phase 1b skim at line 1198). The original "non-fungible blocked"
  framing is stale.
- **Q2 — ix-data amount pinning dropped.** The amount field in the forward ix
  data is toothless post-0026: NET-on-pull + balance bound + residue→user
  neutralise amount confusion without pinning ix bytes. Amount-byte pinning is
  a forward-program-specific, client-side concern — not Tributary's invariant.
- **Q3 — act-mode admission path added** (the third bullet in the allowlist
  rule above). Act mode requires `post_validation` configured; the create-time
  reject bakes this in, so `has_route_pin` alone is insufficient for act mode
  and the cold-relayer OR-gate ambiguity is resolved.
- **Q4 — Lighthouse-only validation; Drift rejected.** `ALLOWED_VALIDATION_PROGRAMS`
  stays Lighthouse-only (attack-surface discipline). Drift perp-subaccount
  leverage is off-chain-derived from multiple on-chain fields — no single
  Lighthouse-readable floor exists. The motivating example is the
  anti-example. Velocity is NOT added to `ALLOWED_FORWARD_PROGRAMS`.
- **Q5 — convergence.** Documentation-only deliverable; no code changes. The
  bean was demoted epic → feature (single ADR amendment, no child tree).

**What act mode is for (post-grilling):** NOT Drift. Act mode serves forwards
whose settlement is a verifiable state change in a single on-chain account
field readable by Lighthouse — stake deposits, token burns, NFT mints, LP
position creation, single-field collateral deposits. The Drift class
(composite / off-chain-derived state) is explicitly excluded and documented in
the body above.

(bean tributary-2p5g)
