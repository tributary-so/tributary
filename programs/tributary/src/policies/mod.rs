//! Create-time validators for each `PolicyType` variant.
//!
//! Execute-time validation + schedule advancement live in
//! [`crate::shared::schedule`] (`validate_policy_execution`,
//! `advance_policy`), shared by both `execute_payment` and
//! `execute_composable`. There is no per-strategy trait or factory here —
//! dispatch is a single `match` over `PolicyType` in one place.

pub mod milestone;
pub mod pay_as_you_go;
pub mod subscription;

pub use milestone::validate_milestone_policy;
pub use pay_as_you_go::validate_payg_policy;
pub use subscription::validate_subscription_policy;
