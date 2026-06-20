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
        // Defense-in-depth: `expected` is a fixed `[u8; 8]`, so any
        // `length > 8` would panic on the slice below. The create-time
        // guard in `create_composable_policy` rejects `length > 8`, but
        // this fn is reached with state sourced from on-chain accounts —
        // reject the hostile case here too so a malformed account (or a
        // create-time regression) cannot trigger the panic.
        // See reports/H-06-byte-range-check-length-unbounded.md.
        if self.length > 8 {
            return false;
        }
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
    pub status: super::policy_status::PolicyStatus,
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Defense-in-depth: `ByteRangeCheck::validate` must never panic when
    /// `length > 8`. `expected` is a fixed `[u8; 8]`, so slicing
    /// `&self.expected[..self.length]` with `length > 8` is an out-of-
    /// bounds panic. The create-time guard in `create_composable_policy`
    /// rejects `length > 8`, but `validate` is reached with state sourced
    /// from on-chain accounts — a malformed account (or a regression in
    /// create-time validation) must not be able to trigger the panic.
    ///
    /// See reports/H-06-byte-range-check-length-unbounded.md.
    #[test]
    fn validate_rejects_length_above_eight_array_bound() {
        // length = 16: bigger than the `[u8; 8]` expected array.
        // Currently this panics at `&self.expected[..16]`; it must
        // instead return `false`.
        let check = ByteRangeCheck {
            offset: 0,
            length: 16,
            expected: [1, 2, 3, 4, 5, 6, 7, 8],
        };
        let data = [
            1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0,
        ];
        assert!(
            !check.validate(&data),
            "length=16 must return false, not panic"
        );

        // Hostile edge: length = u8::MAX.
        let hostile = ByteRangeCheck {
            offset: 0,
            length: 255,
            expected: [0u8; 8],
        };
        let big_data = vec![0u8; 512];
        assert!(
            !hostile.validate(&big_data),
            "length=255 must return false, not panic"
        );
    }
}
