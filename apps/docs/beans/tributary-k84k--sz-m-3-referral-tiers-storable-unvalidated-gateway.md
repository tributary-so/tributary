---
# tributary-k84k
title: 'SZ-M-3: referral tiers storable unvalidated → gateway authority can debit payers beyond the documented fee bound'
status: completed
type: bug
priority: normal
created_at: 2026-11-12T12:15:24Z
updated_at: 2026-11-12T13:31:11Z
---

Slot Zero 2026-11-08 §T3 (ID SZ-M-3, programs/tributary/security-checklist.md).

MECHANISM (verified at 4b0a32e9): three gaps compose. (1) update_gateway_referral_settings stores referral_tiers_bps unvalidated (validate_referral_tiers only runs when referral is ALREADY enabled and allocation > 0 — CF-012 narrowed the guard to exactly this dormant case). (2) update_gateway_feature_flags enables FEATURE_REFERRAL with no tier validation at all. (3) process_referral_rewards trusts stored tiers: tier_reward[i] = pool × tier_bps[i] / 10000 with no sum cap. Sequence: store tiers [65535,65535,65535] while referral off → flip the flag → every payment with a gateway-controlled 3-level chain pays 3 × 6.5535 × pool from the payer's token account beyond face+fee (repro: 10 USDC gross policy debited 10.933 USDC). Distinct from CF-012; docs bound referral rewards at ≤ 25% of the fee. Dormant today (no gateway has referral enabled).

FIX (per report): validate tiers on every write that leaves referral enabled (including the feature-flags path), and cap the sum of tier rewards at the pool inside process_referral_rewards (defense in depth).

ACCEPTANCE: (a) store-then-flag sequence rejected or sanitized at the flag write; (b) unit test on process_referral_rewards with malicious tiers: total distributed ≤ pool.

Program change ⇒ update tributary.qedspec and regenerate formal_verification per AGENTS.md.

## Summary of Changes

Fixed with three independent gates (defense in depth), RED-then-GREEN:
1. Write-time: PaymentGateway::validate_tier_candidate (u32 accumulation — the old u16 sum PANICKED on exactly the malicious [65535;3] candidates it had to reject, a latent on-chain abort under overflow-checks=true). update_gateway_referral_settings now validates every explicit tiers write, dormant or not. CF-012's dormant-default allowance for [0,0,0] at CREATE is preserved.
2. Flags-path: update_gateway_feature_flags validates the STORED tiers whenever the final state leaves referral enabled with a live allocation — closes both the legacy-garbage store and any future bypass.
3. Distribution: process_referral_rewards now uses compute_tier_rewards — a pure, u128-intermediate, sequentially-capped split whose SUM can never exceed the pool, whatever was stored. The report's 10.933/10 USDC over-debit is bounded to at most the fee carve-out.

Tests: tier_candidate x3 (payment_gateway.rs), tier_rewards x3 incl. u64::MAX no-overflow (referral.rs), enabling_referral_with_live_allocation_rejects_garbage_stored_tiers (update_gateway_feature_flags.rs). Lib suite 212/212, clippy clean. No e2e added: referral is dormant on every live gateway; the three gates are pure logic fully covered by host tests.

qedspec: unchanged — the spec covers calculate_fees carve-out conservation (untouched); tier distribution sits below the spec'd layer.
