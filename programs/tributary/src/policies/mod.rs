pub mod milestone;
pub mod pay_as_you_go;
pub mod subscription;
pub mod traits;

pub use milestone::{validate_milestone_policy, MilestoneStrategy};
pub use pay_as_you_go::{validate_payg_policy, PayAsYouGoStrategy};
pub use subscription::{validate_subscription_policy, SubscriptionStrategy};
pub use traits::*;

use crate::state::{PaymentPolicy, PolicyType};
use anchor_lang::prelude::*;

/// Factory function to get appropriate strategy for policy type
pub fn get_policy_strategy(payment_policy: &PaymentPolicy) -> Result<Box<dyn PolicyStrategy>> {
    match &payment_policy.policy_type {
        PolicyType::Subscription { .. } => Ok(Box::new(SubscriptionStrategy)),
        PolicyType::Milestone { .. } => Ok(Box::new(MilestoneStrategy)),
        PolicyType::PayAsYouGo { .. } => Ok(Box::new(PayAsYouGoStrategy)),
    }
}
