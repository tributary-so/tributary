# Security Policy

Tributary — automated recurring payments on Solana.

**Program ID:** `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`

---

## TL;DR

- **No privileged Tributary instruction is ever signed by a single hot key in production.**
- All admin operations (`set_admin`, `set_fee_recipient`, gateway authority ops, program
  upgrades) are wrapped in [Squads](https://squads.so) multisig proposals with an
  enforced timelock.
- Operational duties are split into three disjoint roles — **proposer**, **voter**, and
  **executor** — held by different people. No single individual can take a sensitive action
  end-to-end.
- Reporting a vulnerability? See [§Reporting](#reporting-a-vulnerability).

---

## Trust Model

```
                         ┌────────────────────────────────────────────┐
                         │           Squads Multisig (vault PDA)      │
                         │   threshold: 3-of-5      time_lock: 48h    │
                         │   config_authority: Pubkey::default()      │
                         └────────────────────┬───────────────────────┘
                                              │ is the signer/authority for
                                              ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │            Tributary Program (TRibg8W8z...)                      │
   │   ProgramConfig.admin        = Squads vault PDA                  │
   │   ProgramConfig.fee_recipient = Squads vault PDA / treasury PDA  │
   │   PaymentGateway.authority   = Squads vault PDA (per gateway)    │
   │   PaymentGateway.signer      = operational hot key (rotatable)   │
   └──────────────────────────────────────────────────────────────────┘
```

The Squads multisig is the **only** long-lived privileged key in the system. Everything
below it — gateway signer keys, executor bots, fee-recipient wallets — is either
constrained in scope or rotatable via a multisig proposal.

The BPF **upgrade authority** for the program follows the same model and is documented
separately under `tributary-y48b` (L-03).

---

## Role Separation

Tributary's operational security rests on never letting one human play all three roles in
the Squads proposal lifecycle. This is enforced by Squads membership design, not by code.

### Proposer

- **Who:** A single designated operator (on-call or automation).
- **What they do:** Drafts and submits a Squads `VaultTransaction` or
  `ConfigTransaction` containing the privileged Tributary call (e.g. a `set_admin`
  instruction). The proposal enters `ProposalStatus.Active`.
- **What they cannot do:**
  - Execute the proposal — that requires the threshold of voter approvals **and** the
    timelock to expire.
  - Approve their own proposal in a way that bypasses the threshold (Squads counts one
    signature per member; the proposer is one member).
- **Key hygiene:** Hot key, kept online for ops. Compromise here is low-impact: an
  attacker can submit malicious proposals, but they cannot get them executed without
  voters signing off.

### Voter

- **Who:** N−1 of the multisig members who are **not** the proposer and **not** the
  executor (where possible). They hold the long-term signing keys.
- **What they do:** Review pending proposals and cast `approve` / `reject` on the Squads
  `Proposal`. Once `threshold` approvals are reached, the proposal becomes
  `ProposalStatus.Approved` and the `time_lock` countdown begins.
- **What they cannot do:**
  - Unilaterally execute — they still must wait out the timelock, and execution itself is
    a separate action.
  - Forge a proposal out of thin air without the proposer (they can submit their own,
    but it's still bound by the same threshold + timelock).
- **Key hygiene:** Cold storage or hardware wallet. Used rarely, only for signing votes.

### Executor

- **Who:** Any member of the Squad (typically the proposer, but technically permissionless
  once the timelock expires).
- **What they do:** Calls `execute_transaction` on Squads once `ProposalStatus.ExecuteReady`
  is reached. This is the on-chain invocation of the wrapped Tributary instruction.
- **What they cannot do:**
  - Execute early. Squads enforces `time_lock` seconds between settlement and execution
    at the program level — no amount of signer cooperation can skip it.
  - Modify the transaction. The instruction data was fixed when the proposer created the
    `VaultTransaction`; the executor can only replay it verbatim.
- **Key hygiene:** Hot key. Compromise here is harmless _if_ the timelock window was used
  for monitoring: any malicious proposal that survived voting can still be caught and the
  Squad's `stale_transaction_index` bumped via a counter-proposal.

### Why this split improves operational security

| Threat                                | Without role separation          | With proposer / voter / executor split                        |
| ------------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Compromised operator key              | Attacker changes admin instantly | Attacker can only **propose**; voters must approve + timelock |
| Insider collusion (single bad signer) | One key = full control           | Need ≥ threshold colluding members to reach approval          |
| Fat-finger admin change               | Permanent lockout or worse       | Other voters reject; proposer cancels or resubmits            |
| Rushed / coerced admin change         | Hard to stop once submitted      | 48h timelock gives time to raise alarms, rotate keys          |
| Audit trail gaps                      | "Someone changed the admin"      | Three distinct on-chain signatures + proposal metadata        |
| Social-engineering of any single role | Game over                        | Contained: each role is necessary but not sufficient          |

The pattern is the operational analogue of **dual control + split knowledge** from
traditional key management: knowing the proposal (proposer), authorising it (voter), and
triggering it (executor) are deliberately kept in different hands.

---

## Mandated Squads Configuration

These are the production settings. Devnet/testnet may relax them.

| Parameter           | Production value      | Rationale                                                   |
| ------------------- | --------------------- | ----------------------------------------------------------- |
| `threshold`         | ≥ 3                   | No 1- or 2-of-N squads for prod admin                       |
| `members.len()`     | ≥ 5                   | Survives two key losses without halting governance          |
| `time_lock`         | ≥ `172800` (48 hours) | Window for monitoring + emergency response                  |
| `config_authority`  | `Pubkey::default()`   | Autonomous Squad — no off-chain key can reconfigure it solo |
| Member key custody  | Mixed hardware + hot  | Voters on hardware, proposer/executor may be hot            |
| Membership rotation | ≤ 90 days             | Documented in the ops runbook; Squads `ConfigTransaction`   |

Changing any of the above is itself a `ConfigTransaction` on the Squad and must pass
through the same role-separated flow.

---

## Privileged Instructions Reference

Every Tributary instruction below **must** be invoked via a Squads proposal in production.
Any direct invocation by a non-multisig signer is an incident.

### Program-level (ProgramConfig)

| Instruction                   | Auth         | Risk if misused                   |
| ----------------------------- | ------------ | --------------------------------- |
| `set_admin`                   | `admin`      | Full protocol takeover            |
| `set_fee_recipient`           | `admin`      | Redirect all protocol fee revenue |
| `update_gateway_protocol_fee` | `admin`      | Set custom fee up to 10,000 bps   |
| `emergency_pause` (via flags) | `admin`      | Halt the entire program           |
| Program BPF upgrade           | upgrade auth | Replace program logic             |

### Gateway-level (PaymentGateway)

| Instruction                        | Auth        | Risk if misused                             |
| ---------------------------------- | ----------- | ------------------------------------------- |
| `change_gateway_fee_bps`           | `authority` | Up to 100% fee confiscation                 |
| `change_gateway_fee_recipient`     | `authority` | Redirect gateway fees                       |
| `change_gateway_signer`            | `authority` | Hand payment-execution power to an attacker |
| `update_gateway_feature_flags`     | `authority` | Toggle referral / net-amount / fee math     |
| `update_gateway_referral_settings` | `authority` | Redirect referral payouts                   |
| `delete_payment_gateway`           | `authority` | Tear down a gateway                         |
| `transfer`                         | `admin`     | Unbounded withdrawal (see L-02, scrapped)   |

The gateway `signer` (the key authorised to call `execute_payment`) is **not** itself
privileged in the governance sense — it cannot change configuration, only trigger
already-authorised payments. It's kept as a hot operational key and rotated via the
multisig-gated `change_gateway_signer`.

---

## Incident Response

1. **Detection:** monitoring alerts on any Squads `VaultTransaction` involving the
   instructions listed above, or any direct (non-multisig) signature on them.
2. **Containment (during timelock):** voters reject the proposal, or a counter-proposal
   bumps `stale_transaction_index` on the Squad to invalidate pending txs.
3. **Containment (post-execution):** if a malicious admin was set, the **new** admin must
   be re-rotated via a fresh proposal. The timelock ensures we always have a window to
   react before execution, so this case should not occur in practice.
4. **Key compromise:** rotate the affected Squads member key via `ConfigTransaction`
   (ReplaceMember). If the multisig itself is suspect, rotate the entire Squad and re-point
   `ProgramConfig.admin` via `set_admin` from the new Squad.
5. **Program-level halt:** if all else fails, set `emergency_pause = true` via the
   multisig to stop `execute_payment` across all gateways.

---

## Reporting a Vulnerability

- **Do not** open a public issue.
- Email **security@chainsquad.com** with a description, reproduction steps, and impact
  assessment.
- We acknowledge within 48 hours and aim for a fix-or-mitigate decision within 7 days.
- Valid critical/high reports may be eligible for a reward at our discretion.

---

## See Also

- `reports/C-04-no-admin-key-rotation.md` — the finding that motivated this policy.
- `reports/` (full audit findings list).
- Scrapped `tributary-yqnw` (H-04) — the same Squads-first analysis applied to all
  gateway-level admin operations.
- `tributary-y48b` (L-03) — upgrade-authority management (separate but parallel concern).
- [Squads Protocol documentation](https://docs.squads.so/).
