use anchor_lang::prelude::*;

/// The PolicyType enum implements the payment schemes. The initial policy
/// will be a subscription payment that enables the regular payment according to
/// a schedule.
///
/// IMPORTANT: All variants MUST be exactly 128 bytes to ensure consistent account sizing
/// and enable future enum variant additions without breaking existing accounts.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PolicyType {
    Subscription {
        amount: u64,                         // 8 bytes
        auto_renew: bool,                    // 1 byte
        max_renewals: Option<u32>,           // 5 bytes (1 + 4)
        payment_frequency: PaymentFrequency, // 9 bytes (1 + 8)
        next_payment_due: i64,               // 8 bytes
        padding: [u8; 97],                   // 97 bytes padding
    },
    // Future variants can be added like this:
    // OneTime {
    //     amount: u64,                // 8 bytes
    //     due_date: i64,              // 8 bytes
    //     grace_period_seconds: u64,  // 8 bytes
    //     padding: [u8; 104],        // 104 bytes padding
    // },
    // Milestone {
    //     milestones: [u64; 8],       // 64 bytes (8 payments)
    //     intervals: [u64; 8],        // 64 bytes (time intervals)
    //     padding: [u8; 0],          // 0 bytes padding (exactly 128 bytes used)
    // },
}

impl PolicyType {
    /// Each variant must be exactly this size (excluding enum discriminator)
    pub const VARIANT_SIZE: usize = 128;

    /// Total size including enum discriminator
    pub const TOTAL_SIZE: usize = 1 + Self::VARIANT_SIZE; // 129 bytes

    /// Validates the policy type and its parameters
    pub fn validate(&self) -> Result<()> {
        match self {
            PolicyType::Subscription {
                amount,
                payment_frequency,
                max_renewals,
                ..
            } => {
                // Validate amount is greater than zero
                require!(
                    *amount > 0,
                    crate::error::RecurringPaymentsError::InvalidAmount
                );

                // Validate payment frequency
                payment_frequency.validate()?;

                // Validate max_renewals if set (must be greater than 0)
                if let Some(renewals) = max_renewals {
                    require!(
                        *renewals > 0,
                        crate::error::RecurringPaymentsError::InvalidInterval
                    );
                }
            }
        }
        Ok(())
    }
}

/// A status enum for installed payment policies indicating if payment can be made
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentStatus {
    Active,
    Paused,
}

/// Simplify the payment frequency while also allowing a custom period as well,
/// defined in seconds.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    SemiAnnually,
    Annually,
    Custom(u64),
}

impl PaymentFrequency {
    /// Validates the payment frequency
    pub fn validate(&self) -> Result<()> {
        match self {
            PaymentFrequency::Custom(interval) => {
                require!(
                    *interval > 0,
                    crate::error::RecurringPaymentsError::InvalidFrequency
                );
            }
            _ => {}
        }
        Ok(())
    }
}

/// Each owner/authority+mint has a unique UserPayment account.
/// The purpose of this account is to be able to identify quickly
/// some statistics that are valid across *all* payment policies
/// for an authority across a mint.
#[account]
pub struct UserPayment {
    pub owner: Pubkey,
    pub token_account: Pubkey,
    pub token_mint: Pubkey,
    pub active_policies_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_active: bool,
    pub bump: u8,
    pub padding: [u8; 256],
}

impl UserPayment {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner: Pubkey
        32 + // token_account: Pubkey
        32 + // token_mint: Pubkey
        4 + // active_policies_count: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        1 + // is_active: bool
        1 + // bump: u8
        256; // padding: [u8; 256]
}

/// A gateway operator runs the service that triggers payment.
/// Hence, the gateway can take a cut of the fees payed by the users
#[account]
pub struct PaymentGateway {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub gateway_fee_bps: u16,
    pub is_active: bool,
    pub total_processed: u64,
    pub created_at: i64,
    pub bump: u8,
    pub name: [u8; 32],
    pub url: [u8; 64],
    pub padding: [u8; 160],
}

impl PaymentGateway {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority: Pubkey
        32 + // fee_recipient: Pubkey
        2 + // gateway_fee_bps: u16
        1 + // is_active: bool
        8 + // total_processed: u64
        8 + // created_at: i64
        1 + // bump: u8
        32 + // name: [u8; 32]
        64 + // url: [u8; 64]
        160; // padding: [u8; 160]
}

/// This structure connects a UserPayment (user/mint) with a Policy, a Gateway.
/// This is the structure that actually specifies the subscription payment as you would
/// expect from an invoice. The SDK would setup these PaymentPolicy
#[account]
pub struct PaymentPolicy {
    pub user_payment: Pubkey,
    pub recipient: Pubkey,
    pub gateway: Pubkey,
    pub policy_type: PolicyType,
    pub status: PaymentStatus,
    pub memo: [u8; 64],
    pub total_paid: u64,
    pub payment_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub policy_id: u32,
    pub bump: u8,
    pub padding: [u8; 256],
}

impl PaymentPolicy {
    pub const SIZE: usize = 8 + // discriminator
        32 + // user_payment: Pubkey
        32 + // recipient: Pubkey
        32 + // gateway: Pubkey
        PolicyType::VARIANT_SIZE + // policy type size
        1 + // status: PaymentStatus
        64 + // memo: [u8; 64]
        8 + // total_paid: u64
        4 + // payment_count: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        4 + // policy_id: u32
        1 + // bump: u8
        256; // padding: [u8; 256]
}

/// This is a unique global program configuration managed by an admin that
/// defines the protocol fees and potentially more.
#[account]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub fee_recipient: Pubkey,
    pub protocol_fee_bps: u16,
    pub max_policies_per_user: u32,
    pub emergency_pause: bool,
    pub bump: u8,
    pub padding: [u8; 256],
}

impl ProgramConfig {
    pub const SIZE: usize = 8 + // discriminator
        32 + // admin: Pubkey
        32 + // fee_recipient: Pubkey
        2 + // protocol_fee_bps: u16
        4 + // max_policies_per_user: u32
        1 + // emergency_pause: bool
        1 + // bump: u8
        256; // padding: [u8; 256]
}

/// An event that is thrown when a payment takes place
#[event]
pub struct PaymentRecord {
    pub payment_policy: Pubkey,
    pub gateway: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub memo: [u8; 64],
    pub record_id: u32,
}
