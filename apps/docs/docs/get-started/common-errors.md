# Common Errors

Build- and runtime-error troubleshooting for integrators using the Tributary SDK and on-chain program.

## Overview

This page collects the error messages an integrator is most likely to hit —
Anchor compile errors, delegate-approval failures, `next_payment_due` gating,
and composable CPI reverts — and pairs each with a root-cause explanation and
the smallest fix. Use it as the first stop before the full
[Error Codes](../protocol-reference/error-codes.md) reference.

<!-- TODO scope (c):
  - Top 10 most common SDK / Anchor errors with copy-paste remediation
  - Delegate-not-approved and insufficient-delegated-amount cases
  - Composable forward / validation CPI failures and how to read them
  - Source: `programs/tributary/src/errors.rs`, SDK throw sites, GitHub issues
-->
