# Specs

The accounts are defined like this:

```rust
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentPolicy {
    Subscription {
        amount: u64,
        interval_seconds: u64,
        auto_renew: bool,
        max_renewals: Option<u32>, // None for unlimited
    },
    // Installment {
    //     total_amount: u64,
    //     installment_amount: u64,
    //     interval_seconds: u64,
    //     remaining_installments: u32,
    // },
    // UsageBased {
    //     max_amount_per_period: u64,
    //     billing_interval_seconds: u64,
    //     usage_multiplier: u64, // For calculating variable amounts
    //     base_amount: u64, // Minimum charge per period
    // },
    // MembershipDues {
    //     amount: u64,
    //     interval_seconds: u64,
    //     grace_period_seconds: u64,
    //     auto_renew: bool,
    // },
    // AutoBillPay {
    //     max_amount: u64, // Maximum allowed per payment
    //     min_amount: u64, // Minimum expected per payment
    //     billing_interval_seconds: u64,
    //     variable_amount: bool,
    // },
    // StandingOrder {
    //     amount: u64,
    //     interval_seconds: u64,
    //     end_date: Option<i64>, // Unix timestamp, None for indefinite
    // },
    // Retainer {
    //     amount: u64,
    //     interval_seconds: u64,
    //     service_hours_included: u32,
    //     overage_rate: u64, // Rate per hour for additional services
    // },
    // Donation {
    //     suggested_amount: u64,
    //     min_amount: u64,
    //     interval_seconds: u64,
    //     allow_variable: bool,
    // },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentStatus {
    Active,
    Paused,
    Cancelled,
    Completed,
    Overdue,
    PendingActivation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PaymentFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    SemiAnnually,
    Annually,
    Custom(u64), // Custom interval in seconds
}

// ===== ACCOUNT STRUCTURES =====

/// Master account that tracks user's recurring payment setup for a specific token
#[account]
pub struct UserPayment {
    pub owner: Pubkey,                    // User who owns this account
    pub token_account: Pubkey,            // User's token ATA (any SPL token)
    pub token_mint: Pubkey,               // The mint of the token being used
    // pub delegate_authority: Pubkey,    // The smart contract's authority - this is part of the token_account
    // pub total_delegated_amount: u64,   // Total amount delegated to contract - this can be extracted from the token_account
    pub active_policies_count: u32,       // Number of active payment policies
    pub created_at: i64,                  // Creation timestamp
    pub updated_at: i64,                  // Last update timestamp
    pub is_active: bool,                  // Whether the account is active
    pub bump: u8,                         // PDA bump seed
}

/// Payment Gateway account that represents an authorized payment processor
#[account]
pub struct PaymentGateway {
    pub authority: Pubkey,                // Gateway admin/owner
    pub fee_recipient: Pubkey,            // Where gateway fees go
    pub gateway_fee_bps: u16,             // Gateway's fee in basis points
    pub is_active: bool,                  // Whether gateway is approved/active
    pub total_processed: u64,             // Total number of payments processed
    pub created_at: i64,                  // Creation timestamp
    pub bump: u8,                         // PDA bump seed
}

/// Individual payment policy instance
#[account]
pub struct PaymentPolicy {
    pub user_payment_account: Pubkey,     // Reference to user's master account
    pub recipient: Pubkey,                // Who receives the payments
    pub gateway: Pubkey,                  // The payment gateway that created this policy
    pub policy_type: PaymentPolicy,       // The specific policy configuration
    pub status: PaymentStatus,            // Current status of this payment
    pub payment_frequency: PaymentFrequency,  // Frequency at which the payment becomes due
    pub next_payment_due: i64,            // Next payment timestamp
    pub total_paid: u64,                  // Total amount paid through this policy
    pub payment_count: u32,               // Number of payments made
    pub failed_payment_count: u32,        // Number of failed payment attempts
    pub created_at: i64,                  // Creation timestamp
    pub updated_at: i64,                  // Last update timestamp
    pub policy_id: u32,                   // Unique ID for this policy instance
    pub bump: u8,                         // PDA bump seed
}

/// Global program configuration
#[account]
pub struct ProgramConfig {
    pub admin: Pubkey,                    // admin pubkey
    pub fee_recipient: Pubkey,            // Where protocol fees go
    pub protocol_fee_bps: u16,            // Protocol fee in basis points (100 = 1%)
    pub min_payment_amount: u64,          // Minimum payment amount
    pub max_payment_amount: u64,          // Maximum payment amount
    pub max_policies_per_user: u32,       // Maximum policies per user
    pub emergency_pause: bool,            // Emergency pause flag
    pub bump: u8,                         // PDA bump seed
}

/// Payment history record, emitted as event
#[event]
pub struct PaymentRecord {
    pub policy_account: Pubkey,           // Reference to the policy account
    pub gateway: Pubkey,                  // Gateway that processed the payment
    pub amount: u64,                      // Amount paid
    pub timestamp: i64,                   // When payment was made
    pub transaction_signature: String,    // Transaction signature for reference
    pub payment_type: String,             // Description of payment type
    pub success: bool,                    // Whether payment was successful
    pub failure_reason: Option<String>,   // Reason for failure if applicable
    pub record_id: u32,                   // Unique record ID
}
```
