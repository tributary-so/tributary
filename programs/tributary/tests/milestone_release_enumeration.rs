// Milestone release_condition — exhaustive 16-bit enumeration.
//
// Bean tributary-ya7m: "Enumerate (not fuzz) milestone release_condition
// 16-bit combinations." This is a DETERMINISTIC enumeration (every value
// 0..=15), not a randomized fuzz — the search space is small enough to
// cover exhaustively, so randomizing would only hide coverage gaps.
//
// release_condition bitmap (state/payment_policy.rs:4-16):
//   bit0 (0b0001) RELEASE_DUE_DATE  — gate on milestone_timestamps[idx]
//   bit1 (0b0010) RELEASE_GATEWAY   — caller must == gateway signer
//   bit2 (0b0100) RELEASE_OWNER     — caller must == owner
//   bit3 (0b1000) RELEASE_RECIPIENT — caller must == recipient
//
// Bits 1-3 are mutually exclusive (at most one set), enforced at creation
// (policies/milestone.rs:78-79). So of the 16 values:
//   CREATION-VALID (8):  {0,1,2,3,4,5,8,9}  — <=1 signer bit
//   CREATION-INVALID (8): {6,7,10,11,12,13,14,15} — multiple signer bits
//
// This test pins BOTH layers:
//   1. validate_milestone_policy: the creation gate.
//   2. validate_policy_execution: the execute-time gate (signer auth + due).
//
// Run: cd programs/tributary && cargo test --test milestone_release_enumeration

use tributary::policies::validate_milestone_policy;
use tributary::shared::schedule::{validate_policy_execution, MilestoneSigners};
use tributary::state::{
    PolicyType, RELEASE_DUE_DATE, RELEASE_GATEWAY, RELEASE_OWNER, RELEASE_RECIPIENT,
};

use anchor_lang::prelude::Pubkey;

/// Build a MilestoneSigners with a SPECIFIC caller. Leaked for 'static
/// (test-process-scoped). ponytail: leak is fine for a short-lived test.
fn signers(
    caller: Pubkey,
    gateway: Pubkey,
    owner: Pubkey,
    recipient: Pubkey,
) -> MilestoneSigners<'static> {
    MilestoneSigners {
        caller: Box::leak(Box::new(caller)),
        gateway_signer: Box::leak(Box::new(gateway)),
        owner: Box::leak(Box::new(owner)),
        recipient: Box::leak(Box::new(recipient)),
    }
}

fn milestone(release: u8) -> PolicyType {
    PolicyType::Milestone {
        milestone_amounts: [1_000, 2_000, 3_000, 0],
        milestone_timestamps: [1_700_000_000, 1_710_000_000, 1_720_000_000, 0],
        current_milestone: 0,
        release_condition: release,
        total_milestones: 3,
        escrow_amount: 6_000,
        padding: [0u8; 53],
    }
}

/// Which release_condition values are creation-valid (<=1 signer bit, no high bits)?
fn is_creation_valid(release: u8) -> bool {
    let signer_bits = release & !RELEASE_DUE_DATE;
    signer_bits.count_ones() <= 1
}

const DUE_TS: i64 = 1_700_000_000;

#[test]
fn enumerate_all_16_release_conditions() {
    let creation_valid: Vec<u8> = (0u8..=15).filter(|&r| is_creation_valid(r)).collect();
    let creation_invalid: Vec<u8> = (0u8..=15).filter(|&r| !is_creation_valid(r)).collect();

    // ── Layer 1: validate_milestone_policy (creation gate) ──────────────
    for &r in &creation_valid {
        let ok = validate_milestone_policy(
            &[1_000, 2_000, 3_000, 0],
            0,
            r,
            3,
            6_000,
            &[DUE_TS, 1_710_000_000, 1_720_000_000, 0],
        );
        assert!(
            ok.is_ok(),
            "release 0b{r:04b} ({r}) should be creation-valid, got {ok:?}"
        );
    }
    for &r in &creation_invalid {
        let err = validate_milestone_policy(
            &[1_000, 2_000, 3_000, 0],
            0,
            r,
            3,
            6_000,
            &[DUE_TS, 1_710_000_000, 1_720_000_000, 0],
        );
        assert!(
            err.is_err(),
            "release 0b{r:04b} ({r}) should be creation-INVALID (multiple signer bits), got Ok"
        );
    }
    assert_eq!(creation_valid.len(), 8, "exactly 8 creation-valid values");
    assert_eq!(
        creation_invalid.len(),
        8,
        "exactly 8 creation-invalid values"
    );

    // ── Layer 2: validate_policy_execution (execute-time gate) ──────────
    // Fixed distinct identities for the matrix.
    let gateway = Pubkey::new_unique();
    let owner = Pubkey::new_unique();
    let recipient = Pubkey::new_unique();
    let other = Pubkey::new_unique();

    for &r in &creation_valid {
        let pt = milestone(r);
        let requires_due = r & RELEASE_DUE_DATE != 0;
        let requires_gateway = r & RELEASE_GATEWAY != 0;
        let requires_owner = r & RELEASE_OWNER != 0;
        let requires_recipient = r & RELEASE_RECIPIENT != 0;

        let at_due = if requires_due { DUE_TS } else { 0 };

        // (a) due-date gate: if bit0 set, before-due must reject.
        if requires_due {
            let s = signers(other, gateway, owner, recipient);
            let before = validate_policy_execution(&pt, DUE_TS - 1, None, &s);
            assert!(before.is_err(), "0b{r:04b}: before due must reject");
        }

        // (b) signer authorization: identify the required-caller pubkey.
        let required_caller = if requires_gateway {
            Some(gateway)
        } else if requires_owner {
            Some(owner)
        } else if requires_recipient {
            Some(recipient)
        } else {
            None
        };

        match required_caller {
            None => {
                // No signer gate: any caller at/past due succeeds.
                let s = signers(other, gateway, owner, recipient);
                let res = validate_policy_execution(&pt, at_due, None, &s);
                assert!(res.is_ok(), "0b{r:04b}: no-signer-gate should pass at due");
            }
            Some(needed) => {
                // Correct caller passes.
                let s = signers(needed, gateway, owner, recipient);
                let res = validate_policy_execution(&pt, at_due, None, &s);
                assert!(res.is_ok(), "0b{r:04b}: correct caller should pass");

                // Wrong caller rejects (Unauthorized).
                let s = signers(other, gateway, owner, recipient);
                let res = validate_policy_execution(&pt, at_due, None, &s);
                assert!(
                    res.is_err(),
                    "0b{r:04b}: wrong caller must reject (Unauthorized), got Ok"
                );
            }
        }
    }
}

#[test]
fn current_milestone_at_total_rejects() {
    // current_milestone >= total_milestones → PolicyPaused (exhausted).
    let mut pt = milestone(RELEASE_DUE_DATE);
    if let PolicyType::Milestone {
        current_milestone,
        total_milestones,
        ..
    } = &mut pt
    {
        *current_milestone = *total_milestones; // exhausted
    }
    let s = signers(
        Pubkey::new_unique(),
        Pubkey::new_unique(),
        Pubkey::new_unique(),
        Pubkey::new_unique(),
    );
    let res = validate_policy_execution(&pt, DUE_TS, None, &s);
    assert!(
        res.is_err(),
        "exhausted milestone (current >= total) must reject"
    );
}

#[test]
fn milestone_returns_correct_amount_per_index() {
    // validate_policy_execution returns milestone_amounts[idx], not a flat amount.
    let s = signers(
        Pubkey::new_unique(),
        Pubkey::new_unique(),
        Pubkey::new_unique(),
        Pubkey::new_unique(),
    );
    for idx in 0u8..3 {
        let mut pt = milestone(0); // no gates → anyone, anytime
        if let PolicyType::Milestone {
            current_milestone, ..
        } = &mut pt
        {
            *current_milestone = idx;
        }
        let amt = validate_policy_execution(&pt, 0, None, &s).expect("no-gate milestone executes");
        let expected = [1_000u64, 2_000, 3_000][idx as usize];
        assert_eq!(
            amt, expected,
            "milestone {idx} must return its configured amount"
        );
    }
}
