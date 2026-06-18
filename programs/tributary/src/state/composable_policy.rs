use super::payment_policy::PolicyType;
use anchor_lang::prelude::*;

pub const MAX_BYTE_RANGE_CHECKS: usize = 4;

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
}

impl ValidationConfig {
    pub const SIZE: usize = 32 + 1; // = 33 bytes
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            validation_program: Pubkey::default(),
            num_validation_accounts: 0,
        }
    }
}

#[account]
pub struct ComposablePolicy {
    pub bump: u8,
    pub user_payment: Pubkey,
    pub gateway: Pubkey,
    pub status: super::policy_header::PolicyStatus,
    pub rent_payer: Pubkey,
    /// Reuses the same `PolicyType` enum as `PaymentPolicy`. Before
    /// unification this was a separate `ScheduleType`; the two were
    /// byte-identical duplicates (see `reports/M-04-inconsistent-month-arithmetic.md`
    /// for the consolidation rationale).
    pub policy_type: PolicyType,
    pub forward_config: ForwardConfig,
    pub validation_config: ValidationConfig,
    pub memo: [u8; 64],
    pub recipient: Pubkey,
    pub total_input: u64,
    pub total_output: u64,
    pub payment_count: u32,
    pub policy_id: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub padding: [u8; 32],
}

impl ComposablePolicy {
    pub const SIZE: usize = 8 + // Anchor discriminator
        1 + // bump: u8
        32 + // user_payment: Pubkey
        32 + // gateway: Pubkey
        1 + // status: PolicyStatus
        32 + // rent_payer: Pubkey
        PolicyType::TOTAL_SIZE + // policy_type (same enum as PaymentPolicy)
        ForwardConfig::SIZE + // forward_config
        ValidationConfig::SIZE + // validation_config
        64 + // memo: [u8; 64]
        32 + // recipient: Pubkey
        8 + // total_input: u64
        8 + // total_output: u64
        4 + // payment_count: u32
        4 + // policy_id: u32
        8 + // created_at: i64
        8 + // updated_at: i64
        32; // padding: [u8; 32]
}
