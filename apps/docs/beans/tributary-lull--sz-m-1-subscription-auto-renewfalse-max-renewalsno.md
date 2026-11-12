---
# tributary-lull
title: 'SZ-M-1: Subscription auto_renew=false + max_renewals=None never completes — charged every period'
status: completed
type: bug
priority: high
created_at: 2026-11-12T12:15:03Z
updated_at: 2026-11-12T13:12:11Z
---

Slot Zero 2026-11-08 §T1 (ID SZ-M-1, programs/tributary/security-checklist.md).

MECHANISM (verified at 4b0a32e9): shared/schedule.rs advance_policy, Subscription branch: should_complete = if let Some(ref mut max) = max_renewals { *max = max.saturating_sub(1); *max == 0 || !*auto_renew } else { false }. With auto_renew=false, max_renewals=None the policy NEVER completes; the gateway scheduler keeps executing it every period until the payer pauses or revokes delegation. Contradicts (a) the doc comment on advance_policy itself ('completes when max_renewals hits zero OR auto_renew is false'), (b) the docs renewal table (auto_renew=false 'pauses after next payment'). With max_renewals=Some(n) the same auto_renew=false completes correctly — only the None case is broken.

LIVE IMPACT: 7 such policies on mainnet (5 Active, 2 Paused), all on the contribute.so gateway (CwNybLVQ…); one (3HT4shvg…, 1 USDC quarterly) already charged a second time on 2026-10-30 by the current deployment; two pre-August hourly policies were charged ~1,800 times each. Likely our own flows, but any payer can create this combo.

FIX: complete when auto_renew=false regardless of max_renewals (move the !*auto_renew check out of the Some branch), or reject the combo at create. The schedule fix is preferred: create-time rejection alone leaves the 7 live Active policies charging forever.

ACCEPTANCE: regression test — three policies (auto_renew=false/None, auto_renew=false/Some(2), auto_renew=true/None) executed daily for 4 days: first completes after day 1 (status Completed, later executes refused), second after its max, third keeps charging.

OPERATIONAL MITIGATION until shipped: scheduler skips auto_renew=false + max_renewals=None subscriptions after their first payment.

Program change ⇒ update tributary.qedspec and regenerate formal_verification per AGENTS.md.

## Summary of Changes

Fixed in advance_policy (shared/schedule.rs): the max_renewals=None branch now returns !*auto_renew instead of false — auto_renew=false completes the subscription after one charge regardless of a renewal ceiling, matching the documented 'pauses after next payment' semantics. RED-then-GREEN regression test subscription_completes_when_auto_renew_false_and_no_max; all 196 lib tests green, clippy clean (no new warnings). Committed as fix(schedule).
