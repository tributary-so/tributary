---
# tributary-hgp7
title: 'NATIVE_OUTPUT forward flag: WSOL→native-SOL topup via validated closeAccount sweep'
status: completed
type: feature
priority: high
created_at: 2026-06-24T09:25:00Z
updated_at: 2026-06-24T12:30:30Z
---

Single composable policy: USDC→WSOL via DLMM, then unwrap WSOL to native SOL for the recipient via a validated closeAccount sweep (recipient pinned on-chain — no drain vector). Opt-in via ForwardConfig.forward_flags bit 0. Replaces the rejected generic wrap/unwrap forward (which would reintroduce the closeAccount destination drain). Full implementation spec is in the body — handoff-ready for another agent.

# NATIVE_OUTPUT forward flag — WSOL→native-SOL topup via validated closeAccount sweep

## Goal

A single composable policy that swaps **USDC → WSOL via Meteora DLMM**, then
**unwraps the WSOL to native SOL** for the recipient — atomically, in one
`executeComposable` call, with **no drain vector** (recipient pinned on-chain).

This replaces the rejected alternative of allowlisting the Token/wrap program
as a forward, which would let the gateway redirect `closeAccount`'s
`destination` to itself (the exact drain `Token Program` was removed from the
allowlist for — see `reports/C-1-validation-cpi-signer-leak.md`).

## Background — why a generic wrap/unwrap forward is a non-starter

- Wrap SOL→WSOL = `SystemProgram.transfer` + `TokenProgram.syncNative`
- Unwrap WSOL→SOL = `TokenProgram.closeAccount(wsolAta, destination, owner)`
  `build_forward_account_metas` validates **no** forwarded account identity
  (only the ComposablePolicy PDA becomes signer; writability is forwarded
  verbatim). So a `closeAccount` forward = gateway sets `destination` = itself →
  steals the WSOL. Validation (Lighthouse) is read-only and cannot move funds.
  Therefore the unwrap **must** be a Tributary-controlled sweep whose
  destination is constrained to `composable_policy.recipient`.

## Design overview

Reuse the live DLMM forward (unchanged). Add a forward flag that switches the
POST-swap sweep from `transfer_checked` (WSOL → recipient ATA) to
`closeAccount` (WSOL intermediate → recipient wallet), converting the WSOL
value to native SOL. The `closeAccount` is signed by the ComposablePolicy PDA
(owner of the intermediate) via `invoke_signed`.

```
swap : intermediate_USDC --DLMM swap--> intermediate_WSOL        (unchanged)
fees : transfer_checked WSOL -> gateway/protocol fee ATAs        (unchanged, WSOL)
sweep: closeAccount(intermediate_WSOL -> recipient wallet)       (NEW when flag set)
       recipient validated == composable_policy.recipient        (existing constraint)
```

`closeAccount` ships the remaining WSOL value **as native SOL** to the
recipient. Fees stay in WSOL (taken before the close).

## The flag

`ForwardConfig.forward_flags: u8` is currently unused. Use **bit 0**:

- `constants.rs`: `pub const FORWARD_FLAG_NATIVE_OUTPUT: u8 = 1;`
- helper: `impl ForwardConfig { pub fn is_native_output(&self) -> bool { self.forward_flags & FORWARD_FLAG_NATIVE_OUTPUT != 0 } }`
- create-time guard (in `validate_forward_config` or `create_composable_policy::handler`): **if `is_native_output()` then `output_mint == NATIVE_MINT` is required** (else error). `NATIVE_MINT` import from `anchor_spl`.

Must be **opt-in**: auto-unwrapping whenever `output_mint == WSOL` would break
the existing "hold WSOL in the recipient ATA" case (the swap test lands WSOL
in `recipientTokenAccount`).

## Program changes (file by file)

### `programs/tributary/src/constants.rs`

- Add `pub const FORWARD_FLAG_NATIVE_OUTPUT: u8 = 1;`

### `programs/tributary/src/state/composable_policy.rs`

- Add `impl ForwardConfig { pub fn is_native_output(&self) -> bool {...} }`

### `programs/tributary/src/instructions/composable/create_composable_policy.rs`

- In `validate_forward_config` (or handler): if `is_native_output()`,
  `require!(forward_config.output_mint == NATIVE_MINT, <error>)`.
- Reuse an existing error or add `NativeOutputRequiresWsol`.

### `programs/tributary/src/instructions/composable/execute_composable.rs` ← bulk of the work

1. **`process_output_and_sweep`**: add a `native_output: bool` parameter.
   The existing recipient sweep block:

   ```rust
   if sweep_amount > 0 {
       let cpi_accounts = TransferChecked { from: intermediate_output, mint: output_mint, to: recipient_token_account, authority: intermediate_owner_info };
       ...transfer_checked(sweep_amount)...
   }
   ```

   becomes, when `native_output`:

   ```rust
   // Unwrap WSOL -> native SOL: close the WSOL intermediate to the recipient
   // wallet. closeAccount sends all remaining lamports (= sweep_amount WSOL
   // value + rent) as SOL. Authority = ComposablePolicy PDA (owns the
   // intermediate). Reuse the existing `close_token_account` helper.
   close_token_account(intermediate_output, recipient_token_account,
                       intermediate_owner_info, token_program,
                       <composable_policy signer_seeds>)?;
   ```

   Fees (gateway/protocol `transfer_checked` to WSOL fee ATAs) stay **before**
   this and unchanged. `sweep_amount` returned for accounting = the WSOL value
   unwrapped (rent is a side-effect bonus to the recipient).

   - `min_output_amount` check (`sweep_amount >= min_output`) is unchanged and
     still meaningful.

2. **`ExecuteComposable` accounts struct — `recipient_token_account`** ← the trickiest part
   Currently `Box<InterfaceAccount<'info, TokenAccount>>` with Anchor constraints
   (`mint == output_mint`, `owner == recipient`). Anchor constraints can't be
   conditional, and in native mode the recipient destination is the recipient's
   **system wallet** (not a token account), so deserialization would fail.
   Change to:

   ```rust
   /// CHECK: Validated in the handler. In normal mode this is the recipient's
   /// output-mint ATA (mint+owner checked); in NATIVE_OUTPUT mode it is the
   /// recipient's system wallet (key checked == composable_policy.recipient).
   #[account(mut)]
   pub recipient_token_account: UncheckedAccount<'info>,
   ```

   and move validation into the handler:

   ```rust
   if composable_policy.forward_config.is_native_output() {
       require!(ctx.accounts.recipient_token_account.key()
                == composable_policy.recipient, TributaryError::Unauthorized);
   } else {
       // replicate the two removed constraints by deserializing manually:
       let rta = InterfaceAccount::<TokenAccount>::try_deserialize(
           &ctx.accounts.recipient_token_account.to_account_info())?;
       require!(rta.mint == composable_policy.forward_config.output_mint,
                TributaryError::TokenMintMismatch);
       require!(rta.owner == composable_policy.recipient,
                TributaryError::Unauthorized);
   }
   ```

   (Fee accounts `gateway_fee_account` / `protocol_fee_account` stay
   `InterfaceAccount<TokenAccount>` — fees are still WSOL, so their existing
   `mint == output_mint == NATIVE_MINT` checks still pass. No change.)

3. **Step 10 — "verify intermediates empty"**: in native mode the WSOL
   intermediate is **already closed** by the sweep (`closeAccount` zeroes it),
   so `read_token_amount` on it would fail (`data.len() < 72`). Guard:

   ```rust
   if !native_output {
       let output_check = read_token_amount(intermediate_output)?;
       require!(output_check == 0, TributaryError::InsufficientBalance);
   }
   ```

   (The USDC input intermediate check stays — the swap consumed all input.)

4. **Step 12 — close intermediates**: in native mode the output intermediate is
   already closed; skip its close (the existing `close_input_ata.key() !=
intermediate_output.key()` guard is NOT enough since they are different
   accounts). Add: `if !native_output { close output intermediate }`.

5. Thread `native_output` (= `forward_config.is_native_output()`) into the
   `process_output_and_sweep(...)` call.

### Signer / authority note

`close_token_account` already exists in this file and signs with the seeds
passed in. For the native sweep, pass the **ComposablePolicy PDA** seeds
(`intermediate_owner_seeds`), same as the fee/sweep CPIs. The ComposablePolicy
PDA owns the intermediate WSOL ATA, so it is the legitimate `closeAccount`
authority. No new authority surface.

## Test plan — `tests/topup-balance-sol.test.ts`

Mirror `tests/topup-balance-swap.test.ts` (copy it as the starting point). The
DLMM forward (swap ix, monkeypatch, hostFeeIn fix, all-writable forward
accounts, run_forward_cpi) is **identical** — `NATIVE_OUTPUT` only changes the
post-swap sweep (program-side). Changes vs the swap test:

- `forwardConfig.forwardFlags = 1` (NATIVE_OUTPUT bit).
- `outputMint = NATIVE_MINT` (same as swap test).
- Recipient: pass `hotWallet.publicKey` as `recipientTokenAccount` (the native
  destination). hotWallet does **not** need a WSOL ATA for the sweep (it gets
  SOL). Fund hotWallet with some native SOL up front (e.g. via
  `surfpool.setAccount({ lamports })`).
- Fee accounts stay WSOL ATAs (feeRecipient WSOL, admin WSOL) — keep them.
- Assertions:
  - `coldWallet` USDC ↓ by the input amount.
  - `hotWallet` **native SOL** (`connection.getBalance`) ↑ by `~sweep_amount`
    (closeAccount also ships rent — assert `>= sweep_amount`, or
    `== sweep_amount + <rent>` if you want exact; simplest: `>= sweep_amount`).
  - `admin` WSOL (protocol fee) ↑; `feeRecipient` WSOL unchanged (0 bps).
  - The WSOL **intermediate is closed** (`getAccountInfo == null` or zeroed).
  - `policy.totalOutput == sweep_amount`, `paymentCount == 1`.
- Failure case: PayAsYouGo period cap (same as swap test — deterministic,
  independent of SOL price).

### Validation (Lighthouse) choice — OPEN DECISION

Native SOL has no token account, so `AssertTokenAccount` (discriminator 9,
amount at offset 64) can't assert on the recipient's SOL balance directly.
Pick one for the test:

- (a) Assert on the recipient's **WSOL ATA** amount (give hotWallet a WSOL ATA
  with a small balance, assert < threshold) — reuses the existing Lighthouse
  builder; the ATA is just a sensor, unrelated to the SOL sweep.
- (b) Investigate Lighthouse's generic account/lamport assertion (system
  account lamports at offset 0) — more "correct" but needs a different
  assertion builder.
- (c) Validate on the input side (coldWallet USDC balance) or pass
  `SystemProgram` as validation_program (no validation).
  Recommend **(a)** for the first cut (smallest change), note (b) as a follow-up.

## Build / deploy / run cycle

1. `cargo check --manifest-path programs/tributary/Cargo.toml`
2. `cargo test --manifest-path programs/tributary/Cargo.toml` (unit tests still pass)
3. `cargo fmt --manifest-path programs/tributary/Cargo.toml -- --check`
4. `anchor build` → new `target/deploy/tributary.so`
5. `tsc --noEmit -p tsconfig.json` (new test clean)
6. **Fresh surfpool per run** (it wedges after a hung/killed run; restart clears):
   ```
   pkill -9 -f 'surfpool start'   # this cmd times out on FD cleanup but works
   # verify down: curl getHealth → DOWN
   setsid bash -c 'surfpool start --legacy-anchor-compatibility --no-tui \
     > /tmp/surfpool.log 2>&1' </dev/null >/dev/null 2>&1 & disown
   # wait for: getHealth ok + log has "Runbook 'deployment' execution completed"
   ```
   surfpool's `deployment` runbook auto-deploys `target/deploy/tributary.so`.
7. Add to `Anchor.toml [scripts]`:
   `test-topup-sol = "npx jest ./tests/topup-balance-sol.test.ts --preset ts-jest"`
8. Run:
   ```
   ANCHOR_PROVIDER_URL=http://localhost:8899 \
   ANCHOR_WALLET=~/.config/solana/id.json anchor run test-topup-sol
   ```

## Surfpool / SDK gotchas (carry over from the swap test)

- surfpool returns `Method not found` for `getMultipleAccountsInfo` → the test
  **must** monkeypatch `connection.getMultipleAccountsInfo` → fan out to
  `getAccountInfo` (see `topup-balance-swap.test.ts`). `DLMM.create` and
  `getBinArrayForSwap` depend on it.
- `@meteora-ag/dlmm@1.9.10` API: default export `DLMM`,
  `DLMM.create(conn, pool, { cluster, skipSolWrappingOperation: true })`,
  `getBinArrayForSwap(swapForY)`, `swapQuote(...)`, `pool.swap(...)`.
- `pool.swap()` CU-estimation sim fails on the PDA user and falls back to 1.4M
  CU (benign logged error). Extract the swap ix, rewrite `hostFeeIn`
  (SystemProgram → `METEORA_DLMM_PUBKEY`).
- `jest.setTimeout(120_000)` at the top.

## Risks / things to watch

1. **`recipient_token_account` conditional validation** is the main design
   hurdle — Anchor constraints are static, so it becomes an `UncheckedAccount`
   with handler-side manual `TokenAccount::try_deserialize` + checks in normal
   mode. Don't weaken the normal-mode checks.
2. **`closeAccount` ships value + rent** → recipient gets `sweep_amount + rent`
   SOL. Account for rent in the test assertion and in `total_output`
   accounting (recommend `total_output = sweep_amount`, rent = side-effect).
3. **Native-mode guards on Step 10 + Step 12** for the output intermediate
   (already closed by the sweep) — easy to miss; without them the execute
   fails after the unwrap.
4. `closeAccount` authority = ComposablePolicy PDA (owns the intermediate) —
   confirm `close_token_account` is called with the ComposablePolicy seeds,
   not the UserPayment seeds.
5. NATIVE_OUTPUT requires `output_mint == NATIVE_MINT` at create time.
6. CU: `closeAccount` is cheap; no budget concern expected.

## Open decisions (confirm before/while implementing)

1. Validation approach in the test — recommend (a) WSOL-ATA sensor.
2. `total_output` accounting — recommend `sweep_amount` (exclude rent).
3. Error variant for "NATIVE_OUTPUT requires WSOL" — reuse vs new
   (`NativeOutputRequiresWsol`).

## Acceptance criteria

- [x] Program: `FORWARD_FLAG_NATIVE_OUTPUT` + `is_native_output()` helper
- [x] Create-time guard: NATIVE_OUTPUT ⟹ output_mint == NATIVE_MINT
- [x] `process_output_and_sweep` native branch (closeAccount → recipient)
- [x] `recipient_token_account` UncheckedAccount + handler validation
- [x] Step 10 + Step 12 native-mode guards
- [x] `cargo test` 60/60 pass (57 + 3 new for the create-time guard); `cargo fmt --check` clean; no new clippy warnings
- [x] `tests/topup-balance-sol.test.ts` 5/5 pass on surfpool; recipient native SOL ↑; WSOL intermediate closed
- [x] `Anchor.toml` `test-topup-sol` script
- [x] Follow-up report: `reports/native-output-sweep.md`

## Reference files (current state on `feature/composability`)

- `programs/tributary/src/instructions/composable/execute_composable.rs`
  (`process_output_and_sweep` ~L319, `close_token_account` ~L100,
  `ExecuteComposable` accounts ~L457, Step 10 ~L899, Step 12 ~L975)
- `programs/tributary/src/state/composable_policy.rs` (`ForwardConfig` ~L34)
- `programs/tributary/src/instructions/composable/create_composable_policy.rs`
  (`validate_forward_config`)
- `programs/tributary/src/constants.rs`, `programs/tributary/src/error.rs`
- `tests/topup-balance-swap.test.ts` (copy as the test starting point)
- `tests/constants.ts` (`METEORA_DLMM_PUBKEY`, `METEORA_DLMM_SOL_USDC_POOL`)

## Summary of Changes

NATIVE_OUTPUT forward flag (bit 0) shipped end-to-end. WSOL→native-SOL topup via Tributary-controlled closeAccount sweep; recipient pinned on-chain (no drain vector).

**Program** (5 files):
- `constants.rs`: `FORWARD_FLAG_NATIVE_OUTPUT = 1` + local `NATIVE_MINT` constant (solana-program 2.x dropped the re-export).
- `state/composable_policy.rs`: `ForwardConfig::is_native_output()`.
- `error.rs`: new `NativeOutputRequiresWsol` variant.
- `create_composable_policy.rs`: create-time guard `is_native_output() ==> output_mint == NATIVE_MINT` + 3 unit tests (reject non-WSOL, accept WSOL, ignore when flag clear).
- `execute_composable.rs`: sweep branch on `native_output` (closeAccount → recipient system wallet, signed by ComposablePolicy PDA — same seeds as fee/sweep CPIs), `recipient_token_account` → `UncheckedAccount` with handler-side validation (raw-bytes mint/owner checks in normal mode, key==recipient in native mode), Step 10/12 guards skip the already-closed output intermediate.

**Test** (`tests/topup-balance-sol.test.ts`, 5/5 pass on surfpool): mirrors `topup-balance-swap.test.ts` with `forwardFlags = 1`, recipient system wallet as `recipientTokenAccount`, asserts native SOL ↑, WSOL intermediate closed, PayAsYouGo period-cap failure case.

**Build**: cargo check/test/fmt/clippy clean; `anchor build` regenerates IDL with the new error variant + accounts-struct change. No new clippy warnings (`#[allow(clippy::too_many_arguments)]` on `process_output_and_sweep`).

**Drains-avoidance write-up**: `reports/native-output-sweep.md`.

**Decisions resolved** (per bean open-decisions):
1. Validation approach: (a) WSOL-ATA sensor — smallest change. (b) deferred as follow-up.
2. `total_output` accounting: `sweep_amount` (excludes rent — rent is a side-effect bonus to recipient).
3. Error variant: new `NativeOutputRequiresWsol`.

Follow-up: Lighthouse generic account/lamport assertion (bean open-decision (b)) — would let the test assert on the recipient SOL balance directly.
