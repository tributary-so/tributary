# Security Model

Tributary is a **non-custodial** pull-payment protocol. Users authorize a
gateway to pull tokens from their wallet on a schedule — they never deposit,
wrap, or lock funds into the contract. Every security decision in the
program flows from that one property.

## Token delegation model

- Users call `spl-token approve <user_ata> <delegate> <amount>` once to
  grant pull authority to a delegate. Funds stay in the user's wallet.
- The modern delegate is the **per-user `UserPayment` PDA**
  (`["user_payment", owner, mint]`).
- The legacy global `PaymentsDelegate` PDA (`["payments"]`) is still
  accepted for backward compatibility with v0-approved token accounts, but
  the program writes new policies against `UserPayment`.
- Delegations are **scoped** (specific amount) and **revocable** at any
  time by the user (`spl-token revoke`, or re-approving with a smaller
  amount). The program cannot prevent revocation — it is a pure SPL token
  operation.
- No funds are ever held in escrow by Tributary itself — with the single
  exception of `PolicyType::Milestone`, where the `escrow_amount` is a
  logical counter and the actual tokens still live in the user's ATA until
  a milestone release pulls them.

### What this means for users

- The protocol **cannot** rug, freeze, or move user funds beyond what the
  policy schedule permits.
- Revoking delegation is the kill switch — it instantly stops every policy
  on that (owner, mint) pair, without on-chain admin involvement.
- The amount the delegate can pull is exactly the `delegated_amount` set by
  the user. Re-approval is required once it is consumed.

## Dual-delegate migration (v0 → v1)

| Generation | Delegate                                            | Scope                                                          |
| ---------- | --------------------------------------------------- | -------------------------------------------------------------- |
| **v0**     | `PaymentsDelegate` PDA — `["payments"]`             | Global single PDA. One delegate for every user on the program. |
| **v1**     | `UserPayment` PDA — `["user_payment", owner, mint]` | Per (owner, mint). One delegate per user per token.            |

The migration was made because the v0 global delegate was a shared blast
radius — a single key authorized pulls for every user. The v1 per-user PDA
isolates authority to the specific (owner, mint) pair, and the
`UserPayment` account is also where the policy counters live, so it had to
exist anyway.

`execute_payment` accepts **either** delegate for backward compatibility:
existing v0 token accounts continue to work, but new policies are written
against `UserPayment`, and new integrations must use it.

## Token-2022 / extension allowlist

Tributary **rejects** token accounts that carry Token-2022 extensions
(`UnsupportedTokenExtension`):

- `TransferHook` — would let the mint issuer veto pulls.
- `TransferFee` — would silently reduce the amount the recipient gets,
  breaking fee math.
- `PermanentDelegate` / `TransferHookAccount` — would let the issuer
  re-claim pulled funds.
- ConfidentialTransfer, MemoTransfer, etc. — incompatible with the
  deterministic pull model.

**Use plain SPL token mints** for user funds. If you need Token-2022
features, the program must be upgraded to support them explicitly per
extension; do not attempt to bypass the check.

## CPI security

Composable policies invoke external programs during execution (validation
via Lighthouse, forward via Meteora DLMM). Three hardening measures apply:

### 1. Target-program allowlists

Hard-coded in `programs/tributary/src/constants.rs`:

- `ALLOWED_FORWARD_PROGRAMS`: Meteora DLMM
  (`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`)
- `ALLOWED_VALIDATION_PROGRAMS`: Lighthouse
  (`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`)

A gateway cannot substitute an arbitrary program — `target_program` /
`validation_program` must be in the list (or a sentinel disabling the
hook).

### 2. Signer sanitization (C-1)

Validation and forward CPI builders **do not** forward `is_signer` from
`remaining_accounts`. This closes a privilege-pass-through vector where the
fee payer (always a `Signer`) re-passed as a remaining account could grant
Lighthouse or DLMM unintended signer authority over the CPI call.

### 3. Instruction-data pinning (`ByteRangeCheck`)

When the forward hook is enabled, the `ForwardConfig` carries up to 4
`ByteRangeCheck` entries (`offset`, `length`, `expected[8]`). At execute
time, the supplied forward instruction data must match every check. **At
least one check must start at offset 0** (`DiscriminatorCheckRequired`),
which pins the forward program's instruction selector — a gateway cannot
swap in an arbitrary instruction against the allowed program.

### 4. Intermediate ATA ownership

The transient input/output ATAs used during a composable execution are
owned by the **`ComposablePolicy` PDA**, not the `UserPayment` PDA. This
decouples the intermediate signing authority from the user's source-funds
delegate: a forward program can only move the transient intermediate
balance, never the user's wallet.

### 5. `min_output_amount` is net

`ForwardConfig.min_output_amount` is checked against the **post-fee**
output (after gateway and protocol fees are deducted). This matches DeFi
`amountOutMin` convention and prevents the gateway from extracting fee
upside by accepting a worse swap.

## Emergency pause

`ProgramConfig.emergency_pause` is a single boolean, settable by the
program admin. When `true`:

- Every `execute_payment` and `execute_composable` fails immediately with
  `ProgramPaused` — before any token movement.
- Users **can still revoke** their delegation and move their tokens via
  SPL token directly. The pause does not freeze funds — it freezes the
  program's ability to pull.

The pause is a circuit breaker, not a seizure mechanism.

## What users can do to stay safe

- **Verify policy terms before signing** the create transaction. The
  on-chain `policy_type` is authoritative — the SDK exposes its decoded
  form (`amount`, `frequency`, `max_renewals`, milestone timestamps, etc.).
- **Revoke delegation** (`spl-token revoke <ata>`) the moment you want to
  stop a policy. No on-chain admin gate.
- **Use a dedicated payment wallet.** Approve only the amount needed for
  the next billing cycle, not the lifetime cost of the subscription.
- **Monitor your policies** — the SDK exposes read helpers
  (`getPaymentPolicy`, `getUserPayment`) and event streams; subscriptions,
  gateways, and fee splits are all on-chain and queryable.
- **Verify the gateway** you are signing against. Gateway fees, referral
  configuration, and the signer key are all on the `PaymentGateway` PDA.

## What gateway operators must do

- Store the gateway signer key in a HSM / KMS. Anyone with the signer key
  can execute pulls for your users.
- Validate `min_output_amount` and slippage off-chain before submitting
  composable executions — the on-chain check is a floor, not a target.
- Use a Squads multisig for the gateway authority and (on Mainnet) for the
  program upgrade authority.
- Rotate the signer key on personnel changes via `change_gateway_signer`.

## Audit status

**Professional security audits are pending.** The code is open-source at
[github.com/tributary-so/tributary](https://github.com/tributary-so/tributary).

Findings from internal review are tracked under `reports/` and the
`## Security` section of each [Changelog](changelog.md) entry. Notable
resolved findings: H-06 (ByteRangeCheck length unbounded), M-02 (manual
ValidationPda write freshness), M-04 (inconsistent month arithmetic),
M5 (min-output-amount checked before fees), C-1 (CPI signer pass-through).

Until a third-party audit is complete, treat Tributary as beta software:
integrate on Devnet first, cap delegated amounts, and monitor actively.
