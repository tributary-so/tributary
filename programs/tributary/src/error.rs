use anchor_lang::prelude::*;

#[error_code]
pub enum TributaryError {
    #[msg("Program is paused")]
    ProgramPaused,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Invalid payment frequency")]
    InvalidFrequency,
    #[msg("Maximum policies per user reached")]
    MaxPoliciesReached,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid policy status transition")]
    InvalidPolicyStatusTransition,
    #[msg("Payment policy not found")]
    PolicyNotFound,
    #[msg("Insufficient delegated amount")]
    InsufficientDelegatedAmount,
    #[msg("Payment is not yet due")]
    PaymentNotDue,
    #[msg("Insufficient balance for payment")]
    InsufficientBalance,
    #[msg("No or incorrect delegate set in ata")]
    NoDelegateSet,
    #[msg("Payment policy is paused")]
    PolicyPaused,
    #[msg("Invalid Interval")]
    InvalidInterval,
    #[msg("Invalid fee basis points")]
    InvalidFeeBps,
    #[msg("Invalid payment due date")]
    InvalidPaymentDueDate,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Referral program feature is not enabled")]
    ReferralFeatureNotEnabled,
    #[msg("Invalid referral allocation - must be <= 2500 bps")]
    InvalidReferralAllocation,
    #[msg("Invalid referral tiers - must sum to 10000 bps")]
    InvalidReferralTiers,
    #[msg("Could not deserialize referrer account")]
    CouldNotDeserializeReferrer,
    #[msg("Referrer account must be writable")]
    ReferrerMustBeWritable,
    #[msg("Circular referral chain detected")]
    CircularReferralChain,
    #[msg("Maximum referral chain depth exceeded")]
    MaxReferralDepthExceeded,
    #[msg("Invalid referral chain ordering in remaining_accounts")]
    InvalidReferralChainOrdering,
    #[msg("Invalid referral account discriminator")]
    InvalidReferralAccountDiscriminator,
    #[msg("Referral account size mismatch")]
    ReferralAccountSizeMismatch,
    #[msg("Invalid referral code - must be alphanumeric")]
    InvalidReferralCode,
}
