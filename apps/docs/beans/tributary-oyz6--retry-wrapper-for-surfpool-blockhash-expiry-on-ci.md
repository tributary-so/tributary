---
# tributary-oyz6
title: Retry wrapper for Surfpool blockhash expiry on CI
status: completed
type: task
priority: high
created_at: 2026-07-01T14:55:38Z
updated_at: 2026-07-01T14:55:38Z
---

Add sendAndConfirmWithRetry helper that catches TransactionExpiredBlockheightExceededError and retries with a fresh blockhash. Fix the parallel Promise.all delete in 'Delete all remaining policies' (root cause of the 58s stall). Apply retry to the three CI-failing tests + the send() helpers in one-time and up-to test suites.
