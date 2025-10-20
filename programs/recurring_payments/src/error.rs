use anchor_lang::prelude::*;

#[error_code]
pub enum RecurringPaymentsError {
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
}
