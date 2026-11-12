# Tributary — Security Checklist

> Risk level: **🔴 Critical** — pull payments from user token accounts via
> delegate, permissionless execution, fee splits, composable CPI (forward +
> validation), admin keys (program authority, emergency pause, upgrade
> authority).
>
> Source of truth: `src/instructions/`, `src/shared/`, `src/state/`,
> `src/policies/`.
> Status legend: ✅ satisfied · ⚠️ partial / known gap · 🟥 finding.
>
> **Audit reports:** `reports/security/` is the authoritative finding
> index. Line numbers are omitted here (they drift on every refactor); grep
> for the function/symbol name instead.
>
> Prior review waves (CF-*, M-*, S-*, H-*, C-*) are pinned as inline code
> comments and fix-notes at their fix sites plus draft beans; this file starts
> the formal indexed registry with the SZ wave — the first externally
> verified, original-source report filed for this program.

---

## Audit findings (this codebase — see `meta/security-reports/` for detail)

| ID | Severity | Finding | Status |
|---|---|---|---|
| SZ-M-1 | 🟡 Medium | `Subscription` with `auto_renew = false, max_renewals = None` never completes — `advance_policy` only checks `!*auto_renew` inside the `Some(max)` branch, so `should_complete` is `false` forever and the scheduler charges the payer every period. Contradicts the doc comment on the same function ("completes when `max_renewals` hits zero OR `auto_renew` is false") and the docs' renewal table ("pauses after next payment"). With `max_renewals = Some(n)` the same `auto_renew = false` completes correctly. Live impact (Slot Zero 2026-11-08): 7 such policies on mainnet (5 Active / 2 Paused) on the contribute.so gateway; one charged a second time on 2026-10-30; two pre-August hourly policies were charged ~1,800 times each (Slot Zero 2026-11-08 §T1) | ✅ Fixed — `advance_policy` None-branch honors `auto_renew` (bean tributary-lull) |
| SZ-M-2 | 🟡 Medium | Anyone can permanently brick a specific composable policy for ~rent (0.00065 SOL): `execute_composable` requires the deterministic intermediate ATA `ATA(policy PDA, input_mint)` to have `ata.lamports() == 0` (`IntermediateAccountAlreadyExists`), and `create_composable_policy` requires `ValidationPda::is_fresh` (lamports 0 + system-owned) on the equally deterministic `composable_validation_pre/post` PDAs. All are empty between executions, so a one-time system transfer of the rent minimum (or `CreateIdempotent` on the ATA) fails every later execution before the pull; nothing can debit the address, so the owner's only exit is delete + recreate under a new id — which the attacker can pre-fund for the same cost. Inverts the M-02 freshness fix against the attacker (Slot Zero 2026-11-08 §T2; the one live composable policy was exposed at last check) | 🟥 Open (bean tributary-cpqp) |
| SZ-M-3 | 🟡 Medium | A gateway authority can debit payers beyond the documented fee bound: `update_gateway_referral_settings` stores `referral_tiers_bps` unvalidated (validation only runs when referral is ALREADY enabled and allocation > 0), `update_gateway_feature_flags` enables referral with no tier validation at all, and `process_referral_rewards` trusts the stored tiers (`pool × tier_bps / 10000` per level, no sum cap — only `validate_referral_tiers`' `sum == 10000` invariant, which the write paths above bypass). Tiers `[65535; 3]` + a self-controlled 3-level chain debited the payer 10.933 USDC on a 10 USDC gross policy (Slot Zero 2026-11-08 §T3). Distinct from CF-012. Dormant today (no gateway has referral enabled) | 🟥 Open (bean tributary-k84k) |
| SZ-L-1 | 🟢 Low | Pre-ADR-0024 `PayAsYouGo` accounts are bricked: ADR-0024 assumed "the first 9 bytes of the old zeroed padding read as `Option::<i64>::None` plus 8 ignored zero bytes", but borsh consumes `None` as ONE byte — the new layout (`expiry_date` + `padding: [u8; 79]`) deserializes 8 bytes fewer than the old (`padding: [u8; 88]`), so every account field after `policy_type` reads 8 bytes early → seeds re-derivation fails (`ConstraintSeeds` 2006) on execute/pause/delete, and `delete_user_payment` fails `HasActivePolicies`. Live: 2 of 64 policy accounts (EY3am89p…, 7jSTNPE3…, Allowly gateway) permanently stuck, 0.017 SOL rent locked, both UserPayments uncloseable. No funds at risk; recovery needs a one-off migration instruction (Slot Zero 2026-11-08 §T4) | 🟥 Open (bean tributary-93pa) |
| SZ-L-2 | 🟢 Low | `UpTo` composables can be created but never executed: `create_composable_policy` accepts every `PolicyType` (state `validate()` has an UpTo arm), while `execute_composable` rejects `forward_amount = Some(_)` for non-PayAsYouGo and `validate_policy_execution`'s UpTo arm requires `provided_amount` — `None` always fails `InvalidAmount`. Dead configuration stored on-chain (Slot Zero 2026-11-08 §T5a) | 🟥 Open (bean tributary-zgv1) |
| SZ-L-3 | 🟢 Low | The composable path never distributes the referral pool: `skim_input_fees` carves `referral_pool` out of the gateway fee (reducing `gateway_residual`) exactly like `execute_payment`, but `process_referral_rewards` is only invoked from `execute_payment` and `transfer`. The undistributed pool stays in `intermediate_input` and is swept to the recipient with the face (1000 bps allocation on a 10 USDC face → recipient +10.02). Dormant until a gateway enables referral — same gate as SZ-M-3 (Slot Zero 2026-11-08 §T5b) | 🟥 Open (bean tributary-jfm8) |
| SZ-I-1 | ⚪ Info | SECURITY.md does not match deployment: docs claim 3-of-5 Squads + 48h timelock on all admin ops; on-chain `ProgramConfig.admin`/`fee_recipient` are a single key (ADmSd9uY…, also the riprap/accord upgrade authority) and the upgrade vault is 2-of-3 without timelock (Slot Zero 2026-11-08 §T5c, verified on-chain by the reviewer). Align docs or config | ⚠️ Notes |

---

## Verification record

Every SZ finding was re-verified against the code at `4b0a32e9` (develop,
2026-11-12) before registration:

- SZ-M-1 — `shared/schedule.rs` `advance_policy`, Subscription branch:
  `should_complete = if let Some(ref mut max) = max_renewals { … *max == 0 \|\| !*auto_renew } else { false }`.
- SZ-M-2 — `instructions/composable/execute_composable.rs`
  `require!(ata.lamports() == 0)`; `create_composable_policy.rs`
  `ValidationPda::is_fresh(&pda_info)`; `state/validation_pda.rs` `is_fresh`.
- SZ-M-3 — `instructions/gateway/update_gateway_referral_settings.rs`
  (tiers stored at `if let Some(tiers)`, validated only under
  `is_referral_enabled() && referral_allocation_bps > 0`);
  `update_gateway_feature_flags.rs` (no tier validation);
  `shared/referral.rs` `process_referral_rewards` (per-tier
  `pool × bps / 10000`, no sum cap).
- SZ-L-1 — `state/payment_policy.rs` PayAsYouGo variant (`expiry_date:
  Option<i64>` + `padding: [u8; 79]`, "total: 40+9+79 = 128" — borsh `None`
  serializes/deserializes as 1 byte, not 9); ADR-0024 §"9 bytes carved from
  padding".
- SZ-L-2 — `instructions/composable/execute_composable.rs` `face_amount`
  match (`Some(_)` → `InvalidAmount` for non-PayAsYouGo; `None` →
  `validate_policy_execution(…, None, …)`); `shared/schedule.rs` UpTo arm
  `provided_amount.ok_or(InvalidAmount)?`; `create_composable_policy.rs`
  `policy_type.validate()` accepts UpTo.
- SZ-L-3 — `process_referral_rewards` call sites: `execute_payment.rs`,
  `transfer.rs` only; `shared/fees.rs` `FeeBreakdown.referral_pool` /
  `gateway_residual`; `execute_composable.rs` `skim_input_fees`.
