use super::payment_policy::PolicyType;
use crate::constants::FORWARD_FLAG_NATIVE_OUTPUT;
use anchor_lang::prelude::*;

pub const MAX_BYTE_RANGE_CHECKS: usize = 4;
pub const MAX_PINNED_FORWARD_ACCOUNTS: usize = 4;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct ByteRangeCheck {
    pub offset: u8,
    pub length: u8,
    pub expected: [u8; 8],
}

impl ByteRangeCheck {
    pub fn validate(&self, instruction_data: &[u8]) -> bool {
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

/// Unified forward-program constraint: pins the instruction selector
/// (ByteRangeCheck[]) AND the positional forward-accounts (pinned_accounts[]).
///
/// Absorbs the old `target_program` + `data_checks` fields and the scrapped
/// `ForwardAccountsPda` design into one inline struct. `program_id ==
/// Pubkey::default()` is the "forward disabled" sentinel.
///
/// See ADR-0016 (amended) + bean tributary-q82g (REWRITTEN SCOPE).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct InstructionConstraint {
    /// Was `target_program`. `Pubkey::default()` = forward disabled.
    pub program_id: Pubkey,
    pub num_data_checks: u8,
    pub data_checks: [ByteRangeCheck; MAX_BYTE_RANGE_CHECKS],
    pub num_pinned_accounts: u8,
    /// Positional pin on `remaining_accounts[forward_start+i]`.
    /// `Pubkey::default()` entry = wildcard slot (no constraint).
    pub pinned_accounts: [Pubkey; MAX_PINNED_FORWARD_ACCOUNTS],
}

impl InstructionConstraint {
    pub const SIZE: usize = 32 + // program_id
        1 + // num_data_checks
        (1 + 1 + 8) * MAX_BYTE_RANGE_CHECKS + // data_checks
        1 + // num_pinned_accounts
        32 * MAX_PINNED_FORWARD_ACCOUNTS; // pinned_accounts = 202 bytes

    pub fn is_disabled(&self) -> bool {
        self.program_id == Pubkey::default()
    }

    /// True when at least one pinned slot is a concrete (non-default) pubkey.
    /// Used by the cold-relayer OR-gate (ADR-0016 amended): a non-sentinel
    /// InstructionConstraint with zero effective pins does NOT qualify as a
    /// safety net. Defence-in-depth alongside the create-time degenerate-pin
    /// guard.
    pub fn has_effective_pins(&self) -> bool {
        let n = (self.num_pinned_accounts as usize).min(MAX_PINNED_FORWARD_ACCOUNTS);
        (0..n).any(|i| self.pinned_accounts[i] != Pubkey::default())
    }
}

impl Default for InstructionConstraint {
    fn default() -> Self {
        Self {
            program_id: Pubkey::default(),
            num_data_checks: 0,
            data_checks: [ByteRangeCheck {
                offset: 0,
                length: 0,
                expected: [0u8; 8],
            }; MAX_BYTE_RANGE_CHECKS],
            num_pinned_accounts: 0,
            pinned_accounts: [Pubkey::default(); MAX_PINNED_FORWARD_ACCOUNTS],
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct ForwardConfig {
    pub instruction_constraint: InstructionConstraint,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub forward_flags: u8,
}

impl ForwardConfig {
    pub const SIZE: usize = InstructionConstraint::SIZE + // instruction_constraint
        32 + // input_mint
        32 + // output_mint
        1; // forward_flags = 267 bytes

    /// True when the forward leg's WSOL output must be unwrapped to native
    /// SOL via a Tributary-controlled `closeAccount` sweep. Opt-in via bit 0
    /// of `forward_flags`. Requires `output_mint == NATIVE_MINT`.
    pub fn is_native_output(&self) -> bool {
        self.forward_flags & FORWARD_FLAG_NATIVE_OUTPUT != 0
    }
}

/// Unified validation routing for both pre- and post-forward phases.
///
/// - `Disabled` — no CPI, no ValidationPda loaded.
/// - `ProgramCall { program_id }` — CPI to an allowlisted program (Lighthouse)
///   with assertion data from the corresponding ValidationPda.
/// - `Inline` — reserved for future use; errors at create (gated on
///   tributary-okhd).
///
/// See bean tributary-q82g (REWRITTEN SCOPE) + ADR-0016 amended.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum ValidationSpec {
    Disabled,
    ProgramCall { program_id: Pubkey },
    Inline { reserved: u8 },
}

impl ValidationSpec {
    pub const SIZE: usize = 1 + 32; // discriminant + max variant (ProgramCall)

    pub fn is_program_call(&self) -> bool {
        matches!(self, ValidationSpec::ProgramCall { .. })
    }

    pub fn program_id(&self) -> Pubkey {
        match self {
            ValidationSpec::ProgramCall { program_id } => *program_id,
            _ => Pubkey::default(),
        }
    }
}

impl Default for ValidationSpec {
    fn default() -> Self {
        ValidationSpec::Disabled
    }
}

#[account]
pub struct ComposablePolicy {
    pub bump: u8,
    pub user_payment: Pubkey,
    pub gateway: Pubkey,
    pub status: super::policy_status::PolicyStatus,
    pub rent_payer: Pubkey,
    pub policy_type: PolicyType,
    pub forward_config: ForwardConfig,
    pub pre_validation: ValidationSpec,
    pub post_validation: ValidationSpec,
    pub memo: [u8; 32],
    pub recipient: Pubkey,
    pub total_input: u64,
    pub total_output: u64,
    pub payment_count: u32,
    pub policy_id: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub padding: [u8; 192],
}

impl ComposablePolicy {
    pub const SIZE: usize = 8 + // Anchor discriminator
        1 + // bump
        32 + // user_payment
        32 + // gateway
        1 + // status
        32 + // rent_payer
        PolicyType::TOTAL_SIZE + // policy_type
        ForwardConfig::SIZE + // forward_config
        ValidationSpec::SIZE + // pre_validation
        ValidationSpec::SIZE + // post_validation
        32 + // memo
        32 + // recipient
        8 + // total_input
        8 + // total_output
        4 + // payment_count
        4 + // policy_id
        8 + // created_at
        8 + // updated_at
        192; // padding
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_rejects_length_above_eight_array_bound() {
        let check = ByteRangeCheck {
            offset: 0,
            length: 16,
            expected: [1, 2, 3, 4, 5, 6, 7, 8],
        };
        let data = [1u8; 32];
        assert!(!check.validate(&data));

        let hostile = ByteRangeCheck {
            offset: 0,
            length: 255,
            expected: [0u8; 8],
        };
        assert!(!hostile.validate(&vec![0u8; 512]));
    }

    // ── InstructionConstraint ──────────────────────────────────────────

    #[test]
    fn default_constraint_is_disabled() {
        let ic = InstructionConstraint::default();
        assert!(ic.is_disabled());
        assert!(!ic.has_effective_pins());
    }

    #[test]
    fn has_effective_pins_true_with_concrete_pin() {
        let mut ic = InstructionConstraint::default();
        ic.program_id = Pubkey::new_unique();
        ic.num_pinned_accounts = 1;
        ic.pinned_accounts[0] = Pubkey::new_unique();
        assert!(ic.has_effective_pins());
    }

    #[test]
    fn has_effective_pins_false_all_wildcard() {
        let mut ic = InstructionConstraint::default();
        ic.program_id = Pubkey::new_unique();
        ic.num_pinned_accounts = 4;
        // all default → all wildcard
        assert!(!ic.has_effective_pins());
    }

    #[test]
    fn has_effective_pins_false_zero_count() {
        let mut ic = InstructionConstraint::default();
        ic.program_id = Pubkey::new_unique();
        ic.pinned_accounts[0] = Pubkey::new_unique();
        ic.num_pinned_accounts = 0; // even with a concrete pin at [0]
        assert!(!ic.has_effective_pins());
    }

    #[test]
    fn has_effective_pins_partial_wildcard_ok() {
        let mut ic = InstructionConstraint::default();
        ic.program_id = Pubkey::new_unique();
        ic.num_pinned_accounts = 2;
        ic.pinned_accounts[1] = Pubkey::new_unique(); // [0] = wildcard
        assert!(ic.has_effective_pins());
    }

    #[test]
    fn has_effective_pins_ignores_slots_past_count() {
        let mut ic = InstructionConstraint::default();
        ic.program_id = Pubkey::new_unique();
        ic.num_pinned_accounts = 1;
        ic.pinned_accounts[0] = Pubkey::default();
        ic.pinned_accounts[1] = Pubkey::new_unique(); // past count
        assert!(!ic.has_effective_pins());
    }

    // ── ValidationSpec ─────────────────────────────────────────────────

    #[test]
    fn disabled_is_not_program_call() {
        assert!(!ValidationSpec::Disabled.is_program_call());
    }

    #[test]
    fn program_call_is_program_call() {
        let pk = Pubkey::new_unique();
        let vs = ValidationSpec::ProgramCall { program_id: pk };
        assert!(vs.is_program_call());
        assert_eq!(vs.program_id(), pk);
    }

    #[test]
    fn inline_is_not_program_call() {
        let vs = ValidationSpec::Inline { reserved: 0 };
        assert!(!vs.is_program_call());
        assert_eq!(vs.program_id(), Pubkey::default());
    }

    // ── Size regression guards ─────────────────────────────────────────

    #[test]
    fn instruction_constraint_size() {
        assert_eq!(InstructionConstraint::SIZE, 202);
    }

    #[test]
    fn forward_config_size() {
        assert_eq!(ForwardConfig::SIZE, 267);
    }

    #[test]
    fn validation_spec_size() {
        assert_eq!(ValidationSpec::SIZE, 33);
    }

    #[test]
    fn composable_policy_size_covers_all_fields() {
        let expected = 8
            + 1
            + 32
            + 32
            + 1
            + 32
            + PolicyType::TOTAL_SIZE
            + ForwardConfig::SIZE
            + ValidationSpec::SIZE * 2
            + 32
            + 32
            + 8
            + 8
            + 4
            + 4
            + 8
            + 8
            + 192;
        assert_eq!(ComposablePolicy::SIZE, expected);
    }

    /// Borsh round-trip for InstructionConstraint — guards field order.
    #[test]
    fn instruction_constraint_borsh_round_trip() {
        let mut ic = InstructionConstraint::default();
        ic.program_id = Pubkey::new_unique();
        ic.num_data_checks = 2;
        ic.data_checks[0] = ByteRangeCheck {
            offset: 0,
            length: 4,
            expected: [1, 2, 3, 4, 0, 0, 0, 0],
        };
        ic.num_pinned_accounts = 3;
        ic.pinned_accounts[0] = Pubkey::new_unique();
        ic.pinned_accounts[1] = Pubkey::new_unique();

        let bytes = ic.try_to_vec().unwrap();
        let restored: InstructionConstraint =
            InstructionConstraint::try_from_slice(&bytes).unwrap();
        assert_eq!(restored, ic);
    }

    /// Borsh round-trip for ValidationSpec — guards enum discriminant + variant.
    #[test]
    fn validation_spec_borsh_round_trip() {
        let cases = vec![
            ValidationSpec::Disabled,
            ValidationSpec::ProgramCall {
                program_id: Pubkey::new_unique(),
            },
            ValidationSpec::Inline { reserved: 0 },
        ];
        for vs in cases {
            let bytes = vs.try_to_vec().unwrap();
            let restored: ValidationSpec = ValidationSpec::try_from_slice(&bytes).unwrap();
            assert_eq!(restored, vs);
        }
    }
}
