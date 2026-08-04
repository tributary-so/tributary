---
# tributary-hi1n
title: ComposablePolicyCard — list item with Composable badge
status: scrapped
type: task
priority: high
created_at: 2026-07-06T16:33:25Z
updated_at: 2026-07-08T16:55:28Z
parent: tributary-4vfp
---

Card component for composable policies in the policy list. Distinct 'Composable' badge. Shows memo, recipient (truncated), payment count, status badge. Summary line: forward program pubkey (truncated) or 'Direct' if forward disabled. Interleaved with regular PolicyCard entries under same UserPayment group.

## Reasons for Scrapping

Duplicate of `tributary-avg7` (completed). Both describe the `ComposablePolicyCard` list item (Composable badge, memo, truncated recipient, payment count, status badge, forward-program-or-Direct summary line, interleaved with regular PolicyCard entries) AND the `SelectedPolicy` discriminated union. The work landed in commit 45bef4b2 (account-page.tsx `ComposablePolicyCard` at line 604, `SelectedPolicy` at line 43). `tributary-avg7` is the more detailed, properly-wired bean — it subsumes this one.
