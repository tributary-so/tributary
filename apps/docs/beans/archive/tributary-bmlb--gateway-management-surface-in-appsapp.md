---
# tributary-bmlb
title: Gateway management surface in apps/app
status: completed
type: feature
priority: normal
created_at: 2026-06-28T11:21:44Z
updated_at: 2026-06-29T09:23:41Z
parent: tributary-m96d
---

apps/app should host a gateway-management surface for gateway authorities — rotate signer, change fee bps, change fee recipient, toggle feature flags, view/configure referral program. Pairs naturally with the existing referral-account-form.tsx (referral codes are gateway-scoped).

Surfaced during apps/app grilling: referral management already lives in app and is gateway-scoped, so gateway mgmt belongs alongside it. Lands after the split epic (app is pure owner-dashboard).

Scope TBD — does it cover ProgramConfig (protocol admin) too, or only per-gateway PaymentGateway settings? Probably per-gateway only; protocol admin is a separate ops concern.

## Locked Design Spec (grilling 2026-06-29)

### Routes (2 new, 1 nav change)
- `/gateways` — public browse, read-only, always-visible nav entry
- `/gateway/manage` — authority-only single-gateway dashboard (reached via contextual banner on /gateways, not a nav slot)
- Nav: add one entry `Gateways` (always visible). No `Manage Gateway` nav entry. /referral and /account unchanged.

### /gateways — public list (Q4: curated fields + expandable cards)
- Expandable cards, one per gateway. Collapsed shows: name, url, authority, gateway_fee_bps, is_active, feature-flag badges (referral/net/custom-fee), created_at. Expanded adds: referral terms (allocation %, tier split) if enabled, fee_recipient, protocol fee (if custom-fee flag). **signer NEVER shown publicly** (operational internal; no browser relevance).
- Header CTA: 'Request a gateway' → https://tally.so/r/RGbbGl (always visible).
- Authority banner (Q6): when connected wallet is authority (cheap check: derive PDA `['gateway', wallet.publicKey]`, single getPaymentGateway → null = not authority), show 'You are the authority of {name} — manage it →' linking to /gateway/manage. Non-authorities see no banner.
- Empty state (no gateways): list empty message (fresh cluster edge case).

### /gateway/manage — authority dashboard (Q2: inline sections, flags distributed)
Constraint: ≤1 gateway per authority (PDA collision). So this is a SINGLE-gateway dashboard, not a list-of-mine. Empty state when not authority: 'You don't own a gateway' + Tally CTA.

Sections:
1. **Identity** (read-only): name, url, authority, created_at, is_active. Immutable after creation.
2. **Fees**: gateway_fee_bps (inline number input, 0-10000, combined guard <10000 with protocol fee) + net-amount flag toggle (bit 1) + custom-fee flag toggle (bit 2, reveals protocol_fee input when on).
3. **Referral program**: referral flag toggle (bit 0, reveals allocation/tiers when on) + referral_allocation_bps (0-2500) + tier split (3 values).
4. **Keys** 🔴: signer + fee_recipient. See diff-modal below.

Flags distributed: each flag sits next to what it gates (not a separate 'Feature Flags' section). update_gateway_feature_flags writes the whole byte; UI read-modify-writes per toggle.

### Edit patterns (Q5: risk-differentiated)
- **Fees/Referral/Flags** → inline edit (click → input → save/cancel). Client-side validation (bps ranges, combined guard). On save: submit tx + success toast; failure toast carries on-chain error. No undo (no on-chain timelock); re-edit is one click away.
- **Keys** (signer, fee_recipient) → custom diff modal. Modal shows old→new (truncated+checksummed, expandable to full), consequence in plain terms ('payments will halt until corrected' / 'fees misroute until corrected'), validation: valid PublicKey (new PublicKey() try/catch), warn if new===current (no-op), warn if new===authority or new===fee_recipient (suspicious self-ref). Single explicit confirm click ('I understand, change signer').

### Authority detection mechanic
Derive PDA ['gateway', wallet.publicKey], single getPaymentGateway call. Returns account → authority (show management). Null → not authority (empty state). One deterministic fetch, no getAllPaymentGateway scan. Used both for the /gateways banner and the /gateway/manage guard.

### SDK methods (all exist, just wire UI)
changeGatewaySigner, changeGatewayFeeRecipient, changeGatewayFeeBps, updateGatewayProtocolFee, updateGatewayFeatureFlags, updateGatewayReferralSettings, getPaymentGateway, getAllPaymentGateway.

### Out of scope (flagged, not fixed by bmlb)
- ADR 0006 on-chain gap: gateway authority is single-sig, no timelock/multisig. The UI diff-modal is the ONLY friction layer. Adding on-chain timelock/multisig is a protocol change — separate effort if wanted.
- is_active toggle: no on-chain instruction found to toggle gateway active/paused (unlike PolicyStatus). Confirm whether is_active is set-at-creation-only or controllable; if no instruction exists, the Identity section shows it read-only.

### Relationship to existing surfaces
- /referral (referrer signup) stays separate — its own route, own audience (referrers, not authorities). Its gateway <Select> dropdown could optionally filter to referral-enabled gateways (minor enhancement).
- /account stays policies-only. No gateway content there (avoids re-muddying post-m96d identity).

## Build Progress (2026-06-29)

- [ ] Build `useGatewayAuthority` hook
- [ ] Build `GatewayCard` (public, expandable, signer-safe)
- [ ] Build `GatewaysPage` (/gateways)
- [ ] Build `KeysDiffModal`
- [ ] Build 4 sections (Identity/Fees/Referral/Keys)
- [ ] Build `GatewayManagePage` (/gateway/manage)
- [ ] Wire routes + nav
- [ ] Build + lint pass

## Summary of Changes

### Component tree (apps/app/src/components/gateway/)
- `use-gateway-authority.ts` — single-PDA authority check hook (derive + 1 fetch)
- `gateway-card.tsx` — expandable public card; **never renders signer**
- `gateways-page.tsx` — `/gateways` list + authority banner + Tally CTA + empty state
- `gateway-manage-page.tsx` — `/gateway/manage` authority dashboard (4 sections)
- `keys-diff-modal.tsx` — Q3 high-impact key-rotation modal
- `inline-edit.tsx` — reusable inline edit wrapper (display ⇄ editor + save/cancel)
- `constants.ts` — `TALLY_REQUEST_URL`
- `sections/identity-section.tsx` — read-only name/url/authority/created/active
- `sections/fees-section.tsx` — gateway_fee_bps inline + net-amount toggle + custom-fee toggle/bps
- `sections/referral-section.tsx` — referral toggle + allocation inline + tier split inline
- `sections/keys-section.tsx` — signer + fee_recipient display, opens diff modal

### Routes wired (apps/app/src/app.tsx)
- `/gateways` → `GatewaysPage` (lazy)
- `/gateway/manage` → `GatewayManagePage` (lazy)

### Nav wired (apps/app/src/components/app-header.tsx)
- Added `GATEWAYS` (desktop) and `Gateways` (mobile) — always visible, alongside Docs/Referral. No `Manage Gateway` slot.

### SDK methods called per edit action
| Edit | SDK method |
|---|---|
| gateway_fee_bps | `sdk.changeGatewayFeeBps(authority, newBps)` |
| net-amount toggle (bit 1) | `sdk.updateGatewayFeatureFlags(authority, newFlags)` |
| custom-fee toggle (bit 2) | `sdk.updateGatewayProtocolFee(authority, useCustom, bps)` |
| custom_fee_bps | `sdk.updateGatewayProtocolFee(authority, true, newBps)` |
| referral toggle (bit 0) | `sdk.updateGatewayFeatureFlags(authority, newFlags)` |
| referral_allocation_bps | `sdk.updateGatewayReferralSettings(authority, featureFlags, alloc, currentTiers)` |
| referral_tiers_bps | `sdk.updateGatewayReferralSettings(authority, featureFlags, currentAlloc, newTiers)` |
| signer | `sdk.changeGatewaySigner(authority, newSigner)` |
| fee_recipient | `sdk.changeGatewayFeeRecipient(authority, newRecipient)` |
| Authority check | `sdk.getGatewayPda(wallet) → sdk.getPaymentGateway(pda)` |
| Public list | `sdk.getAllPaymentGateway()` |

### Keys diff-modal validation rules (Q3)
- Valid PublicKey via `new PublicKey(v)` try/catch
- Warns no-op if new === current
- Warns suspicious self-ref if new === authority OR new === fee_recipient (when editing signer)
- Single explicit confirm: "I understand, change {field}"
- Old→new shown truncated (4+4) by default, expandable to full

### Verification
- `pnpm --filter @tributary-so/app build`: ✅ green
- `pnpm --filter @tributary-so/app lint`: ✅ green for all new files; 3 pre-existing `any` errors in `account-page.tsx` and 3 pre-existing react-refresh warnings in `cluster-data-access.tsx` untouched per spec

### Interpretations / ambiguities resolved
1. **Referral tiers shape**: on-chain is `[u16; 3]` L1/L2/L3 (must sum to 10000). UI renders 3 inputs.
2. **`updateGatewayReferralSettings` args**: SDK signature is `(authority, featureFlags, allocBps, tiersBps)` — all required (SDK doesn't expose the on-chain Option wrapping). Pass-through current unchanged values when mutating a single field. The instruction preserves bit 2 server-side.
3. **Bit-2 writability**: `sdk.updateGatewayFeatureFlags` rejects bit 2 (only bits 0-1 valid). The spec's 'flip → updateGatewayFeatureFlags' for bit 2 was wrong; the correct call is `updateGatewayProtocolFee(authority, useCustom, bps)` which atomically toggles bit 2 AND sets the bps value. This instruction is **protocol-admin only** — the UI surfaces it in the authority dashboard per spec, but the tx will revert with Unauthorized if the connected wallet isn't `ProgramConfig.admin`. The fees section flags this with a 'Protocol-admin only' callout; on failure the toast carries the on-chain error (per Q5 risk-differentiated pattern).
4. **Referral flag (bit 0)**: spec called for `updateGatewayFeatureFlags` (works), used verbatim.
5. **`is_active` toggle**: no on-chain instruction exists (confirmed). Identity section renders it read-only per spec.
6. **Authority detection**: spec said null/error → not authority. Hook additionally double-checks `account.authority === wallet.publicKey` for defense in depth, then exposes `{ gateway, gatewayPda, authority, isAuthority, loading, refresh }`. Banner + guard + post-mutation refresh all use it.

## Summary of Changes (2026-06-29)

Built via subagent + orchestrator correction. Build + lint green.

Component tree (apps/app/src/components/gateway/):
- use-gateway-authority.ts — derived-PDA single-fetch authority hook
- constants.ts — TALLY_REQUEST_URL
- inline-edit.tsx — reusable display/editor wrapper (Q5 pattern)
- gateway-card.tsx — public expandable card (signer NEVER rendered per Q4)
- gateways-page.tsx — /gateways route (header+CTA, authority banner, list, empty state)
- gateway-manage-page.tsx — /gateway/manage route (guard + 4 sections)
- keys-diff-modal.tsx — Q3 friction (valid-PubKey + no-op + self-ref heuristics)
- sections/{identity,fees,referral,keys}-section.tsx

Routes wired (/gateways, /gateway/manage); nav: one 'Gateways' entry (Q6). SDK methods wired per spec.

## SPEC CORRECTION (post-build, by orchestrator)

Q2 spec assumed the custom-fee flag (bit 2) + protocol fee value were authority-editable in the Fees section. ON-CHAIN REALITY (verified update_gateway_protocol_fee.rs:17,31): update_gateway_protocol_fee requires the PROTOCOL-ADMIN signer (config.admin), NOT the gateway authority. The authority is referenced only for PDA derivation. Bit 2 flips ONLY inside that admin-gated instruction.

Subagent built them editable-with-failure-toast; orchestrator rewrote fees-section.tsx to make protocol fee + custom-fee flag READ-ONLY display (shows state, notes 'protocol-admin only'). An authority cannot change these — surfacing an edit would always fail Unauthorized. The authority-editable fee controls are now correctly: gateway_fee_bps (changeGatewayFeeBps) + net-amount toggle (updateGatewayFeatureFlags, accepts bits 0+1 only).

Subagent-flagged interpretations kept: referral tiers [u16;3] summing to 10000; updateGatewayReferralSettings args all-required pass-through; is_active read-only (no toggle instruction).
