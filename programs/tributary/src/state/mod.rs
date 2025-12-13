use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

/// The PolicyType enum implements the payment schemes. The initial policy
/// will be a subscription payment that enables the regular payment according to
/// a schedule.
///
/// IMPORTANT: All variants MUST be exactly 128 bytes to ensure consistent account sizing
/// and enable future enum variant additions without breaking existing accounts.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PolicyType {
    /// Subscription payment model for recurring payments at fixed intervals.
    /// Payments are automatically executed according to the payment_frequency
    /// until max_renewals is reached (if set) or indefinitely if auto_renew is true.
    Subscription {
        amount: u64,                         // 8 bytes
        auto_renew: bool,                    // 1 byte
        max_renewals: Option<u32>,           // 5 bytes (1 + 4)
        payment_frequency: PaymentFrequency, // 9 bytes (1 + 8)
        next_payment_due: i64,               // 8 bytes
        padding: [u8; 97],                   // 97 bytes padding
    },
    /// Milestone-based payment model where funds are held in escrow and released
    /// based on predefined milestones. Supports up to 4 milestones with configurable
    /// release conditions (time-based, manual approval, or automatic).
    Milestone {
        milestone_amounts: [u64; 4],    // 32 bytes - Amount for each milestone
        milestone_timestamps: [i64; 4], // 32 bytes - Absolute timestamps for each milestone
        current_milestone: u8,          // 1 byte - Which milestone is next (0-3)
        release_condition: u8,          // 1 byte - 0=time-based, 1=manual approval, 2=automatic
        total_milestones: u8,           // 1 byte - How many milestones are configured (1-4)
        escrow_amount: u64,             // 8 bytes - Total amount held in escrow
        padding: [u8; 53],              // 53 bytes padding
    },
    /// Pay-as-you-go payment model for AI agents and service providers.
    /// Providers can claim up to max_chunk_amount when they hit usage thresholds,
    /// with a maximum of max_amount_per_period per period. Period resets automatically.
    PayAsYouGo {
        max_amount_per_period: u64, // 8 bytes - Total amount allowed per period
        max_chunk_amount: u64,      // 8 bytes - Max amount provider can claim in one go
        period_length_seconds: u64, // 8 bytes - Length of each period in seconds
        current_period_start: i64,  // 8 bytes - When current period started (unix timestamp)
        current_period_total: u64,  // 8 bytes - Amount claimed in current period so far
        padding: [u8; 88],          // 88 bytes padding
    },
    // Future variants can be added like this:
    // Installment {
    //     total_amount: u64,              // 8 bytes - Maximum amount that can be withdrawn (X$)
    //     num_installments: u32,          // 4 bytes - Number of installments (Y)
    //     installment_amount: u64,        // 8 bytes - Amount per installment (total_amount / num_installments)
    //     period: PaymentFrequency,       // 9 bytes - Frequency of installments (e.g., Monthly)
    //     start_date: i64,                // 8 bytes - When installments begin
    //     next_installment_due: i64,      // 8 bytes - Next payment timestamp
    //     installments_completed: u32,    // 4 bytes - Track progress
    //     padding: [u8; 87],              // 87 bytes padding (total: 8+4+8+9+8+8+4+87=128)
    // },
    // OneTime {
    //     amount: u64,                // 8 bytes
    //     due_date: i64,              // 8 bytes
    //     grace_period_seconds: u64,  // 8 bytes
    //     padding: [u8; 104],        // 104 bytes padding
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
                require!(*amount > 0, crate::error::TributaryError::InvalidAmount);

                // Validate payment frequency
                payment_frequency.validate()?;

                // Validate max_renewals if set (must be greater than 0)
                if let Some(renewals) = max_renewals {
                    require!(*renewals > 0, crate::error::TributaryError::InvalidInterval);
                }
            }
            PolicyType::Milestone {
                milestone_amounts,
                milestone_timestamps,
                current_milestone,
                release_condition,
                total_milestones,
                escrow_amount,
                ..
            } => {
                // Validate total_milestones is between 1 and 4
                require!(
                    *total_milestones >= 1 && *total_milestones <= 4,
                    crate::error::TributaryError::InvalidAmount
                );

                // Validate current_milestone is within bounds
                require!(
                    *current_milestone < *total_milestones,
                    crate::error::TributaryError::InvalidAmount
                );

                // Validate escrow_amount is greater than zero
                require!(
                    *escrow_amount > 0,
                    crate::error::TributaryError::InvalidAmount
                );

                // Validate milestone amounts are greater than zero
                for i in 0..*total_milestones as usize {
                    require!(
                        milestone_amounts[i] > 0,
                        crate::error::TributaryError::InvalidAmount
                    );
                }

                // Validate timestamps are in the future (basic check)
                #[cfg(feature = "mainnet")]
                {
                    // only on mainnet, simplifies testing
                    let current_time = Clock::get()?.unix_timestamp;
                    for i in 0..*total_milestones as usize {
                        require!(
                            milestone_timestamps[i] > current_time,
                            crate::error::TributaryError::InvalidInterval
                        );
                    }
                }

                // Validate release_condition is valid (0, 1, or 2)
                require!(
                    *release_condition <= 2,
                    crate::error::TributaryError::InvalidAmount
                );
            }
            PolicyType::PayAsYouGo {
                max_amount_per_period,
                max_chunk_amount,
                period_length_seconds,
                ..
            } => {
                // Validate max_amount_per_period is greater than zero
                require!(
                    *max_amount_per_period > 0,
                    crate::error::TributaryError::InvalidAmount
                );

                // Validate max_chunk_amount is greater than zero
                require!(
                    *max_chunk_amount > 0,
                    crate::error::TributaryError::InvalidAmount
                );

                // Validate max_chunk_amount is not greater than max_amount_per_period
                require!(
                    *max_chunk_amount <= *max_amount_per_period,
                    crate::error::TributaryError::InvalidAmount
                );

                // Validate period_length_seconds is greater than zero
                require!(
                    *period_length_seconds > 0,
                    crate::error::TributaryError::InvalidInterval
                );
            }
        }
        Ok(())
    }
}

/// Status enum for payment policies indicating whether payments can be executed.
/// Active policies allow payment execution, while Paused policies prevent
/// automatic payment processing until reactivated.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentStatus {
    /// Policy is active and payments can be executed
    Active,
    /// Policy is paused and payments cannot be executed
    Paused,
}

/// Defines the frequency at which recurring payments should occur.
/// Predefined intervals are provided for common use cases, with Custom
/// allowing arbitrary intervals defined in seconds.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentFrequency {
    /// Payment occurs every day
    Daily,
    /// Payment occurs every week
    Weekly,
    /// Payment occurs every month
    Monthly,
    /// Payment occurs every quarter (3 months)
    Quarterly,
    /// Payment occurs twice per year (6 months)
    SemiAnnually,
    /// Payment occurs once per year
    Annually,
    /// Custom payment interval defined in seconds
    Custom(u64),
}

impl PaymentFrequency {
    /// Validates the payment frequency
    pub fn validate(&self) -> Result<()> {
        match self {
            PaymentFrequency::Custom(interval) => {
                require!(
                    *interval > 0,
                    crate::error::TributaryError::InvalidFrequency
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
///
/// IMPORTANT: All variants MUST be exactly 128 bytes to ensure consistent account sizing
/// and enable future enum variant additions without breaking existing accounts.
#[account]
pub struct UserPayment {
    /// Owner of this payment account (the user)
    pub owner: Pubkey,
    /// Associated token account for the payment token
    pub token_account: Pubkey,
    /// Mint address of the token used for payments
    pub token_mint: Pubkey,
    /// Number of active payment policies for this user/mint combination
    pub active_policies_count: u32,
    /// Total number of policies ever created for this user/mint combination
    /// This field only increases and is used to prevent policy ID reuse
    pub created_policies_count: u32,
    /// Unix timestamp when account was created
    pub created_at: i64,
    /// Unix timestamp when account was last updated
    pub updated_at: i64,
    /// Whether this payment account is active
    pub is_active: bool,
    /// PDA bump seed for address derivation
    pub bump: u8,
    /// Reserved space for future extensions
    pub padding: [u8; 252],
}

impl UserPayment {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner: Pubkey
        32 + // token_account: Pubkey
        32 + // token_mint: Pubkey
        4 + // active_policies_count: u32
        4 + // created_policies_count: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        1 + // is_active: bool
        1 + // bump: u8
        252; // padding: [u8; 252]
}

/// A payment gateway operated by a service provider that executes recurring payments.
/// Gateway operators can charge fees for their service and are responsible for
/// triggering payment execution. Each gateway has an authority (owner), fee recipient,
/// and signer key used to execute payments on behalf of users.
#[account]
pub struct PaymentGateway {
    /// Authority key that owns this gateway. Cannot be changed after creation.
    pub authority: Pubkey,
    /// Key that receives gateway fees from processed payments
    pub fee_recipient: Pubkey,
    /// Gateway fee in basis points (bps). Max 10,000 (100%)
    pub gateway_fee_bps: u16,
    /// Whether this gateway is active and can process payments
    pub is_active: bool,
    /// Total amount processed by this gateway (cumulative)
    pub total_processed: u64,
    /// Unix timestamp when gateway was created
    pub created_at: i64,
    /// PDA bump seed for address derivation
    pub bump: u8,
    /// Human-readable gateway name (32 bytes max)
    pub name: [u8; 32],
    /// Gateway service URL (64 bytes max)
    pub url: [u8; 64],
    /// Signer key authorized to execute payments for this gateway
    pub signer: Pubkey,
    pub padding: [u8; 128],
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
        32 + // signer: Pubkey
        128; // padding: [u8; 160]
}

/// This structure connects a UserPayment (user/mint) with a Policy, a Gateway.
/// This is the structure that actually specifies the subscription payment as you would
/// expect from an invoice. The SDK would setup these PaymentPolicy
#[account]
pub struct PaymentPolicy {
    /// Reference to the UserPayment account this policy belongs to
    pub user_payment: Pubkey,
    /// Recipient who receives the payments
    pub recipient: Pubkey,
    /// Payment gateway responsible for executing this policy
    pub gateway: Pubkey,
    /// Type and parameters of this payment policy
    pub policy_type: PolicyType,
    /// Current status of this payment policy
    pub status: PaymentStatus,
    /// Human-readable memo/description (64 bytes max)
    pub memo: [u8; 64],
    /// Total amount paid out under this policy (cumulative)
    pub total_paid: u64,
    /// Number of payments executed under this policy
    pub payment_count: u32,
    /// Unix timestamp when policy was created
    pub created_at: i64,
    /// Unix timestamp when policy was last updated
    pub updated_at: i64,
    /// Unique identifier for this policy within the user_payment scope
    pub policy_id: u32,
    /// PDA bump seed for address derivation
    pub bump: u8,
    /// Reserved space for future extensions
    pub padding: [u8; 255],
}

impl PaymentPolicy {
    pub const SIZE: usize = 8 + // discriminator
        32 + // user_payment: Pubkey
        32 + // recipient: Pubkey
        32 + // gateway: Pubkey
        PolicyType::TOTAL_SIZE + // policy type size (includes enum discriminator)
        1 + // status: PaymentStatus
        64 + // memo: [u8; 64]
        8 + // total_paid: u64
        4 + // payment_count: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        4 + // policy_id: u32
        1 + // bump: u8
        255; // padding: [u8; 255]
}

/// This is a unique global program configuration managed by an admin that
/// defines the protocol fees and potentially more.
#[account]
pub struct ProgramConfig {
    /// Admin authority that can update protocol configuration
    pub admin: Pubkey,
    /// Key that receives protocol fees from all payments
    pub fee_recipient: Pubkey,
    /// Protocol fee in basis points (bps). Max 10,000 (100%)
    pub protocol_fee_bps: u16,
    /// Maximum number of active policies allowed per user
    pub max_policies_per_user: u32,
    /// Emergency pause flag - when true, all payments are blocked
    pub emergency_pause: bool,
    /// PDA bump seed for address derivation
    pub bump: u8,
    /// Reserved space for future extensions
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

/// An event that is thrown when the program is initialized
#[event]
pub struct ProgramConfigCreated {
    pub admin: Pubkey,
    pub fee_recipient: Pubkey,
    pub protocol_fee_bps: u16,
    pub max_policies_per_user: u32,
}

/// An event that is thrown when a user payment account is created
#[event]
pub struct UserPaymentCreated {
    pub owner: Pubkey,
    pub token_account: Pubkey,
    pub token_mint: Pubkey,
}

/// An event that is thrown when a payment gateway is created
#[event]
pub struct PaymentGatewayCreated {
    pub authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub gateway_fee_bps: u16,
    pub name: [u8; 32],
    pub url: [u8; 64],
}

/// An event that is thrown when a payment policy is created
#[event]
pub struct PaymentPolicyCreated {
    pub user_payment: Pubkey,
    pub recipient: Pubkey,
    pub gateway: Pubkey,
    pub policy_id: u32,
    pub policy_type: PolicyType,
    pub memo: [u8; 64],
    pub created_policies_count: u32,
}

/// An event that is thrown when a gateway signer is changed
#[event]
pub struct GatewaySignerChanged {
    pub gateway: Pubkey,
    pub old_signer: Pubkey,
    pub new_signer: Pubkey,
}

/// An event that is thrown when a gateway fee recipient is changed
#[event]
pub struct GatewayFeeRecipientChanged {
    pub gateway: Pubkey,
    pub old_fee_recipient: Pubkey,
    pub new_fee_recipient: Pubkey,
}

/// An event that is thrown when a payment policy status is changed
#[event]
pub struct PaymentPolicyStatusChanged {
    pub payment_policy: Pubkey,
    pub old_status: PaymentStatus,
    pub new_status: PaymentStatus,
}

/// An event that is thrown when a payment policy is deleted
#[event]
pub struct PaymentPolicyDeleted {
    pub payment_policy: Pubkey,
    pub owner: Pubkey,
    pub policy_id: u32,
}

/// An event that is thrown when a payment gateway is deleted
#[event]
pub struct PaymentGatewayDeleted {
    pub gateway: Pubkey,
    pub authority: Pubkey,
    pub name: [u8; 32],
}
