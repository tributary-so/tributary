---
# tributary-msk8
title: Composable Pull Payments - Phase 1 Implementation
status: todo
type: epic
priority: high
created_at: 2026-06-10T18:43:39Z
updated_at: 2026-06-10T18:43:39Z
---

Implement composable pull payments per COMPOSABLE.md spec. New ComposablePolicy account type, execute_composable instruction with validation CPI + forward CPI, shared utilities, SDK support, and full test coverage.

## Prerequisites

- [ ] MIGRATION.md: Document delegate migration path (UserPayment PDA as signing authority)
- [ ] UserPayment account: Add composable counters from padding (delegate_version, active_composable_count, created_composable_count)
- [ ] Feature flag on PaymentGateway for composable enablement

## Phase 1: Foundation (Shared Types & State)

- [ ] Add COMPOSABLE_POLICY_SEED constant
- [ ] Create state/policy_header.rs (PolicyHeader, PolicyStatus)
- [ ] Create state/composable_policy.rs (ComposablePolicy, ScheduleType, ForwardConfig, ValidationConfig, ByteRangeCheck, ExecutionState)
- [ ] Update UserPayment struct — consume 11 bytes from padding for composable counters + delegate_version
- [ ] Add composable-specific error variants to error.rs
- [ ] Add whitelist constants (ALLOWED_FORWARD_PROGRAMS, ALLOWED_VALIDATION_PROGRAMS)

## Phase 2: Shared Utilities

- [ ] Create shared/mod.rs, shared/fees.rs — extract fee calculation from execute_payment
- [ ] Create shared/strategies.rs — extract schedule validation (ScheduleType mirrors PolicyType logic)
- [ ] Create shared/delegation.rs — extract delegate amount checks
- [ ] Create shared/validation.rs — validation CPI dispatch logic

## Phase 3: Instructions

- [ ] Create instructions/composable/mod.rs
- [ ] create_composable_policy — validates ForwardConfig, ScheduleType, optional ValidationConfig
- [ ] execute_composable — 10-step flow: validate → validation CPI → fees → claim input → ensure output ATA → forward CPI → sweep output → cleanup → update state
- [ ] delete_composable_policy — close account, return rent
- [ ] change_composable_status — pause/resume/complete transitions

## Phase 4: Wire Up

- [ ] Update state/mod.rs to export new types
- [ ] Update instructions/mod.rs to export composable module
- [ ] Update lib.rs with new instruction handlers
- [ ] Add events for composable execution (ComposableExecutionRecord)

## Phase 5: SDK

- [ ] Add ComposablePolicy types to SDK
- [ ] Add createComposablePolicy, executeComposable, deleteComposablePolicy, changeComposableStatus methods
- [ ] PDA derivation helpers for composable_policy seeds
- [ ] CLI commands for composable operations

## Phase 6: Tests

- [ ] Unit tests for ScheduleType validation (mirrors subscription/milestone/payg)
- [ ] Unit tests for ByteRangeCheck validation
- [ ] Integration test: create composable policy (timed schedule, no validation)
- [ ] Integration test: execute_composable — basic forward CPI
- [ ] Integration test: validation CPI (Lighthouse mock) — pass + fail
- [ ] Integration test: fee distribution (protocol + gateway)
- [ ] Integration test: slippage protection (min_output_amount)
- [ ] Integration test: account cleanup (intermediate ATA close)
- [ ] Integration test: edge cases — insufficient delegation, paused policy, wrong byte-range check

## Dependencies

- Each phase depends on the prior phase completing
- Phase 5 (SDK) can start once Phase 3 instructions are stable
- Phase 6 (Tests) runs in parallel with Phase 5
