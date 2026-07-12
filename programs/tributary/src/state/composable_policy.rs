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

// Indexed forward-account pin: constrains `remaining_accounts[forward_start
// + index]` to equal `pubkey`. Replaces the old positional `[Pubkey; 4]`
//  model — pins are no longer tied 1:1 to array position.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Default)]
pub struct PinnedAccount {
    pub index: u8,
    pub pubkey: Pubkey,
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
        instruction_data[start..end] == self.expected[..self.length as usize]
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
    /// Indexed pins: `pinned_accounts[i]` constrains the account at
    /// `remaining_accounts[forward_start + pinned_accounts[i].index]` to
    /// equal `pinned_accounts[i].pubkey`. Only the first `num_pinned_accounts`
    /// entries are active.
    pub pinned_accounts: [PinnedAccount; MAX_PINNED_FORWARD_ACCOUNTS],
}

impl InstructionConstraint {
    pub const SIZE: usize = 32 + // program_id
        1 + // num_data_checks
        (1 + 1 + 8) * MAX_BYTE_RANGE_CHECKS + // data_checks
        1 + // num_pinned_accounts
        (1 + 32) * MAX_PINNED_FORWARD_ACCOUNTS; // pinned_accounts = 206 bytes

    pub fn is_disabled(&self) -> bool {
        self.program_id == Pubkey::default()
    }

    /// True when at least one pin is declared. With the indexed-pin model
    /// every declared pin is a real constraint (no wildcard concept), so
    /// the count alone suffices. Used by the cold-relayer OR-gate
    /// (ADR-0016 amended).
    pub fn has_effective_pins(&self) -> bool {
        self.num_pinned_accounts > 0
    }

    /// Returns true if any two active pins share the same `index` —
    /// such duplicates are nonsensical (two different pubkeys can never
    /// both match the same remaining_account position) and are rejected
    /// at create time.
    pub fn has_duplicate_indices(&self) -> bool {
        let n = (self.num_pinned_accounts as usize).min(MAX_PINNED_FORWARD_ACCOUNTS);
        for i in 0..n {
            for j in (i + 1)..n {
                if self.pinned_accounts[i].index == self.pinned_accounts[j].index {
                    return true;
                }
            }
        }
        false
    }

    /// Check that every active pin matches the corresponding position in
    /// `remaining_keys` (offset by `forward_start`). Pure — used by both
    /// execute_composable (runtime) and proptests.
    pub fn pins_match(&self, remaining_keys: &[Pubkey], forward_start: usize) -> bool {
        let n = (self.num_pinned_accounts as usize).min(MAX_PINNED_FORWARD_ACCOUNTS);
        for i in 0..n {
            let pin = &self.pinned_accounts[i];
            let idx = forward_start + pin.index as usize;
            if idx >= remaining_keys.len() {
                return false;
            }
            if remaining_keys[idx] != pin.pubkey {
                return false;
            }
        }
        true
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
            pinned_accounts: [PinnedAccount::default(); MAX_PINNED_FORWARD_ACCOUNTS],
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
        1; // forward_flags = 271 bytes

    /// True when the forward leg's WSOL output must be unwrapped to native
    /// SOL via a Tributary-controlled `closeAccount` sweep. Opt-in via bit 0
    /// of `forward_flags`. Requires `output_mint == NATIVE_MINT`.
    pub fn is_native_output(&self) -> bool {
        self.forward_flags & FORWARD_FLAG_NATIVE_OUTPUT != 0
    }

    /// True when forward is enabled. (Convenience alias for the sentinel
    /// check on `instruction_constraint.program_id`.)
    pub fn forward_enabled(&self) -> bool {
        !self.instruction_constraint.is_disabled()
    }

    /// **Act mode** (ADR-0026): forward runs but produces no fungible output
    /// token the recipient takes delivery of. The motivating case is a
    /// Velocity/collateral deposit that consumes input but settles into a
    /// non-token balance sheet. Sentinel = `output_mint == Pubkey::default()`
    /// AND forward enabled. In act mode the program skips the
    /// intermediate-output ATA, the deliver sweep, and the `output_amount > 0`
    /// guard; the owner's `post_validation` is the only settlement floor.
    pub fn is_act_mode(&self) -> bool {
        self.forward_enabled() && self.output_mint == Pubkey::default()
    }

    /// **Deliver, transform** (ADR-0026): forward runs and produces an
    /// output token (`output_mint` set, != input_mint) that is swept to the
    /// recipient. The `output_amount > 0` guard is KEPT in this mode.
    pub fn is_deliver_transform(&self) -> bool {
        self.forward_enabled()
            && self.output_mint != Pubkey::default()
            && self.output_mint != self.input_mint
    }

    /// **Deliver, no transform** (ADR-0026): forward disabled, single
    /// intermediate (input == output mint), fees skimmed from it then swept
    /// to recipient. The classic same-mint topup.
    pub fn is_deliver_no_transform(&self) -> bool {
        !self.forward_enabled() && self.output_mint == self.input_mint
    }

    /// True when this config requires the intermediate-output ATA to exist.
    /// Only deliver-transform mode produces a distinct output token balance
    /// that needs sweeping. Act mode produces no fungible output; deliver-
    /// no-transform reuses the input intermediate.
    pub fn needs_output_ata(&self) -> bool {
        self.is_deliver_transform()
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
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Default)]
pub enum ValidationSpec {
    #[default]
    Disabled,
    ProgramCall {
        program_id: Pubkey,
    },
    Inline {
        reserved: u8,
    },
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
// ponytail: tests set 2-3 fields on Default then mutate array slots — the
// struct-literal form is more awkward than the reassign pattern here.
#[allow(clippy::field_reassign_with_default)]
mod tests {
    use super::*;
    use crate::constants::ALLOWED_FORWARD_PROGRAMS;

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
    fn has_effective_pins_true_with_indexed_pin() {
        let mut ic = InstructionConstraint::default();
        ic.program_id = Pubkey::new_unique();
        ic.num_pinned_accounts = 1;
        ic.pinned_accounts[0] = PinnedAccount {
            index: 0,
            pubkey: Pubkey::new_unique(),
        };
        assert!(ic.has_effective_pins());
    }

    #[test]
    fn has_effective_pins_false_zero_count() {
        let mut ic = InstructionConstraint::default();
        ic.program_id = Pubkey::new_unique();
        ic.pinned_accounts[0] = PinnedAccount {
            index: 0,
            pubkey: Pubkey::new_unique(),
        };
        ic.num_pinned_accounts = 0;
        assert!(!ic.has_effective_pins());
    }

    #[test]
    fn has_effective_pins_true_multiple_pins() {
        let mut ic = InstructionConstraint::default();
        ic.program_id = Pubkey::new_unique();
        ic.num_pinned_accounts = 2;
        ic.pinned_accounts[0] = PinnedAccount {
            index: 0,
            pubkey: Pubkey::new_unique(),
        };
        ic.pinned_accounts[1] = PinnedAccount {
            index: 1,
            pubkey: Pubkey::new_unique(),
        };
        assert!(ic.has_effective_pins());
    }

    // ── PinnedAccount ──────────────────────────────────────────────────

    #[test]
    fn pinned_account_borsh_round_trip() {
        let pa = PinnedAccount {
            index: 3,
            pubkey: Pubkey::new_unique(),
        };
        let bytes = pa.try_to_vec().unwrap();
        let restored: PinnedAccount = PinnedAccount::try_from_slice(&bytes).unwrap();
        assert_eq!(restored, pa);
    }

    #[test]
    fn has_duplicate_indices_detects_pair() {
        let mut ic = InstructionConstraint::default();
        ic.num_pinned_accounts = 2;
        ic.pinned_accounts[0] = PinnedAccount {
            index: 1,
            pubkey: Pubkey::new_unique(),
        };
        ic.pinned_accounts[1] = PinnedAccount {
            index: 1,
            pubkey: Pubkey::new_unique(),
        };
        assert!(ic.has_duplicate_indices());
    }

    #[test]
    fn has_duplicate_indices_false_distinct() {
        let mut ic = InstructionConstraint::default();
        ic.num_pinned_accounts = 3;
        ic.pinned_accounts[0] = PinnedAccount {
            index: 0,
            pubkey: Pubkey::new_unique(),
        };
        ic.pinned_accounts[1] = PinnedAccount {
            index: 2,
            pubkey: Pubkey::new_unique(),
        };
        ic.pinned_accounts[2] = PinnedAccount {
            index: 5,
            pubkey: Pubkey::new_unique(),
        };
        assert!(!ic.has_duplicate_indices());
    }

    #[test]
    fn pins_match_correct_position() {
        let mut ic = InstructionConstraint::default();
        ic.num_pinned_accounts = 2;
        let pk0 = Pubkey::new_unique();
        let pk1 = Pubkey::new_unique();
        ic.pinned_accounts[0] = PinnedAccount {
            index: 0,
            pubkey: pk0,
        };
        ic.pinned_accounts[1] = PinnedAccount {
            index: 3,
            pubkey: pk1,
        };
        let keys = vec![pk0, Pubkey::new_unique(), Pubkey::new_unique(), pk1];
        assert!(ic.pins_match(&keys, 0));
    }

    #[test]
    fn pins_match_rejects_wrong_position() {
        let mut ic = InstructionConstraint::default();
        ic.num_pinned_accounts = 1;
        ic.pinned_accounts[0] = PinnedAccount {
            index: 2,
            pubkey: Pubkey::new_unique(),
        };
        let keys = vec![Pubkey::new_unique(), Pubkey::new_unique()];
        assert!(!ic.pins_match(&keys, 0)); // index 2 OOB
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
        assert_eq!(InstructionConstraint::SIZE, 206);
    }

    #[test]
    fn forward_config_size() {
        assert_eq!(ForwardConfig::SIZE, 271);
    }

    #[test]
    fn validation_spec_size() {
        assert_eq!(ValidationSpec::SIZE, 33);
    }

    // ── Settlement-shape helpers (ADR-0026) ────────────────────────────

    fn fc(input: Pubkey, output: Pubkey, forward: bool) -> ForwardConfig {
        let target = if forward {
            ALLOWED_FORWARD_PROGRAMS[0]
        } else {
            Pubkey::default()
        };
        let mut ic = InstructionConstraint::default();
        ic.program_id = target;
        if forward {
            ic.num_data_checks = 1;
            ic.data_checks[0] = ByteRangeCheck {
                offset: 0,
                length: 1,
                expected: [0u8; 8],
            };
            ic.num_pinned_accounts = 1;
            ic.pinned_accounts[0] = PinnedAccount {
                index: 0,
                pubkey: Pubkey::new_unique(),
            };
        }
        ForwardConfig {
            instruction_constraint: ic,
            input_mint: input,
            output_mint: output,
            forward_flags: 0,
        }
    }

    #[test]
    fn deliver_no_transform_shape() {
        let m = Pubkey::new_unique();
        let c = fc(m, m, false);
        assert!(c.is_deliver_no_transform());
        assert!(!c.is_act_mode());
        assert!(!c.is_deliver_transform());
        assert!(!c.needs_output_ata());
    }

    #[test]
    fn deliver_transform_shape() {
        let i = Pubkey::new_unique();
        let o = Pubkey::new_unique();
        let c = fc(i, o, true);
        assert!(c.is_deliver_transform());
        assert!(!c.is_act_mode());
        assert!(!c.is_deliver_no_transform());
        assert!(c.needs_output_ata());
    }

    #[test]
    fn act_mode_shape() {
        let i = Pubkey::new_unique();
        let c = fc(i, Pubkey::default(), true);
        assert!(c.is_act_mode());
        assert!(!c.is_deliver_transform());
        assert!(!c.is_deliver_no_transform());
        assert!(!c.needs_output_ata());
    }

    #[test]
    fn forward_enabled_helper() {
        let i = Pubkey::new_unique();
        assert!(!fc(i, i, false).forward_enabled());
        assert!(fc(i, Pubkey::default(), true).forward_enabled());
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
        ic.pinned_accounts[0] = PinnedAccount {
            index: 0,
            pubkey: Pubkey::new_unique(),
        };
        ic.pinned_accounts[1] = PinnedAccount {
            index: 1,
            pubkey: Pubkey::new_unique(),
        };

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
