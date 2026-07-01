//! Create-time validators for each `PolicyType` variant.
//!
//! Execute-time validation + schedule advancement live in
//! [`crate::shared::schedule`] (`validate_policy_execution`,
//! `advance_policy`), shared by both `execute_payment` and
//! `execute_composable`. There is no per-strategy trait or factory here —
//! dispatch is a single `match` over `PolicyType` in one place.

pub mod milestone;
pub mod one_time;
pub mod pay_as_you_go;
pub mod subscription;
pub mod up_to;

pub use milestone::validate_milestone_policy;
pub use one_time::validate_one_time_policy;
pub use pay_as_you_go::validate_payg_policy;
pub use subscription::validate_subscription_policy;
pub use up_to::validate_up_to_policy;
