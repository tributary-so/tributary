# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Breaking:** `PaymentRecord.record_id` now reflects the post-increment
  `payment_count` (was pre-increment). The first execution of a policy emits
  `record_id = 1` instead of `0`. This honors `Subscription::max_renewals`
  ceilings exactly, since the counter is now incremented inside
  `strategy.execute()` (see `programs/tributary/src/policies/traits.rs`)
  before `should_pause_policy` is evaluated. Off-chain indexers that assumed
  0-indexed records must add 1 to historical data or display
  `payment_count - 1` for backward compatibility.
