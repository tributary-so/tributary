---
# tributary-l99n
title: 'T-1: Replace instructions: any[] with TransactionInstruction[]'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:42:02Z
updated_at: 2026-07-06T16:46:03Z
parent: tributary-jnx8
---

sdk-react/src/types.ts:37,55,79,117,147 — every Create*Result type uses any[]. Use TransactionInstruction[] for type safety.

## Summary of Changes
Replaced instructions: any[] with TransactionInstruction[] in 5 Create*Result interfaces in packages/sdk-react/src/types.ts (CreateSubscriptionResult, CreateMilestoneResult, CreatePayAsYouGoResult, CreateOneTimeResult, CreateUpToResult). Added TransactionInstruction to the @solana/web3.js import.
