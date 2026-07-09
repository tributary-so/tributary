---
# tributary-rg9m
title: 'SDK: add createComposable() high-level constructor + ATA ensures in executeComposable()'
status: todo
type: feature
priority: normal
created_at: 2026-07-09T12:40:42Z
updated_at: 2026-07-09T12:40:42Z
---

Outcome of the createComposable() design grill (2026-07-09). All forks resolved with Fabian. IMPLEMENT ONLY — this bean captures the locked plan.

## Why

The composable branch of the SDK lacks the high-level ergonomics the payment-policy side has. getCreateComposablePolicyInstruction (sdk.ts:2677) returns a single low-level ix — no ATA ensure, no userPayment ensure, no delegate approve wiring. executeComposable (sdk.ts:2776) derives ATAs but ensures NONE client-side (only the program-created intermediates exist). Goal: parity with createSubscription() / executePayment() for the composable family, minus the parts composable's model forbids.

## Locked design (do not re-litigate)

### New private helpers (DRY primitives)
- ensureAta(owner, mint, payer) -> Promise<TransactionInstruction[]>  (returns [createATA ix] if missing, [] if exists; mirrors the inline blocks in executePayment:1908-1966)
- ensureUserPayment(user, mint, feePayer) -> Promise<{ ix: TransactionInstruction[], pda, account: UserPayment | null }>  (mirrors the inline block in createSubscription:824-832)

### createComposable(...)  — NEW high-level method
Mirrors createSubscription() with two carve-outs: NO referrals (composable has none), NO executeImmediately (composable execute needs caller-supplied forward instructionData + remainingAccounts — can't be auto-called at create time).
- Signature = getCreateComposablePolicyInstruction params + approvalAmount?: BN + feePayer?: PublicKey.
- Steps: ensure owner input-mint ATA -> ensure userPayment -> policyId = createdComposableCount+1 ?? 1 (NOTE: createdComposableCount, not createdPoliciesCount) -> push getCreateComposablePolicyInstruction(...) -> default approval via NEW private calculatePolicyApprovalAmount(policyType) dispatcher (interim, face-only) -> needs-approval check + revoke/approve (delegate = userPaymentPda, copy block from createOneTimePayment:1505-1546) -> return TransactionInstruction[].
- calculatePolicyApprovalAmount(policyType) dispatcher (INTERIM, no fee headroom): subscription -> calculateSubscriptionApprovalAmount; milestone -> calculateMilestoneApprovalAmount; payAsYouGo -> calculatePayAsYouGoApprovalAmount; oneTime -> amount; upTo -> maxAmount.

### executeComposable(...) — MODIFY existing (sdk.ts:2776)
Prepend ATA ensures before the existing ix build:
- ensureAta(recipient, deliverMint, authority)  (deliverMint already derived 2818-2822: output-mint for deliver-transform, input-mint otherwise, input-mint for act-mode slot filler)
- ensureAta(gateway.feeRecipient, inputMint, authority)  (input-side per ADR-0026)
- ensureAta(config.feeRecipient, inputMint, authority)
- authority = this.provider.publicKey as payer (matches executePayment).
- DO NOT touch the two intermediate ATAs — owned + created on-chain by the program (create_ata guards on zero lamports).

### Explicitly OUT OF SCOPE (do not do here)
- Fee-inclusive (NET-on-pull) approval sizing + 1yr-vs-2yr unbounded cap -> bean tributary-ydth (depends on THIS landing).
- Refactor of executePayment's inline ATA blocks -> leave as-is (payment-policy side is fine).
- Referrals on composable -> none exist.

## Acceptance (TDD)

- [ ] Tests first: createComposable emits [owner-ATA?, userPayment?, policy, revoke?, approve?] in order; idempotent (existing accounts -> empty ensure prefixes); uses createdComposableCount for policyId.
- [ ] Tests: executeComposable prepends create-ATA ix for missing recipient/gatewayFee/protocolFee ATAs; emits nothing when they exist; never emits intermediate-ATA creates.
- [ ] calculatePolicyApprovalAmount dispatcher unit-tested for all 5 variants (face-only, matches existing calculate* values).
- [ ] createComposable + executeComposable build + lint green (pnpm --filter @tributary-so/sdk build && lint).
- [ ] ponytail: comments mark the interim fee-sizing at calculatePolicyApprovalAmount + cross-ref tributary-ydth.

## Relationships

- Related to tributary-nmjf (marked completed but its claim 'constructor issues full ix bundle incl approve at gross' is NOT in code — only low-level getCreateComposablePolicyInstruction exists). THIS bean delivers what nmjf's summary described.
- Blocks / unblocks: tributary-ydth (fee-inclusive sizing) depends on this landing.
