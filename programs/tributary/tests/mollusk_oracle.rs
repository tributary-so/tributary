// Layer-2 behavior fuzzing harness (bean tributary-ya7m).
//
// Loads the compiled Tributary program into Mollusk (in-process SVM, no
// network), hand-crafts account fixtures — including a TokenAccount with the
// delegate + delegated_amount pre-set, bypassing the SPL `approve` CPI — and
// drives `execute_payment` through the REAL on-chain handler + REAL Token
// program transfer_checked CPI. Two oracles run over every result:
//
//   (1) CONSERVATION — Σ token-balance deltas == 0 across
//       user / recipient / protocol-fee / gateway-fee accounts. The unified
//       fee model (ADR-0018) via `calculate_fees` is the reference: the sum
//       of credits must equal the user's debit (total_from_user).
//
//   (2) AUTHORITY INVERSION — a transition that MUST fail (paused program,
//       insufficient delegate) SUCCEEDS → bug.
//
// The must-fail cases mirror the `.qedspec` `requires` clauses (the authority
// oracle source — see bean tributary-eu41). This is the empirical twin of the
// formal spec: the spec SAYS they abort; this asserts they DO.
//
// NOTE on the type bridge: mollusk 0.14 is built on the newer solana crate
// lines (solana-pubkey 4.x / solana-account 4.x / solana-instruction 3.x),
// while anchor 0.31 (and thus the program's account types) uses 2.x. PDAs are
// derived with anchor's Pubkey (identical derivation math to on-chain), then
// bridged to mollusk's Pubkey at the SVM boundary via `mkey()`.
//
// Build the program first:  cargo build-sbf --manifest-path programs/tributary/Cargo.toml
// Then:  cargo test --manifest-path programs/tributary/Cargo.toml --test mollusk_oracle

// mollusk-native types (4.x / 3.x)
use solana_account::Account;
use solana_instruction::{AccountMeta, Instruction};
use solana_pubkey::Pubkey as MKey;
use solana_rent::Rent;

// anchor's 2.x Pubkey — identical PDA derivation to the on-chain program.
use anchor_lang::prelude::Pubkey as AKey;

use mollusk_svm::result::InstructionResult;
use mollusk_svm::Mollusk;
use mollusk_svm_programs_token::token;

use tributary::shared::fees::calculate_fees;
use tributary::{
    PaymentGateway, PaymentPolicy, PolicyStatus, PolicyType, ProgramConfig, UserPayment,
    CONFIG_SEED, GATEWAY_SEED, PAYMENTS_SEED, PAYMENT_POLICY_SEED, USER_PAYMENT_SEED,
};

/// Anchor 2.x Pubkey → mollusk 4.x Pubkey (byte-for-byte identity).
fn mkey(a: &AKey) -> MKey {
    MKey::new_from_array(a.to_bytes())
}
/// mollusk 4.x Pubkey → anchor 2.x Pubkey (for account-struct fields).
fn akey(m: &MKey) -> AKey {
    AKey::new_from_array(*m.as_array())
}

const PROGRAM_ID: AKey = AKey::from_str_const("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ");

// ── SPL Token byte-layout helpers (hand-crafted; no extra dep) ───────────
// TokenAccount PACK_LEN = 165; Mint PACK_LEN = 82.
// COption<T>: 4-byte u32 tag (0=None, 1=Some) + T.

fn make_mint(decimals: u8) -> Vec<u8> {
    // SPL Mint (PACK_LEN=82): mint_authority COption(36) | supply u64(8) |
    // decimals u8 | is_initialized bool | freeze_authority COption(36).
    let mut d = vec![0u8; 82];
    d[44] = decimals;
    d[45] = 1; // is_initialized
    d
}

/// Build a 165-byte SPL Token account. `delegate` = (pubkey, delegated_amount)
/// sets the delegate + delegated_amount so execute_payment can pull via the
/// PDA without running an `approve` CPI first.
fn make_token_account(
    mint: &AKey,
    owner: &AKey,
    amount: u64,
    delegate: Option<(&AKey, u64)>,
) -> Vec<u8> {
    let mut d = vec![0u8; 165];
    d[0..32].copy_from_slice(mint.as_ref());
    d[32..64].copy_from_slice(owner.as_ref());
    d[64..72].copy_from_slice(&amount.to_le_bytes());
    d[108] = 1; // state = Initialized
    if let Some((del, del_amount)) = delegate {
        d[72..76].copy_from_slice(&1u32.to_le_bytes()); // Some
        d[76..108].copy_from_slice(del.as_ref());
        d[121..129].copy_from_slice(&del_amount.to_le_bytes()); // delegated_amount
    }
    d
}

/// Read the `amount` field (offset 64) from a packed Token account.
fn token_amount(data: &[u8]) -> u64 {
    if data.len() < 72 {
        return 0;
    }
    let mut b = [0u8; 8];
    b.copy_from_slice(&data[64..72]);
    u64::from_le_bytes(b)
}

/// Serialize an Anchor account (discriminator + Borsh fields) to bytes.
fn anchor_bytes<T: anchor_lang::AccountSerialize>(acc: &T) -> Vec<u8> {
    let mut v = Vec::new();
    acc.try_serialize(&mut v).expect("anchor serialize");
    v
}

/// 8-byte Anchor instruction discriminator = sha256("global:<name>")[..8].
fn ix_discriminator(name: &str) -> [u8; 8] {
    let h = anchor_lang::solana_program::hash::hash(name.as_bytes());
    let mut d = [0u8; 8];
    d.copy_from_slice(&h.to_bytes()[..8]);
    d
}

// ── Fixture: a complete execute_payment setup (OneTime policy) ───────────

struct Fixture {
    mollusk: Mollusk,
    accounts: Vec<(MKey, Account)>,
    ix: Instruction,
    user_token: AKey,
    recipient_token: AKey,
    gateway_fee_token: AKey,
    protocol_fee_token: AKey,
    payment_policy_pda: AKey,
    expected_total_from_user: u64,
}

/// Build a fixture for a pull payment. `policy_type` is the configured
/// PolicyType; `execute_arg` is the `Option<u64>` passed to execute_payment
/// (Some(chunk) for PAYG/UpTo, None for OneTime/Subscription/Milestone).
/// `paused` flips the global emergency_pause (authority oracle). `delegate_amount`
/// sets the delegate ceiling (insufficient delegate MUST reject).
fn build_fixture(
    policy_type: PolicyType,
    execute_arg: Option<u64>,
    fee_bps: u16,
    paused: bool,
    delegate_amount: u64,
) -> Fixture {
    // Point Mollusk at the compiled .so (workspace target/deploy). Set
    // SBF_OUT_DIR so Mollusk's search finds the ELF. SAFETY: tests are
    // single-threaded; set before Mollusk::new; idempotent.
    let deploy = format!("{}/../../target/deploy", env!("CARGO_MANIFEST_DIR"));
    unsafe {
        std::env::set_var("SBF_OUT_DIR", &deploy);
    }
    let mut mollusk = Mollusk::new(&mkey(&PROGRAM_ID), "tributary");
    token::add_program(&mut mollusk);

    // Identities (anchor Pubkey — same PDA math as on-chain).
    let gateway_authority = AKey::new_unique();
    let gateway_signer = AKey::new_unique();
    let gateway_fee_recipient = AKey::new_unique();
    let user_owner = AKey::new_unique();
    let recipient = AKey::new_unique();
    let protocol_fee_recipient = AKey::new_unique();
    let mint = AKey::new_unique();
    let decimals: u8 = 6;

    // PDAs
    let (config_pda, config_bump) = AKey::find_program_address(&[CONFIG_SEED], &PROGRAM_ID);
    let (gateway_pda, gateway_bump) =
        AKey::find_program_address(&[GATEWAY_SEED, gateway_authority.as_ref()], &PROGRAM_ID);
    let (user_payment_pda, up_bump) = AKey::find_program_address(
        &[USER_PAYMENT_SEED, user_owner.as_ref(), mint.as_ref()],
        &PROGRAM_ID,
    );
    let policy_id: u32 = 1;
    let (payment_policy_pda, _pp_bump) = AKey::find_program_address(
        &[
            PAYMENT_POLICY_SEED,
            user_payment_pda.as_ref(),
            &policy_id.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );
    let (payments_delegate_pda, _pd_bump) =
        AKey::find_program_address(&[PAYMENTS_SEED], &PROGRAM_ID);

    // Token account addresses
    let user_token = AKey::new_unique();
    let recipient_token = AKey::new_unique();
    let gateway_fee_token = AKey::new_unique();
    let protocol_fee_token = AKey::new_unique();

    let user_balance = 1_000_000_000; // well-funded for any sequence

    // Program accounts (Anchor-serialized; owner = PROGRAM_ID).
    let config = ProgramConfig {
        admin: gateway_authority,
        fee_recipient: protocol_fee_recipient,
        protocol_share_bps: 1000,
        _deprecated: 0,
        emergency_pause: paused,
        bump: config_bump,
        padding: [0u8; 256],
    };
    let gateway = PaymentGateway {
        authority: gateway_authority,
        fee_recipient: gateway_fee_recipient,
        gateway_fee_bps: fee_bps,
        is_active: true,
        padding1: 0,
        created_at: 0,
        bump: gateway_bump,
        name: [0u8; 32],
        url: [0u8; 64],
        signer: gateway_signer,
        feature_flags: 0,
        referral_allocation_bps: 0,
        referral_tiers_bps: [0; 3],
        custom_protocol_share_bps: 0,
        scheduler_share_bps: 0,
        padding: [0u8; 115],
    };
    let user_payment = UserPayment {
        owner: user_owner,
        token_account: user_token,
        token_mint: mint,
        active_policies_count: 1,
        created_at: 0,
        updated_at: 0,
        is_active: true,
        bump: up_bump,
        created_policies_count: policy_id,
        rent_payer: gateway_authority,
        active_composable_count: 0,
        created_composable_count: 0,
        padding: [0u8; 212],
    };
    let payment_policy = PaymentPolicy {
        user_payment: user_payment_pda,
        recipient,
        gateway: gateway_pda,
        policy_type,
        status: PolicyStatus::Active,
        memo: [0u8; 64],
        total_paid: 0,
        payment_count: 0,
        created_at: 0,
        updated_at: 0,
        policy_id,
        bump: _pp_bump,
        rent_payer: gateway_authority,
        padding: [0u8; 223],
    };

    // Reference fee breakdown (conservation oracle's expected value) — based
    // on the amount that validate_policy_execution will actually settle.
    let ref_amount = match execute_arg {
        Some(a) => a, // PAYG / UpTo settle the caller-supplied amount
        None => settle_amount(&payment_policy.policy_type),
    };
    let fb = calculate_fees(ref_amount, fee_bps, 1000, 0, 0, false, false).unwrap();
    let expected_total_from_user = fb.total_from_user;

    let rent = Rent::default();
    let mk = |data: Vec<u8>, owner: &AKey| Account {
        lamports: rent.minimum_balance(data.len()).max(1_000_000),
        data,
        owner: mkey(owner),
        executable: false,
        rent_epoch: 0,
    };

    let token_program_id = mkey(&akey(&token::ID));

    let mut accounts: Vec<(MKey, Account)> = vec![
        (mkey(&config_pda), mk(anchor_bytes(&config), &PROGRAM_ID)),
        (mkey(&gateway_pda), mk(anchor_bytes(&gateway), &PROGRAM_ID)),
        (
            mkey(&user_payment_pda),
            mk(anchor_bytes(&user_payment), &PROGRAM_ID),
        ),
        (
            mkey(&payment_policy_pda),
            mk(anchor_bytes(&payment_policy), &PROGRAM_ID),
        ),
        // payments_delegate: empty system account (present, not the active signer).
        (mkey(&payments_delegate_pda), mk(vec![], &AKey::default())),
        (
            mkey(&gateway_signer),
            Account::new(1_000_000, 0, &MKey::default()),
        ),
        // mint + token accounts
        (mkey(&mint), mk(make_mint(decimals), &akey(&token::ID))),
        (
            mkey(&user_token),
            mk(
                make_token_account(
                    &mint,
                    &user_owner,
                    user_balance,
                    Some((&user_payment_pda, delegate_amount)),
                ),
                &akey(&token::ID),
            ),
        ),
        (
            mkey(&recipient_token),
            mk(
                make_token_account(&mint, &recipient, 0, None),
                &akey(&token::ID),
            ),
        ),
        (
            mkey(&gateway_fee_token),
            mk(
                make_token_account(&mint, &gateway_fee_recipient, 0, None),
                &akey(&token::ID),
            ),
        ),
        (
            mkey(&protocol_fee_token),
            mk(
                make_token_account(&mint, &protocol_fee_recipient, 0, None),
                &akey(&token::ID),
            ),
        ),
    ];
    // The Token program itself (CPI target).
    accounts.push(token::keyed_account());

    // execute_payment instruction: discriminator + Borsh(Option<u64>).
    let mut ix_data = ix_discriminator("global:execute_payment").to_vec();
    match execute_arg {
        None => ix_data.push(0),
        Some(a) => {
            ix_data.push(1);
            ix_data.extend_from_slice(&a.to_le_bytes());
        }
    }
    let ix = Instruction {
        program_id: mkey(&PROGRAM_ID),
        data: ix_data,
        accounts: vec![
            AccountMeta::new(mkey(&gateway_signer), true),
            AccountMeta::new_readonly(mkey(&payments_delegate_pda), false),
            AccountMeta::new(mkey(&payment_policy_pda), false),
            AccountMeta::new(mkey(&user_payment_pda), false),
            AccountMeta::new(mkey(&gateway_pda), false),
            AccountMeta::new_readonly(mkey(&config_pda), false),
            AccountMeta::new(mkey(&user_token), false),
            AccountMeta::new_readonly(mkey(&mint), false),
            AccountMeta::new(mkey(&recipient_token), false),
            AccountMeta::new(mkey(&gateway_fee_token), false),
            AccountMeta::new(mkey(&protocol_fee_token), false),
            AccountMeta::new_readonly(token_program_id, false),
        ],
    };

    Fixture {
        mollusk,
        accounts,
        ix,
        user_token,
        recipient_token,
        gateway_fee_token,
        protocol_fee_token,
        payment_policy_pda,
        expected_total_from_user,
    }
}

/// The fixed settle amount for non-chunk variants (used for the fee reference
/// when execute_arg is None).
fn settle_amount(pt: &PolicyType) -> u64 {
    match pt {
        PolicyType::Subscription { amount, .. } | PolicyType::OneTime { amount, .. } => *amount,
        PolicyType::Milestone {
            milestone_amounts,
            current_milestone,
            ..
        } => milestone_amounts[*current_milestone as usize],
        PolicyType::PayAsYouGo { .. } | PolicyType::UpTo { .. } => 0, // caller-supplied
    }
}

// ── Conservation oracle ──────────────────────────────────────────────────
#[derive(Clone, Copy)]
struct FixBalances {
    user: u64,
    recipient: u64,
    gateway: u64,
    protocol: u64,
}

/// Assert Σ token-balance deltas == 0 (no tokens created or destroyed).
/// gross-mode: user debit == recipient + protocol + gateway credits.
fn assert_conservation(pre: &FixBalances, post: &FixBalances) {
    let user_debit = pre.user as i128 - post.user as i128;
    let recipient_credit = post.recipient as i128 - pre.recipient as i128;
    let gateway_credit = post.gateway as i128 - pre.gateway as i128;
    let protocol_credit = post.protocol as i128 - pre.protocol as i128;
    let sum_credits = recipient_credit + gateway_credit + protocol_credit;
    assert_eq!(
        user_debit, sum_credits,
        "CONSERVATION VIOLATION: user debited {user_debit} but credits sum {sum_credits}"
    );
    assert!(
        user_debit >= 0,
        "user balance must not increase from a pull"
    );
}

fn bal_of(accounts: &[(MKey, Account)], k: &AKey) -> u64 {
    let mk = mkey(k);
    accounts
        .iter()
        .find(|(pk, _)| *pk == mk)
        .map(|(_, a)| token_amount(&a.data))
        .unwrap_or(0)
}

fn snapshot(f: &Fixture) -> FixBalances {
    FixBalances {
        user: bal_of(&f.accounts, &f.user_token),
        recipient: bal_of(&f.accounts, &f.recipient_token),
        gateway: bal_of(&f.accounts, &f.gateway_fee_token),
        protocol: bal_of(&f.accounts, &f.protocol_fee_token),
    }
}

fn snapshot_result(r: &InstructionResult, f: &Fixture) -> FixBalances {
    let get = |k: &AKey| {
        let mk = mkey(k);
        r.get_account(&mk)
            .map(|a| token_amount(&a.data))
            .unwrap_or(0)
    };
    FixBalances {
        user: get(&f.user_token),
        recipient: get(&f.recipient_token),
        gateway: get(&f.gateway_fee_token),
        protocol: get(&f.protocol_fee_token),
    }
}

// ── Tests ────────────────────────────────────────────────────────────────

#[test]
fn onetime_execute_conservation_oracle() {
    let f = build_fixture(
        PolicyType::OneTime {
            amount: 1_000_000,
            due_date: 0,
            expiry_date: None,
            padding: [0u8; 103],
        },
        None,
        100,
        false,
        10_000_000,
    );
    let pre = snapshot(&f);
    let result = f.mollusk.process_instruction(&f.ix, &f.accounts);

    assert!(
        result.program_result.is_ok(),
        "happy-path OneTime execute must succeed: {:?}",
        result.program_result
    );
    let post = snapshot_result(&result, &f);
    assert_conservation(&pre, &post);

    // Reference check: user debit == calculate_fees total_from_user.
    let user_debit = pre.user - post.user;
    assert_eq!(
        user_debit, f.expected_total_from_user,
        "debit must match fee ref"
    );
    let expected = calculate_fees(1_000_000, 100, 1000, 0, 0, false, false).unwrap();
    assert_eq!(post.recipient - pre.recipient, expected.recipient_amount);
    assert_eq!(post.protocol - pre.protocol, expected.protocol_cut);
}

#[test]
fn authority_oracle_paused_must_fail() {
    // emergency_pause = true → execute MUST fail (ProgramPaused).
    let f = build_fixture(
        PolicyType::OneTime {
            amount: 1_000_000,
            due_date: 0,
            expiry_date: None,
            padding: [0u8; 103],
        },
        None,
        100,
        true,
        10_000_000,
    );
    let pre = snapshot(&f);
    let result = f.mollusk.process_instruction(&f.ix, &f.accounts);
    assert!(
        result.program_result.is_err(),
        "AUTHORITY INVERSION: paused program accepted an execution (must reject)"
    );
    let post = snapshot_result(&result, &f);
    assert_conservation(&pre, &post);
}

#[test]
fn authority_oracle_insufficient_delegate_must_fail() {
    // delegate_amount (1) < total_from_user → execute MUST fail.
    let f = build_fixture(
        PolicyType::OneTime {
            amount: 1_000_000,
            due_date: 0,
            expiry_date: None,
            padding: [0u8; 103],
        },
        None,
        100,
        false,
        1,
    );
    let result = f.mollusk.process_instruction(&f.ix, &f.accounts);
    assert!(
        result.program_result.is_err(),
        "AUTHORITY INVERSION: insufficient delegate accepted an execution (must reject)"
    );
}

/// PAYG cross-period sequence — the empirical twin of the A2 formal property
/// (qedspec `period_bounded`): no chunk sequence, across period resets,
/// extracts more than `max_amount_per_period` per period.
///
/// Sequence: max_per_period=1000, chunk=600, period=100s.
///   (1) chunk 600 → period_total 600  ✓
///   (2) chunk 600 → would make 1200 > 1000 → MUST REJECT
///   (3) advance clock past period → reset → chunk 600 → period_total 600  ✓
/// Policy state is threaded forward from each result (the program mutates
/// current_period_total; we feed the updated bytes into the next call).
#[test]
fn payg_period_sequence_a2_oracle() {
    let max_per_period = 1_000u64;
    let chunk = 600u64;
    let period_secs = 100u64;

    let mut f = build_fixture(
        PolicyType::PayAsYouGo {
            max_amount_per_period: max_per_period,
            max_chunk_amount: chunk,
            period_length_seconds: period_secs,
            current_period_start: 0,
            current_period_total: 0,
            expiry_date: None,
            padding: [0u8; 79],
        },
        Some(chunk),
        100,
        false,
        max_per_period * 10,
    );

    let pp_mkey = mkey(&f.payment_policy_pda);

    // Helper: run one execute against current fixture accounts, return result.
    let run = |f: &Fixture| f.mollusk.process_instruction(&f.ix, &f.accounts);

    // ── (1) first chunk in a fresh period → success ──────────────────────
    f.mollusk.sysvars.clock.unix_timestamp = 10;
    let pre1 = snapshot(&f);
    let r1 = run(&f);
    assert!(
        r1.program_result.is_ok(),
        "(1) first chunk must succeed: {:?}",
        r1.program_result
    );
    assert_conservation(&pre1, &snapshot_result(&r1, &f));

    // Thread the mutated policy bytes forward.
    let updated_pp = r1
        .get_account(&pp_mkey)
        .expect("policy present")
        .data
        .clone();
    for (k, a) in &mut f.accounts {
        if *k == pp_mkey {
            a.data = updated_pp.clone();
        }
    }
    // also thread the mutated user token balance forward (decreased by pull)
    let user_mkey = mkey(&f.user_token);
    let updated_user = r1
        .get_account(&user_mkey)
        .expect("user token present")
        .data
        .clone();
    for (k, a) in &mut f.accounts {
        if *k == user_mkey {
            a.data = updated_user.clone();
        }
    }

    // ── (2) second chunk in SAME period → 600 + 600 > 1000 → MUST reject ─
    f.mollusk.sysvars.clock.unix_timestamp = 20;
    let r2 = run(&f);
    assert!(
        r2.program_result.is_err(),
        "A2 VIOLATION: second chunk exceeded the per-period cap but succeeded (must reject)"
    );

    // ── (3) advance clock past period_length_seconds → reset → success ───
    f.mollusk.sysvars.clock.unix_timestamp = 10 + period_secs as i64 + 5;
    let pre3 = snapshot(&f);
    let r3 = run(&f);
    assert!(
        r3.program_result.is_ok(),
        "(3) chunk after period reset must succeed: {:?}",
        r3.program_result
    );
    assert_conservation(&pre3, &snapshot_result(&r3, &f));
}
