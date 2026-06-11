use super::payment_policy::PaymentFrequency;
use anchor_lang::prelude::*;

pub const COMPOSABLE_DISCRIMINATOR: u8 = 1;
pub const COMPOSABLE_VERSION: u8 = 1;
pub const MAX_BYTE_RANGE_CHECKS: usize = 4;
pub const VALIDATION_DATA_SIZE: usize = 128;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct ByteRangeCheck {
    pub offset: u8,
    pub length: u8,
    pub expected: [u8; 8],
}

impl ByteRangeCheck {
    pub fn validate(&self, instruction_data: &[u8]) -> bool {
        if self.offset as usize + self.length as usize > instruction_data.len() {
            return false;
        }
        let start = self.offset as usize;
        let end = start + self.length as usize;
        &instruction_data[start..end] == &self.expected[..self.length as usize]
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ScheduleType {
    Timed {
        amount: u64,
        auto_renew: bool,
        max_executions: Option<u32>,
        frequency: PaymentFrequency,
        next_execution_due: i64,
    },
    Milestone {
        amounts: [u64; 4],
        timestamps: [i64; 4],
        current: u8,
        release_condition: u8,
        total: u8,
    },
    Usage {
        max_amount_per_period: u64,
        max_chunk_amount: u64,
        period_length_seconds: u64,
        current_period_start: i64,
        current_period_total: u64,
    },
}

impl ScheduleType {
    pub fn validate(&self) -> Result<()> {
        match self {
            ScheduleType::Timed {
                amount,
                frequency,
                max_executions,
                ..
            } => {
                require!(*amount > 0, crate::error::TributaryError::InvalidAmount);
                frequency.validate()?;
                if let Some(max) = max_executions {
                    require!(*max > 0, crate::error::TributaryError::InvalidAmount);
                }
                Ok(())
            }
            ScheduleType::Milestone {
                amounts,
                timestamps,
                current,
                total,
                ..
            } => {
                require!(
                    *total >= 1 && *total <= 4,
                    crate::error::TributaryError::InvalidAmount
                );
                require!(*current == 0, crate::error::TributaryError::InvalidAmount);
                for i in 0..*total as usize {
                    require!(amounts[i] > 0, crate::error::TributaryError::InvalidAmount);
                    if i > 0 {
                        require!(
                            timestamps[i] > timestamps[i - 1],
                            crate::error::TributaryError::InvalidPaymentDueDate
                        );
                    }
                }
                Ok(())
            }
            ScheduleType::Usage {
                max_amount_per_period,
                max_chunk_amount,
                period_length_seconds,
                ..
            } => {
                require!(
                    *max_amount_per_period > 0,
                    crate::error::TributaryError::InvalidAmount
                );
                require!(
                    *max_chunk_amount > 0,
                    crate::error::TributaryError::InvalidAmount
                );
                require!(
                    *max_chunk_amount <= *max_amount_per_period,
                    crate::error::TributaryError::InvalidAmount
                );
                require!(
                    *period_length_seconds > 0,
                    crate::error::TributaryError::InvalidInterval
                );
                Ok(())
            }
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct ForwardConfig {
    pub target_program: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub min_output_amount: Option<u64>,
    pub forward_flags: u8,
    pub num_data_checks: u8,
    pub data_checks: [ByteRangeCheck; MAX_BYTE_RANGE_CHECKS],
}

impl ForwardConfig {
    pub const SIZE: usize = 32 + // target_program: Pubkey
        32 + // input_mint: Pubkey
        32 + // output_mint: Pubkey
        9 + // min_output_amount: Option<u64>
        1 + // forward_flags: u8
        1 + // num_data_checks: u8
        (1 + 1 + 8) * MAX_BYTE_RANGE_CHECKS; // data_checks: [ByteRangeCheck; 4]
                                             // = 146 bytes
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct ValidationConfig {
    pub validation_program: Pubkey,
    pub num_validation_accounts: u8,
    pub validation_data_len: u16,
    pub validation_data: [u8; VALIDATION_DATA_SIZE],
}

impl ValidationConfig {
    pub const SIZE: usize = 32 + // validation_program: Pubkey
        1 + // num_validation_accounts: u8
        2 + // validation_data_len: u16
        VALIDATION_DATA_SIZE; // validation_data: [u8; 128]
                              // = 163 bytes
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            validation_program: Pubkey::default(),
            num_validation_accounts: 0,
            validation_data_len: 0,
            validation_data: [0u8; VALIDATION_DATA_SIZE],
        }
    }
}

#[account]
pub struct ComposablePolicy {
    pub discriminator: u8,
    pub version: u8,
    pub bump: u8,
    pub user_payment: Pubkey,
    pub gateway: Pubkey,
    pub status: super::policy_header::PolicyStatus,
    pub rent_payer: Pubkey,
    pub schedule: ScheduleType,
    pub memo: [u8; 64],
    pub forward_config: ForwardConfig,
    pub validation_config: ValidationConfig,
    pub recipient: Pubkey,
    pub total_input: u64,
    pub total_output: u64,
    pub payment_count: u32,
    pub policy_id: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub state_padding: [u8; 32],
    pub padding: [u8; 74],
}

impl ComposablePolicy {
    pub const SIZE: usize = 8 + // Anchor discriminator
        1 + // discriminator: u8
        1 + // version: u8
        1 + // bump: u8
        32 + // user_payment: Pubkey
        32 + // gateway: Pubkey
        1 + // status: PolicyStatus
        32 + // rent_payer: Pubkey
        // ScheduleType max size (Timed variant is largest)
        (1 + 8 + 1 + 5 + 9 + 8) + // ScheduleType::Timed
        64 + // memo: [u8; 64]
        ForwardConfig::SIZE + // forward_config
        ValidationConfig::SIZE + // validation_config
        32 + // recipient: Pubkey
        8 + // total_input: u64
        8 + // total_output: u64
        4 + // payment_count: u32
        4 + // policy_id: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        32 + // state_padding: [u8; 32]
        74; // padding: [u8; 74]
            // ≈ 760 bytes total
}
