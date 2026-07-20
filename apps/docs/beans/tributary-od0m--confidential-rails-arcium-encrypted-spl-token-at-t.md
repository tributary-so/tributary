---
# tributary-od0m
title: Confidential Rails — Arcium Encrypted SPL Token at the pull/deliver boundary (Tier 1)
status: todo
type: milestone
priority: high
tags:
    - arcium
    - confidential
    - tier-1
    - payments
created_at: 2026-07-20T10:40:14Z
updated_at: 2026-07-20T10:40:14Z
---

# Confidential Rails — Arcium Encrypted SPL Token at the pull/deliver boundary

**Tier 1 of the Arcium × Tributary confidentiality roadmap.** Lowest-effort,
highest-ROI move: hide **PULL amounts** by routing `execute_payment` and
`execute_composable` settlement through Arcium Confidential SPL Token
accounts.

## What this milestone does

Makes Tributary pull from and deliver to **Confidential SPL Token** accounts
(Arcium's Encrypted SPL Token program + Confidential Transfer Adapter +
Confidential ATA Program + Token Wrap Program). The schedule logic, policy
shape, fee math, and permissionless execution model are **unchanged** — only
the settlement CPI target moves.

- `execute_payment`: single CPI `transfer` now flows through the Confidential
  Transfer Adapter when source and/or destination is a confidential ATA.
  Amount is encrypted end-to-end.
- `execute_composable` Phase 5 (settle): the deliver sweep (deliver-no-transform
  and deliver-transform shapes) routes through the same adapter.
- Fee recipients get confidential ATAs (or the gateway opts into an explicit
  unwrap-at-boundary policy that documents what leaks).
- Recipient UX: the Confidential ATA Program lets a gateway create a
  confidential ATA on behalf of the recipient, mirroring existing ATA handling.

## What this milestone hides / does NOT hide

| Hidden | Not hidden (structural) |
|---|---|
| Pull amount | Sender pubkey (account ownership) |
| Fee amounts (if recipients confidential) | Recipient pubkey (still an on-chain ATA owner) |
| Running confidential balance | The fact that *some* payment happened |
| | Block timestamp / slot |
| | Token mint (unless wrapped) |
| | Policy schedule (Tier 3 territory) |

## Architectural alignment

Maps to the Tributary primitive `WHEN × PULL × ROUTE`: this milestone turns
the **PULL** axis confidential. It does not touch WHEN (Tier 2) or the schedule
internals (Tier 3). It is the prerequisite for both — Tier 2's callback needs
to settle into a confidential account, Tier 3's execute callback triggers a
Tier-1 transfer.

## Critical constraints / known risks

1. **Confidential SPL Token maturity (GATING UNKNOWN).** Announced Jul 2025;
   a Dec 2025 analysis calls it "moving from development to live deployments."
   Must verify mainnet status, audit posture, and exact CPI surface with
   Arcium **before** any program code is written. Epic 1 is a hard gate.
2. **Anchor/Solana version skew.** Tributary is Anchor 0.31.0 / Solana 1.18.20.
   Arcium v0.11.x is Anchor 1.0.2 / Solana 3.1.10. For Tier 1 this is mostly
   a non-issue (pure CPI to an external program, no `#[arcium_program]` macros),
   but the Arcium TS client (`@arcium-hq/client`) version compatibility with
   the SDK's toolchain must be verified.
3. **Async hop likely.** The "program touches confidential balance" path
   (PDA as delegate on a confidential account) almost certainly requires an
   MPC round-trip, not a synchronous CPI. Tributary's current `execute_payment`
   is single-tx atomic; this milestone introduces a queue/callback pair OR
   confirms the adapter exposes a synchronous path. Epic 1 must answer this.
4. **Fee-leak policy decision.** If any fee recipient lacks a confidential
   ATA, the fee amount becomes visible at the unwrap boundary. Gateway
   operators must choose: confidential fee routing (full privacy) or
   documented partial leak. Captured in ADR-0031.
5. **Token-2022 blocklist interaction (ADR-0012).** The existing mint
   compatibility blocklist must be extended to reason about Arcium wrapped
   mints vs. underlying mints.

## HANDOFF

### 1. Happy Path

1. User wraps their SPL balance into a Confidential SPL Token account via
   Token Wrap Program (or the mint issuer ships a native confidential variant).
2. User calls `create_user_payment` against the confidential mint, then
   approves the UserPayment PDA as delegate on the Encrypted SPL Token program.
3. Merchant/gateway creates a PaymentPolicy pointing at the confidential mint.
4. Gateway creates a Confidential ATA on behalf of the recipient via the
   Confidential ATA Program (recipient later claims + attaches decryption key).
5. Permissionless `execute_payment`: Tributary PDA delegates a confidential
   transfer through the Confidential Transfer Adapter — encrypted amount
   moves source→recipient. Fee cuts route to confidential fee ATAs.
6. Recipient decrypts their new balance client-side with their x25519 key.

### 2. Data Contract

- **Public surface**:
  - `execute_payment` / `execute_composable` — unchanged instruction shape;
    CPI target swaps internally based on source/dest account type.
  - New mint-compatibility predicate: `is_confidential_mint(mint) -> bool`.
  - `PaymentGateway.feature_flags` gains `FEATURE_CONFIDENTIAL_RAILS` (bit).
  - New SDK helpers: `createConfidentialSubscription(...)`,
    `executeConfidentialPayment(...)`, `wrapToConfidential(amount)`.
- **Modules touched**:
  - `programs/tributary/src/constants.rs` — allowlist of Arcium program IDs.
  - `programs/tributary/src/instructions/payment/execute_payment.rs` —
    confidential transfer branch.
  - `programs/tributary/src/instructions/composable/execute_composable.rs` —
    Phase 5 settle branch.
  - `programs/tributary/src/shared/mint.rs` — confidential mint detection.
  - `programs/tributary/src/shared/fees.rs` — confidential fee routing.
  - `packages/sdk/src/` — new confidential helpers + `@arcium-hq/client` dep.
- **New external deps**: `@arcium-hq/client`, `@arcium-hq/reader`.
- **No new Tributary PDA** in Tier 1 — reuses UserPayment, PaymentPolicy,
  ComposablePolicy.

### 3. Edge Cases & Constraints

- **Never** allow a confidential→public downgrade without owner signature
  (privacy is a user right, not a gateway toggle).
- **Never** leak the amount in any event field; `PaymentExecuted` event must
  carry an encrypted amount blob (or omit amount entirely for confidential
  flows) — verify the event emitter.
- Fee recipients without confidential ATAs: fail-create (gateway config) OR
  explicit unwrap-at-boundary with documented leak. No silent leak.
- Wrap/unwrap operations are user-initiated, never program-initiated
  (Tributary moves tokens, doesn't transform mints).
- The delegate approval on Encrypted SPL Token must be re-checked for amount
  sufficiency under encrypted balance — delegate approval semantics may differ
  from vanilla SPL (delegate amount vs. encrypted available balance).

### 4. Business Logic (pseudo-code, Rust)

```rust
// execute_payment — confidential branch (illustrative)
if is_confidential_mint(&ctx.accounts.user_token.mint) {
    require!(gateway.has_feature(FEATURE_CONFIDENTIAL_RAILS), Err::ConfidentialNotEnabled);
    // CPI: Confidential Transfer Adapter
    //   source: user_confidential_ata (delegate = UserPayment PDA)
    //   dest:   recipient_confidential_ata
    //   amount: encrypted blob (MPC decrypts inside adapter)
    //   fee_cuts: routed to confidential fee ATAs
    confidential_transfer_adapter::transfer(
        ctx.accounts.user_token.key,
        ctx.accounts.recipient_token.key,
        encrypted_amount_blob,
        fee_routing_accounts,  // all confidential ATAs
    )?;
} else {
    // existing plaintext path
    token::transfer(...)?;
}
```

### 5. Definition of Done

- [ ] Epic 1 GO/NO-GO memo committed; Arcium mainnet status + CPI surface documented.
- [ ] Confidential transfer CPI wired for both `execute_payment` and composable Phase 5.
- [ ] `FEATURE_CONFIDENTIAL_RAILS` feature flag gates every confidential path.
- [ ] Fee routing handles confidential recipients; leak policy documented + tested.
- [ ] Confidential ATA creation on behalf of recipient works end-to-end.
- [ ] Surfpool test suite: amount-privacy assertion, fee-leak assertion, downgrade-attack rejection, conservation property.
- [ ] SDK helpers shipped; `@arcium-hq/client` integrated.
- [ ] ADR-0031 merged; AGENTS.md + tributary.qedspec updated.
- [ ] Latency/cost benchmark vs plaintext baseline committed to `reports/`.

### 6. Test Matrix (Given / When / Then)

- Given a confidential subscription, When `execute_payment` fires, Then the
  on-chain transfer event carries NO plaintext amount and recipient balance
  increases by the expected decrypted delta.
- Given a gateway with confidential fee recipients, When a pull executes,
  Then all fee cuts land in confidential ATAs and NO plaintext fee amount
  appears in any account or event.
- Given a gateway WITHOUT confidential fee recipients, When config is written,
  Then create fails fast with a documented error OR the gateway explicitly
  opts into the documented leak policy.
- Given a confidential policy, When a malicious gateway signer attempts a
  confidential→public downgrade, Then the tx reverts (owner signature required).
- Given a pull, When the confidential transfer CPI completes, Then
  `amount_user + amount_protocol_fee + amount_gateway_fee + amount_scheduler == amount_pulled`
  holds under encrypted arithmetic (MPC conservation).
- Given a recipient without a pre-created confidential ATA, When the gateway
  executes, Then the Confidential ATA Program creates the account and the
  recipient can later claim + attach their decryption key.

### 7. Open Questions

- **CONFIDENTIAL SPL TOKEN MAINNET STATUS** — verify with Arcium (docs/Discord/DM). Is the Encrypted SPL Token program deployed? Audited? By whom? (Epic 1 task 1.)
- **SYNCHRONOUS vs ASYNC CONFIDENTIAL TRANSFER** — does the Confidential Transfer Adapter expose a single-tx CPI for PDA-delegated transfers, or does every "program touches confidential balance" path require an MPC queue/callback? Determines whether Tier 1 stays single-tx or inherits Tier 2's async machinery. (Epic 1 task 2.)
- **DELEGATE APPROVAL SEMANTICS** — does the Encrypted SPL Token program support delegate-with-amount semantics analogous to SPL `approve(delegate, amount)`, or is delegation all-or-nothing? Affects whether Tributary can keep its per-policy delegated_amount accounting. (Epic 1 task 3.)
- **TRIBUTARY ANCHOR 0.31 vs ARCIUM ANCHOR 1.0 SKEW** — confirm Tier 1 needs no `#[arcium_program]` macro (pure CPI). If true, no Tributary program toolchain migration needed for Tier 1. (Epic 1 task 4.)
- **WRAP/UNWRAP GAS MODEL** — who pays rent on wrapped confidential accounts? User or gateway subsidy? (Epic 4 economics task.)
