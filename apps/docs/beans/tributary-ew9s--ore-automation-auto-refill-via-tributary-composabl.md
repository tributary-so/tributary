---
# tributary-ew9s
title: ORE automation auto-refill via Tributary composable forward
status: todo
type: milestone
priority: high
created_at: 2026-07-23T07:59:52Z
updated_at: 2026-07-23T08:17:55Z
---

ORE's `Automation` PDA holds a prepaid native-SOL balance; when it drains, the program closes the automation (`program/src/deploy.rs:164-174`, `:241-243` in the ore fork) and the miner silently stops. This milestone ships a Tributary-side **auto-refill**: a PayAsYouGo composable policy pulls WSOL from the user's wallet (per-period cap = mining budget), gated by a Lighthouse pre-validation ("automation lamports below threshold"), and forwards it into a new permissionless ORE `TopUp` instruction that unwraps and credits the automation balance.

Deliverables: a new forward builder in `packages/forward-builders` (`createOreTopUpForward` + `oreTopUpForwardConfig`), the ORE program instruction (cross-repo), the Tributary forward-allowlist entry, and an end-to-end recipe.

Repos:
- **Tributary** (this repo): `packages/forward-builders`, `programs/tributary`, `apps/docs`
- **ORE fork** (cross-repo): `/home/xeroc/projects/Tributary/ore` (`program/` + `api/` crates). Upstream IDL reference: https://github.com/regolith-labs/ore/blob/master/api/idl.json — note the fork's discriminators differ from upstream master (fork: Bury=24, NewVar=19, Liq=25).

## HANDOFF

### 1. Happy Path

1. User creates a PayAsYouGo ComposablePolicy: `input_mint = WSOL`, `output_mint = Pubkey::default()` (**Act mode**, ADR-0026), per-period cap = refill budget, `forwardConfig = oreTopUpForwardConfig(...)`.
2. Pre-validation (Lighthouse, already allowlisted at `programs/tributary/src/constants.rs:17`) asserts the ORE automation PDA's lamports < threshold — the pull is vetoed while the miner is still funded.
3. Scheduler fires `execute_composable`: pulls gross = face + fee WSOL, skims fees (NET-on-pull, ADR-0026); `intermediate_input` then holds exactly `face`.
4. Forward CPI: Tributary `invoke_signed`s ORE `TopUp` with the ComposablePolicy PDA as the ONLY signer (ADR-0008, `execute_composable.rs:170-191`). TopUp transfers `face` WSOL from the intermediate to a WSOL account owned by the automation PDA, closes that account (destination = automation PDA, signed with ORE's `[AUTOMATION, authority]` seeds), and credits `automation.balance += face`.
5. Act-mode settle: no output delivery; residue (0) swept back to user; Tributary closes the intermediate ATA itself.
6. The miner keeps deploying next round; the automation never dies of underfunding.

### 2. Data Contract

- `packages/forward-builders/src/ore-topup.ts` (new):
  - `createOreTopUpForward(opts: { automationAuthority: PublicKey }): ForwardBuilder` — fire-time; returns `{ instructionData, forwardAccounts }` per the SDK interface (`packages/sdk/src/composable.ts:68`). `instructionData = [ORE_TOPUP_DISCRIMINATOR] ++ le64(face)` (9 bytes; steel layout).
  - `oreTopUpForwardConfig(opts: { automationAuthority: PublicKey }): ForwardConfig` — setup-time; `programId = ORE_PROGRAM_PUBKEY`; `dataChecks[0] = { offset: 0, length: 1, expected: [disc, 0...] }` (satisfies `DiscriminatorCheckRequired`, `create_composable_policy.rs:~171`); `pinnedAccounts` pins the automation PDA at its account index; `inputMint = NATIVE_MINT`, `outputMint = PublicKey.default` (Act), `forwardFlags = 0`.
  - `packages/forward-builders/src/constants.ts`: add `ORE_PROGRAM_PUBKEY = oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv`, `ORE_TOPUP_DISCRIMINATOR = 26` (proposed).
  - Export both from `packages/forward-builders/src/index.ts`.
- ORE fork: new `OreInstruction::TopUp = 26` (`api/src/instruction.rs`), handler `program/src/top_up.rs`, args `{ amount: [u8; 8] }`; accounts `[funder_authority (signer via CPI), funder_wsol (writable), automation_wsol (writable, WSOL token account owned by automation PDA), automation (writable, PDA [AUTOMATION, authority]), authority (readonly), wsol_mint, token_program, system_program]`. Permissionless: NO `authority == signer` check — the only possible effect is crediting an existing automation.
- `programs/tributary/src/constants.rs:14`: append the ORE program id to `ALLOWED_FORWARD_PROGRAMS`.

### 3. Edge Cases & Constraints

- The forward MUST NOT close or zero the `intermediate_input` ATA: Act-mode settle reads its amount (`sweep_input_residual_to_user`) and Tributary closes it afterwards ("CLOSE intermediate token accounts", `execute_composable.rs`). Consume via `token::transfer` only.
- Only the ComposablePolicy PDA carries signer privilege into the CPI; every other forward account is stamped `isSigner: false`. ORE `TopUp` must therefore never require the miner authority to sign.
- `TopUp` must hard-fail (clean revert, no partial state) when: automation account is empty/closed, `automation.authority != authority`, or `amount > funder_wsol.amount`.
- Unwrap rent: closing `automation_wsol` sends its rent lamports to the automation PDA too — credit exactly `amount` to `balance`, never the rent residue (would break ORE's invariant `automation lamports == rent_exempt(Automation) + balance`; see `automate.rs` deposit collect and `deploy.rs` debits).
- Pin the automation account index in `pinnedAccounts` — an unpinned automation lets a gateway redirect refills to a different miner.
- Do NOT renumber existing ORE fork discriminators. Used: 0,2,3,4,5,6,8,9,13,14,15,19,21,24,25 → 26 is next free.
- Tributary fees apply per refill (protocol + gateway bps on face); budget caps bind on GROSS (`resolveDefaultForwardAmount`, sdk `composable.ts`). Document in the recipe.

### 4. Business Logic (pseudo-code, target language)

ORE `program/src/top_up.rs`:
```rust
let args = TopUp::try_from_bytes(data)?; let amount = u64::from_le_bytes(args.amount);
let automation = automation_info                       // fails if closed → clean revert
    .as_account_mut::<Automation>(&ore_api::ID)?
    .assert_mut(|a| a.authority == *authority_info.key)?;
funder_authority.is_signer()?;                         // = ComposablePolicy PDA via invoke_signed
transfer(funder_authority, funder_wsol, automation_wsol, token_program, amount)?;
close_account_signed(automation_wsol, automation_info, /* [AUTOMATION, authority] seeds */)?;
automation.balance += amount;                          // rent residue NOT credited
```

forward-builders `ore-topup.ts` `build()`:
```ts
const data = Buffer.concat([Buffer.from([ORE_TOPUP_DISCRIMINATOR]), face.toArrayLike(Buffer, "le", 8)]);
// accounts in ORE TopUp order; composablePolicyPda gets signer stamped by the program itself
return { instructionData: data, forwardAccounts: [...].map(k => ({ pubkey, isWritable })) };
```

### 5. Definition of Done

- [ ] ORE `TopUp` lands in the fork with unit tests: credits balance, rejects closed automation, rejects over-transfer, preserves the lamports invariant
- [ ] `ALLOWED_FORWARD_PROGRAMS` includes the ORE id; `create_composable_policy` accepts `oreTopUpForwardConfig` output and still rejects configs missing the offset-0 data check
- [ ] `packages/forward-builders` exports `createOreTopUpForward` / `oreTopUpForwardConfig` with jest tests mirroring `meteora-dlmm.test.ts`; build + lint green
- [ ] E2E (localnet/bankrun): PAYG + Lighthouse threshold gate + TopUp forward → `automation.balance` increases by exactly `face`; a second fire while funded is vetoed by pre-validation
- [ ] Docs page in `apps/docs` describing the auto-refill recipe, including the fee note

### 6. Test Matrix (Given / When / Then)

- Given a funded automation above threshold, When the scheduler fires, Then Lighthouse pre-validation vetoes and no tokens move.
- Given automation below threshold and user WSOL ≥ gross, When `execute_composable` runs, Then `automation.balance += face` and intermediate residue == 0.
- Given a closed automation account, When the TopUp CPI executes, Then the whole `execute_composable` reverts cleanly (no partial pull).
- Given a forward config whose pinned automation ≠ the intended automation, When the gateway substitutes accounts at execute time, Then the pinned-account check fails.
- Given TopUp data with `amount > face`, When the forward runs, Then the token transfer fails (intermediate holds exactly `face`) and the tx reverts.

### 7. Open Questions

- `automation_wsol` lifecycle: pre-created ATA per automation (who pays rent, where is it refunded on close?) vs. created/closed inside `TopUp` via an ORE-PDA allocate+assign (needs direct-lamport funding — the automation PDA cannot sign system transfers). Design task decides; record the chosen rent flow.
- Discriminator 26: confirm against deployed fork history before freezing.
- Fallback architecture if the Act-mode forward proves gnarly in E1: deliver-transform (e.g. USDC→WSOL DLMM swap) with `FORWARD_FLAG_NATIVE_OUTPUT` and `recipient = automation PDA`, plus a separate permissionless ORE `SyncBalance` ix appended by the scheduler post-execute. Cheaper ORE-side but leaves forward-builders without an ORE builder — adopt only if E1 kills the primary design.
- Should `TopUp` also top up `miner.checkpoint_fee` when zero (mirroring `automate.rs:103-105`)? Recommend yes; decide in design.

### Related prior art (added 2026-07-23)

- `apps/docs/docs/integration-guide/programmable-pull-payments/examples/native-sol-topup.md` — existing **act-mode** example (output_mint = Pubkey::default(), forward CPI is the point, no delivery sweep). Recently fixed for ADR-0026 accuracy (bean tributary-2net). The ORE TopUp forward is this exact shape.
- `apps/docs/docs/integration-guide/programmable-pull-payments/examples/auto-topup-guard.md` — existing **deliver-no-transform + Lighthouse guard** example (bean tributary-q6kn). The Lighthouse threshold-gate wiring for E5 should follow this pattern.
- Raydium CPMM forward integration (milestone tributary-404h and children, e.g. tributary-b3jg, tributary-teqe, tributary-a6ci) — the most recent forward-program onboarding; mirrors this milestone's E3/E4 split and is the best structural template.
- `packages/forward-builders` uses **indexed pinned accounts** (ADR-0030 / beans tributary-wl4s, tributary-d9rv) and MAX_PINNED_FORWARD_ACCOUNTS was reduced to 2 (tributary-jsna) — the automation PDA pin must fit that budget.
