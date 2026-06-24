---
# tributary-bibw
title: Update README.md with comprehensive documentation
status: completed
type: task
priority: normal
created_at: 2026-06-24T11:49:30Z
updated_at: 2026-06-24T11:54:54Z
---

Regenerate README.md following absurdly thorough documentation standards. Cover local dev, architecture, deployment, troubleshooting. Reflect actual codebase state including packages/sdk, packages/payments, packages/lighthouse, apps/api, apps/scheduler, apps/cli.

## TODO

- [x] Explore codebase (program, packages, apps, tests, CI)
- [x] Write comprehensive README.md
- [x] Verify lint

## Summary of Changes

Regenerated `README.md` (691 -> 1056 lines, +830/-465). Key corrections vs the previous version:

- **Instructions**: documented all 21 program entrypoints (was claimed "5").
- **Composable policies**: full coverage of validation (Lighthouse) + forward (Meteora DLMM) hooks, ForwardConfig/ValidationConfig/ByteRangeCheck, 3-phase execution flow, allowlists, intermediate-ATA ownership, and the SDK `lighthouse` facade.
- **PDAs**: corrected table — added ComposablePolicy, ValidationPda, ReferralAccount; fixed PaymentsDelegate (legacy `["payments"]` global, not the per-policy seed previously listed).
- **Counter separation**: documented that PaymentPolicy IDs and ComposablePolicy IDs come from independent UserPayment counters.
- **Fee model**: added net/gross modes, custom per-gateway protocol fee, combined-bps guard, referral pool math.
- **Referral program**: 6-char codes, 3-tier chain split, gateway-scoped PDAs.
- **Gateway feature flags**: documented all 3 bits (referral, net amount, custom protocol fee).
- **Workspaces**: added packages/lighthouse (vendored), corrected app list with versions.
- **Testing**: documented the Surfpool requirement + full test matrix (5 suites).
- **Deployment**: verifiable builds, buffer deploys, CI change-detection pipeline, ghcr.io Docker.
- **Security**: flagged the validation CPI dispatcher as a no-op stub (reports H-05) with a CAUTION admonition.
- **CLI**: documented oclif topics (wallet/program/user/gateway/subscription/payments/referral/pda).
- Added admonitions, ToC, accurate version table, and fixed the deployment scripts to match the actual Makefile.
