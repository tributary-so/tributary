---
# tributary-zgv1
title: 'SZ-L-2: UpTo composables creatable but never executable'
status: todo
type: bug
priority: low
created_at: 2026-11-12T12:15:47Z
updated_at: 2026-11-12T12:15:47Z
---

Slot Zero 2026-11-08 §T5a (ID SZ-L-2, programs/tributary/security-checklist.md).

MECHANISM (verified at 4b0a32e9): create_composable_policy accepts every PolicyType (state validate() has an UpTo arm), but execute_composable rejects forward_amount=Some(_) for non-PayAsYouGo variants and validate_policy_execution's UpTo arm requires provided_amount — so forward_amount=None always fails InvalidAmount (6001). Dead on-chain configuration.

FIX (per report, pick one): reject UpTo at composable create (3 lines, preferred — no execution semantics exist for it), or plumb the settle amount through execute_composable like PayAsYouGo's forward_amount.

ACCEPTANCE: create with UpTo rejected at create (or e2e execute succeeds with a caller-supplied amount ≤ max_amount within the deadline).

Program change ⇒ update tributary.qedspec and regenerate formal_verification per AGENTS.md.
