---
# tributary-46lx
title: '#5 Short-circuit resolveValidationTargets when both ValidationSpecs Disabled'
status: todo
type: task
priority: normal
created_at: 2026-07-21T09:24:26Z
updated_at: 2026-07-21T09:25:10Z
parent: tributary-ben2
---

assigned: implementer

## Problem

apps/scheduler/src/composable.ts:475-490 in fire() unconditionally calls resolveValidationTargets TWICE per fire (pre + post), even when both preValidation and postValidation are ValidationSpec::Disabled. Each call hits the RPC (getMultipleAccountsInfo on the ValidationPda + targets). For the common case of a composable with no validation hooks, this is 2 wasted RPCs per fire.

Compounds with bug #1: 100 dups x 2 wasted calls = 200 wasted RPCs per tick on a policy that should never touch validation.

## Fix

Guard the calls:

  const [preTargets, postTargets] = await Promise.all([
    isValidationEnabled(policy.account.preValidation)
      ? resolveValidationTargets(this.sdk.connection, policy.publicKey, policy.account.preValidation, this.sdk.programId, 'pre')
      : [],
    isValidationEnabled(policy.account.postValidation)
      ? resolveValidationTargets(this.sdk.connection, policy.publicKey, policy.account.postValidation, this.sdk.programId, 'post')
      : [],
  ]);

Check if @tributary-so/sdk already exports an isValidationEnabled helper (it exports isForwardEnabled used at composable.ts:456 - mirror that). If not, add one: ValidationSpec::Disabled variant check. Don't compare against SystemProgram directly (sentinel semantics differ between ValidationSpec and ForwardConfig per ADR-0021).

assembleComposableRemainingAccounts already handles empty arrays correctly - no downstream change needed.

## Acceptance

- For a policy with both validations disabled: confirm via debug log that resolveValidationTargets is NOT called.
- For a policy with preValidation enabled only: confirm only pre call happens.
- Existing happy-path tests (tests/topup-balance*.test.ts) still pass.



## Tags

scheduler, ops
