---
# tributary-93pa
title: 'SZ-L-1: pre-ADR-0024 PayAsYouGo accounts bricked (borsh None=1 byte, not 9) — one-off migration needed'
status: todo
type: bug
priority: normal
created_at: 2026-11-12T12:15:47Z
updated_at: 2026-11-12T12:15:47Z
---

Slot Zero 2026-11-08 §T4 (ID SZ-L-1, programs/tributary/security-checklist.md).

MECHANISM (verified at 4b0a32e9): ADR-0024 inserted expiry_date: Option<i64> into PayAsYouGo and cut padding 88→79, assuming old zeroed padding reads as None + 8 ignored bytes. Borsh consumes Option::None as ONE byte, so the new layout deserializes 8 bytes fewer than the old; every account field after policy_type reads 8 bytes early → seeds re-derivation fails (ConstraintSeeds 2006) on execute/pause/delete; delete_user_payment fails HasActivePolicies. Side note: borsh also SERIALIZES None as 1 byte, so the variant is not actually fixed-size across None/Some — new None-accounts are 8 bytes shorter than the ADR-0002 128-byte invariant assumes.

LIVE IMPACT: exactly 2 of 64 policy accounts (EY3am89pZQJWXgZjdPfj9xY1FJ7FgvLxYhVrnRL8FCYM policy id 7; 7jSTNPE34XUHAu2q8ReNbfn1CNVwwQyuoK2FMwZ6h88R policy id 1 — both Allowly gateway). Merchants cannot collect, owners cannot pause/delete, both UserPayments can never be closed, 0.01703808 SOL rent locked. No funds at risk; payers can still revoke. Recovery needs a program upgrade.

FIX (per report): one-off migration instruction that decodes the pre-ADR-0024 body, re-derives the PDA with the OLD policy_id/bump to prove ownership, and rewrites the account with expiry_date=None (canonical layout). Add a regression test loading EY3am89p…'s current bytes as a fixture, and a pre-deploy check that re-derives every live account's address from the fields the new build reads (would have caught this).

ACCEPTANCE: fixture test migrates both live accounts; execute/pause/delete work post-migration; pre-deploy checker passes on all 64 live accounts.

Program change ⇒ update tributary.qedspec and regenerate formal_verification per AGENTS.md.
