use super::policy_status::PolicyStatus;
use anchor_lang::prelude::*;

/// Bitmap flags for milestone release conditions.///
/// Bit layout:
///   - Bit 0 (0b0001): Check due date before release
///   - Bit 1 (0b0010): Gateway authority must sign
///   - Bit 2 (0b0100): Policy owner must sign
///   - Bit 3 (0b1000): Recipient must sign
///
/// Bits 1-3 are mutually exclusive (at most one may be set).
/// A value of 0 means no restrictions - anyone can trigger anytime.
pub const RELEASE_DUE_DATE: u8 = 0b0001;
pub const RELEASE_GATEWAY: u8 = 0b0010;
pub const RELEASE_OWNER: u8 = 0b0100;
pub const RELEASE_RECIPIENT: u8 = 0b1000;

/// Defines frequency at which recurring payments should occur.
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

/// The PolicyType enum implements different payment schemes. The initial policy
/// will be a subscription payment that enables regular payment according to
/// a schedule.
///
/// IMPORTANT: All variants MUST be exactly 128 bytes to ensure consistent account sizing
/// and enable future enum variant additions without breaking existing accounts.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PolicyType {
    /// Subscription payment model for recurring payments at fixed intervals.
    /// Payments are automatically executed according to payment_frequency
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
    /// release conditions via bitmap (see RELEASE_* constants).
    Milestone {
        milestone_amounts: [u64; 4],    // 32 bytes - Amount for each milestone
        milestone_timestamps: [i64; 4], // 32 bytes - Absolute timestamps for each milestone
        current_milestone: u8,          // 1 byte - Which milestone is next (0-3)
        release_condition: u8, // 1 byte - Bitmap: bit0=check due date, bits1-3=signer requirement
        total_milestones: u8,  // 1 byte - How many milestones are configured (1-4)
        escrow_amount: u64,    // 8 bytes - Total amount held in escrow
        padding: [u8; 53],     // 53 bytes padding
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
    /// One-time fixed-amount pull payment. Fires exactly once, then the policy
    /// transitions to `Completed`. `due_date <= 0` means immediately executable;
    /// `expiry_date = None` means the policy never expires. Flows through the
    /// full gateway machinery (fees, referrals, composable hooks) — see ADR-0019.
    OneTime {
        amount: u64,              // 8 bytes  — fixed payment amount, must be > 0
        due_date: i64,            // 8 bytes  — earliest execution; <= 0 = immediate
        expiry_date: Option<i64>, // 9 bytes  (1 + 8) — None = never expires
        padding: [u8; 103],       // 103 bytes padding (total: 8+8+9+103 = 128)
    },
    /// Single-use, time-bound authorization to transfer up to `max_amount`.
    /// The actual settled amount is caller-supplied at execute time (determined
    /// by the resource server after usage); `0 <= actual <= max_amount` is
    /// enforced on-chain. `valid_after <= 0` means immediate; `deadline` is
    /// mandatory (x402 `upto` scheme). Always transitions to `Completed` after
    /// one settlement. Recipient-triggerable like PayAsYouGo. See ADR-0020.
    UpTo {
        max_amount: u64,    // 8 bytes  — ceiling on the settlement amount
        valid_after: i64,   // 8 bytes  — earliest settlement; <= 0 = immediate
        deadline: i64,      // 8 bytes  — hard expiry, MUST be > 0 and > valid_after
        padding: [u8; 104], // 104 bytes padding (total: 8+8+8+104 = 128)
    },
}

impl PolicyType {
    /// Each variant must be exactly this size (excluding enum discriminator)
    pub const VARIANT_SIZE: usize = 128;

    /// Total size including enum discriminator
    pub const TOTAL_SIZE: usize = 1 + Self::VARIANT_SIZE; // 129 bytes

    /// Validates policy type and its parameters
    pub fn validate(&self) -> Result<()> {
        match self {
            PolicyType::Subscription {
                amount,
                payment_frequency,
                max_renewals,
                ..
            } => crate::policies::validate_subscription_policy(
                *amount,
                payment_frequency,
                max_renewals,
            ),
            PolicyType::Milestone {
                milestone_amounts,
                current_milestone,
                release_condition,
                total_milestones,
                escrow_amount,
                milestone_timestamps,
                ..
            } => crate::policies::validate_milestone_policy(
                milestone_amounts,
                *current_milestone,
                *release_condition,
                *total_milestones,
                *escrow_amount,
                milestone_timestamps,
            ),
            PolicyType::PayAsYouGo {
                max_amount_per_period,
                max_chunk_amount,
                period_length_seconds,
                ..
            } => crate::policies::validate_payg_policy(
                *max_amount_per_period,
                *max_chunk_amount,
                *period_length_seconds,
            ),
            PolicyType::OneTime {
                amount,
                due_date,
                expiry_date,
                ..
            } => crate::policies::validate_one_time_policy(*amount, *due_date, *expiry_date),
            PolicyType::UpTo {
                max_amount,
                valid_after,
                deadline,
                ..
            } => crate::policies::validate_up_to_policy(*max_amount, *valid_after, *deadline),
        }
    }
}

/// This structure connects a UserPayment (user/mint) with a Policy, a Gateway.
/// This is structure that actually specifies subscription payment as you would
/// expect from an invoice. The SDK would setup these PaymentPolicy
#[account]
pub struct PaymentPolicy {
    /// Reference to the UserPayment account this policy belongs to
    pub user_payment: Pubkey,
    /// Recipient who receives payments
    pub recipient: Pubkey,
    /// Payment gateway responsible for executing this policy
    pub gateway: Pubkey,
    /// Type and parameters of this payment policy
    pub policy_type: PolicyType,
    /// Current status of this payment policy (Active | Paused | Completed).
    /// `Completed` is terminal and set only by the program when the policy is
    /// exhausted; owners may only toggle Active<->Paused.
    pub status: PolicyStatus,
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
    /// Unique identifier for this policy within user_payment scope
    pub policy_id: u32,
    /// PDA bump seed for address derivation
    pub bump: u8,
    /// Account that paid rent for this account (receives rent on close)
    pub rent_payer: Pubkey,
    /// Reserved space for future extensions
    pub padding: [u8; 223],
}

impl PaymentPolicy {
    pub const SIZE: usize = 8 + // discriminator
        32 + // user_payment: Pubkey
        32 + // recipient: Pubkey
        32 + // gateway: Pubkey
        PolicyType::TOTAL_SIZE + // policy type size (includes enum discriminator)
        1 + // status: PolicyStatus
        64 + // memo: [u8; 64]
        8 + // total_paid: u64
        4 + // payment_count: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        4 + // policy_id: u32
        1 + // bump: u8
        32 + // rent_payer: Pubkey
        223; // padding: [u8; 223]
}
