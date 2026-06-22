//! Referral chain reward distribution.
//!
//! Two-stage split of the gateway fee across a payer's ancestor referral
//! chain (up to [`MAX_REFERRAL_CHAIN_DEPTH`] levels deep). Extracted from
//! `utils.rs` (audit finding M1) — this module owns:
//!
//! * [`ReferralContext`] / [`AuthorityMode`] — call-site plumbing.
//! * [`process_referral_rewards`] — top-level entrypoint invoked from
//!   `transfer`, `execute_payment`, and `execute_composable`.
//! * [`parse_and_validate_referral_accounts`] — rigid parsing of the
//!   `remaining_accounts` slice into `(payer, chain, ATAs)` triples.
//! * [`validate_referral_chain_topology`] — pure Pubkey-graph checks.
//!
//! All math here is bps-based and uses checked arithmetic. The chain is
//! bounded by `MAX_REFERRAL_CHAIN_DEPTH` (3) so the inner loops are O(1)
//! in program-size terms.

use crate::{error::TributaryError, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount as LegacyTokenAccount;
use anchor_spl::token_interface::{self, TransferChecked};

/// Maximum depth of the referral reward chain (L1, L2, L3).
pub const MAX_REFERRAL_CHAIN_DEPTH: usize = 3;

pub enum AuthorityMode<'a> {
    Direct,
    PdaSigner(&'a [&'a [&'a [u8]]]),
}

pub struct ReferralContext<'a, 'info> {
    pub remaining_accounts: &'info [AccountInfo<'info>],
    pub source_token_account: AccountInfo<'info>,
    pub authority_info: AccountInfo<'info>,
    pub authority_mode: AuthorityMode<'a>,
    pub token_program: AccountInfo<'info>,
    pub mint_info: AccountInfo<'info>,
    pub mint_decimals: u8,
    pub expected_mint: Pubkey,
    pub gateway_key: Pubkey,
    pub payment_policy_key: Pubkey,
    pub payment_amount: u64,
    pub timestamp: i64,
    /// Wallet of the paying user. Used to bind the supplied referral chain
    /// to the actual payer via their own `ReferralAccount`.
    pub payer_wallet: Pubkey,
}

/// Validation of a referral chain's topology.
///
/// Given the payer's own `referrer` field (i.e. the L1 ReferralAccount PDA
/// stored on the paying user's `ReferralAccount`) and a slice of
/// `(account_key, referrer_field)` tuples representing the supplied chain
/// `[L1, L2, L3]`, verify that:
///
/// 1. The chain is non-empty and does not exceed `MAX_REFERRAL_CHAIN_DEPTH`.
/// 2. `chain[0].key == payer_referrer` — binds the chain to the payer.
/// 3. `chain[i].referrer == chain[i+1].key` for all adjacent pairs — the
///    supplied accounts form a real ancestor chain, not arbitrary accounts.
/// 4. If the chain is shorter than `MAX_REFERRAL_CHAIN_DEPTH`, the final
///    element's `referrer` MUST be `Pubkey::default()` (no deeper level
///    exists on-chain). When the chain is at max depth the tail is allowed
///    to point anywhere — rewards are capped at depth 3 regardless.
///
/// Duplicate detection across `chain` keys is the caller's responsibility
/// (it holds a small `Vec<Pubkey>` seen-set covering payer + chain — the
/// chain is bounded by `MAX_REFERRAL_CHAIN_DEPTH`, so O(n²) is cheaper than
/// a `BTreeSet` and avoids the BPF stack overflow from `core::slice::sort`).
fn validate_referral_chain_topology(
    payer_referrer: Pubkey,
    chain: &[(Pubkey, Pubkey)],
) -> Result<()> {
    require!(
        !chain.is_empty(),
        TributaryError::InvalidReferralChainOrdering
    );
    require!(
        chain.len() <= MAX_REFERRAL_CHAIN_DEPTH,
        TributaryError::MaxReferralDepthExceeded
    );

    // Bind chain origin to the payer.
    require!(
        chain[0].0 == payer_referrer,
        TributaryError::InvalidReferralChainOrdering
    );

    // Walk the chain: each element's referrer must equal the next element's key.
    for window in chain.windows(2) {
        let (cur_key, cur_referrer) = window[0];
        let (next_key, _) = window[1];
        require!(
            cur_referrer == next_key,
            TributaryError::InvalidReferralChainOrdering
        );
        // Defensive: cur_referrer cannot point at itself.
        require!(
            cur_referrer != cur_key,
            TributaryError::CircularReferralChain
        );
    }

    // If chain is shorter than max depth, the tail must terminate at default
    // (no deeper ancestor exists on-chain).
    if chain.len() < MAX_REFERRAL_CHAIN_DEPTH {
        let (tail_key, tail_referrer) = *chain.last().unwrap();
        require!(
            tail_referrer == Pubkey::default(),
            TributaryError::InvalidReferralChainOrdering
        );
        // Defensive: tail must not self-reference.
        require!(
            tail_key != Pubkey::default(),
            TributaryError::CircularReferralChain
        );
    }

    Ok(())
}

/// Distribute referral rewards from a gateway fee.
///
/// Two-stage split:
///   1. `referral_allocation_bps` (≤ 2500) carves a *referral pool* out of the
///      **gateway fee**: `pool = gateway_fee * allocation_bps / 10000`.
///   2. `referral_tiers_bps` (must sum to 10000) splits that pool across the
///      3 chain levels: `tier_reward[i] = pool * tier_bps[i] / 10000`.
///
/// Note: `tier_bps` is a share of the *pool*, not of the gateway fee. Effective
/// per-level share of the gateway fee is `tier_bps * allocation_bps / 10000`.
/// Returns the total referral pool amount (0 if the program is off or no pool).
#[inline(never)]
pub fn process_referral_rewards<'a, 'info>(
    ctx: ReferralContext<'a, 'info>,
    gateway_fee: u64,
    referral_allocation_bps: u16,
    referral_tiers_bps: &[u16; 3],
) -> Result<u64> {
    // Stage 1: carve the referral pool out of the gateway fee.
    let referral_pool = gateway_fee
        .checked_mul(referral_allocation_bps as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    if referral_pool == 0 {
        return Ok(referral_pool);
    }

    // Empty remaining_accounts → caller opted out of referral rewards.
    if ctx.remaining_accounts.is_empty() {
        return Ok(0);
    }

    let (payer_loader, chain_loaders, token_accounts) = parse_and_validate_referral_accounts(
        ctx.remaining_accounts,
        ctx.expected_mint,
        ctx.gateway_key,
        ctx.payer_wallet,
    )?;

    // If the payer has no referrer, there is nothing to pay.
    if chain_loaders.is_empty() {
        return Ok(0);
    }

    // Stage 2: split the pool across the 3 levels (tier_bps = share of pool).
    let tier_rewards: [u64; MAX_REFERRAL_CHAIN_DEPTH] = [
        referral_pool
            .checked_mul(referral_tiers_bps[0] as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?,
        referral_pool
            .checked_mul(referral_tiers_bps[1] as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?,
        referral_pool
            .checked_mul(referral_tiers_bps[2] as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?,
    ];

    // Build the event payload: tier index = chain depth (L1=direct referrer).
    let mut rewards: [Option<ReferralReward>; MAX_REFERRAL_CHAIN_DEPTH] = [None, None, None];
    for (idx, loader) in chain_loaders.iter().enumerate() {
        rewards[idx] = Some(ReferralReward {
            pubkey: loader.key(),
            reward: tier_rewards[idx],
        });
    }

    emit!(ReferralRewardDistributedRecord {
        payment_policy: ctx.payment_policy_key,
        gateway: ctx.gateway_key,
        payment_amount: ctx.payment_amount,
        timestamp: ctx.timestamp,
        rewards,
    });

    for (idx, loader) in chain_loaders.iter().enumerate() {
        transfer_referral_reward(&ctx, &token_accounts, loader, tier_rewards[idx])?;
    }

    msg!(
        "Referral pool: {} distributed across {} levels",
        referral_pool,
        chain_loaders.len()
    );

    // Suppress unused-binding warning for `payer_loader` — its data is consumed
    // inside `parse_and_validate_referral_accounts` to anchor the chain, but
    // we hold the loader here so the underlying account stays loaded for the
    // duration of this call.
    drop(payer_loader);

    Ok(referral_pool)
}

/// Parse and fully validate the `remaining_accounts` slice for a referral
/// reward distribution.
///
/// Expected layout (only when referral rewards should be distributed):
///
/// ```text
/// remaining_accounts = [
///   payer_referral_info,       // ReferralAccount of paying user
///   R1_info, R2_info, R3_info, // 1..=3 ancestor ReferralAccounts (writable)
///   ATA_R1, ATA_R2, ATA_R3,    // matching token accounts (writable)
/// ]
/// ```
///
/// The number of ancestors `K` must match the number of ATAs and may be 0..=3.
/// When `K == 0` only the payer_referral is supplied (or remaining_accounts is
/// empty), and no rewards are distributed.
///
/// Returns the payer loader, the chain loaders ordered `[L1, L2, L3]`, and
/// the matching token accounts in chain order.
#[inline(never)]
pub fn parse_and_validate_referral_accounts<'info>(
    remaining_accounts: &'info [AccountInfo<'info>],
    expected_mint: Pubkey,
    gateway_key: Pubkey,
    payer_wallet: Pubkey,
) -> Result<(
    Option<AccountLoader<'info, ReferralAccount>>,
    Vec<AccountLoader<'info, ReferralAccount>>,
    Vec<(Pubkey, AccountInfo<'info>)>,
)> {
    if remaining_accounts.is_empty() {
        return Ok((None, Vec::new(), Vec::new()));
    }

    // ── Position 0: payer's own ReferralAccount ───────────────────────
    let payer_info = &remaining_accounts[0];
    let payer_loader = load_referral_account(payer_info, gateway_key)?;

    // Extract scalar fields we need before the borrow on `payer_loader` is
    // released — we move `payer_loader` into the return value below.
    let (payer_owner, payer_referrer, payer_key) = {
        let data = payer_loader.load()?;
        (data.owner, data.referrer, payer_loader.key())
    };
    require!(
        payer_owner == payer_wallet,
        TributaryError::PayerReferralMismatch
    );

    // Payer has no referrer → no chain to pay. Still require that the caller
    // did not sneak in extra accounts that would otherwise go unvalidated.
    if payer_referrer == Pubkey::default() {
        require!(
            remaining_accounts.len() == 1,
            TributaryError::InvalidReferralChainOrdering
        );
        return Ok((Some(payer_loader), Vec::new(), Vec::new()));
    }

    // ── Determine K = number of ancestor referral accounts ────────────
    let remaining_after_payer = remaining_accounts.len().saturating_sub(1);
    require!(
        remaining_after_payer % 2 == 0,
        TributaryError::MismatchAtaReferralAccountNumbers
    );
    let chain_len = remaining_after_payer / 2;
    require!(
        chain_len >= 1 && chain_len <= MAX_REFERRAL_CHAIN_DEPTH,
        TributaryError::MaxReferralDepthExceeded
    );

    // ── Load chain referral accounts (positions 1..=chain_len) ────────
    let mut chain_loaders: Vec<AccountLoader<'info, ReferralAccount>> =
        Vec::with_capacity(chain_len);
    let mut chain_owners: Vec<Pubkey> = Vec::with_capacity(chain_len);
    // Track all seen keys (payer + chain) for duplicate detection.
    // Chain depth is bounded by MAX_REFERRAL_CHAIN_DEPTH (3), so a small
    // fixed-size buffer beats a heap BTreeSet and avoids BPF stack overflow
    // from core::slice::sort::driftsort_main.
    let mut seen_keys: Vec<Pubkey> = Vec::with_capacity(MAX_REFERRAL_CHAIN_DEPTH + 1);
    seen_keys.push(payer_key);

    let mut topology: Vec<(Pubkey, Pubkey)> = Vec::with_capacity(chain_len);

    for i in 1..=chain_len {
        let info = &remaining_accounts[i];
        if info.data_len() != ReferralAccount::SIZE {
            return Err(TributaryError::ReferralAccountSizeMismatch.into());
        }
        if !info.is_writable {
            return Err(TributaryError::ReferrerMustBeWritable.into());
        }
        let loader = load_referral_account(info, gateway_key)?;
        // Extract scalar fields before pushing the loader (avoids holding
        // a Ref borrow across the push).
        let (key, referrer, owner) = {
            let data = loader.load()?;
            (loader.key(), data.referrer, data.owner)
        };
        if seen_keys.iter().any(|k| *k == key) {
            return Err(TributaryError::DuplicateReferralAccount.into());
        }
        seen_keys.push(key);

        topology.push((key, referrer));
        chain_owners.push(owner);
        chain_loaders.push(loader);
    }

    // ── Validate the chain topology (binds to payer) ──────────────────
    validate_referral_chain_topology(payer_referrer, &topology)?;

    // ── Load matching token accounts (positions chain_len+1..) ────────
    let mut token_accounts: Vec<(Pubkey, AccountInfo<'info>)> = Vec::with_capacity(chain_len);
    let token_start = chain_len.saturating_add(1);
    for (idx, expected_owner) in chain_owners.iter().enumerate() {
        let ata_info = &remaining_accounts[token_start + idx];
        let token_acc = Account::<LegacyTokenAccount>::try_from(ata_info.as_ref())
            .map_err(|_| TributaryError::ReferrerATAInvalid)?;

        require!(
            token_acc.mint == expected_mint,
            TributaryError::ReferrerATAMintInvalid
        );
        require!(
            token_acc.owner == *expected_owner,
            TributaryError::MissingReferralAta
        );

        token_accounts.push((*expected_owner, ata_info.clone()));
    }

    Ok((Some(payer_loader), chain_loaders, token_accounts))
}

/// Load a `ReferralAccount` from an `AccountInfo`, enforcing size, ownership,
/// discriminator, and gateway scoping. Centralizes the checks that previously
/// were inlined in `parse_remaining_accounts` so both payer and chain loaders
/// share the same rigour.
#[inline(never)]
fn load_referral_account<'info>(
    info: &'info AccountInfo<'info>,
    gateway_key: Pubkey,
) -> Result<AccountLoader<'info, ReferralAccount>> {
    if info.data_len() != ReferralAccount::SIZE {
        return Err(TributaryError::ReferralAccountSizeMismatch.into());
    }
    let loader = AccountLoader::<ReferralAccount>::try_from(info)
        .map_err(|_| TributaryError::InvalidReferralAccountDiscriminator)?;
    // Scope the borrow so we can return `loader` by value.
    {
        let data = loader
            .load()
            .map_err(|_| TributaryError::CouldNotDeserializeReferrer)?;
        require!(
            data.gateway == gateway_key,
            TributaryError::ReferrerAccountInvalid
        );
    }
    Ok(loader)
}

#[inline(never)]
fn transfer_referral_reward<'info>(
    ctx: &ReferralContext<'_, 'info>,
    token_accounts: &[(Pubkey, AccountInfo<'info>)],
    referral_loader: &AccountLoader<'info, ReferralAccount>,
    reward: u64,
) -> Result<()> {
    if reward == 0 {
        return Ok(());
    }

    let referrer_pubkey = referral_loader.load()?.owner;

    let (_, ata_info) = token_accounts
        .iter()
        .find(|(owner, _)| *owner == referrer_pubkey)
        .ok_or(TributaryError::MissingReferralAta)?;

    let cpi_accounts = TransferChecked {
        from: ctx.source_token_account.clone(),
        mint: ctx.mint_info.clone(),
        to: ata_info.clone(),
        authority: ctx.authority_info.clone(),
    };
    let cpi_ctx = match &ctx.authority_mode {
        AuthorityMode::Direct => CpiContext::new(ctx.token_program.clone(), cpi_accounts),
        AuthorityMode::PdaSigner(seeds) => {
            CpiContext::new_with_signer(ctx.token_program.clone(), cpi_accounts, *seeds)
        }
    };
    token_interface::transfer_checked(cpi_ctx, reward, ctx.mint_decimals)?;

    let mut referral_account = referral_loader.load_mut()?;
    referral_account.total_earned = referral_account
        .total_earned
        .checked_add(reward)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    Ok(())
}

// ──────────────────────────────────────────────────────────────────
// C-02: referral chain topology validation
// ──────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: derive a fresh pubkey for tests.
    fn pk(seed: u8) -> Pubkey {
        Pubkey::new_from_array([seed; 32])
    }

    #[test]
    fn test_validate_chain_single_level_bound_to_payer() {
        // payer.referrer = L1
        // chain = [L1]
        // L1.referrer = default (root)
        let payer_referrer = pk(1);
        let chain = vec![(payer_referrer, Pubkey::default())];
        assert!(validate_referral_chain_topology(payer_referrer, &chain).is_ok());
    }

    #[test]
    fn test_validate_chain_full_depth_three_levels() {
        // payer.referrer = L1, L1.referrer = L2, L2.referrer = L3
        // chain = [L1, L2, L3]; L3.referrer is unconstrained at max depth
        let l1 = pk(1);
        let l2 = pk(2);
        let l3 = pk(3);
        let chain = vec![(l1, l2), (l2, l3), (l3, pk(99))];
        assert!(validate_referral_chain_topology(l1, &chain).is_ok());
    }

    #[test]
    fn test_validate_chain_rejects_origin_not_bound_to_payer() {
        // payer.referrer = L1, but chain starts with L_EVIL
        let chain = vec![(pk(99), Pubkey::default())];
        assert!(validate_referral_chain_topology(pk(1), &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_broken_link_in_middle() {
        // chain[0].referrer != chain[1].key
        let l1 = pk(1);
        let l2 = pk(2);
        let l3 = pk(3);
        let chain = vec![(l1, pk(50)), (l2, l3), (l3, Pubkey::default())];
        assert!(validate_referral_chain_topology(l1, &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_short_chain_without_default_terminator() {
        // chain length < MAX but tail points somewhere non-default
        let l1 = pk(1);
        let chain = vec![(l1, pk(2))]; // claims L1.referrer = pk(2), but no L2 supplied
        assert!(validate_referral_chain_topology(l1, &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_empty() {
        let chain: Vec<(Pubkey, Pubkey)> = vec![];
        assert!(validate_referral_chain_topology(pk(1), &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_depth_above_max() {
        let l1 = pk(1);
        let l2 = pk(2);
        let l3 = pk(3);
        let l4 = pk(4);
        let chain = vec![(l1, l2), (l2, l3), (l3, l4), (l4, Pubkey::default())];
        assert!(validate_referral_chain_topology(l1, &chain).is_err());
    }

    #[test]
    fn test_validate_chain_rejects_self_reference() {
        let l1 = pk(1);
        // L1.referrer = L1 (self-cycle)
        let chain = vec![(l1, l1)];
        assert!(validate_referral_chain_topology(l1, &chain).is_err());
    }

    #[test]
    fn test_validate_chain_two_levels_terminates_correctly() {
        let l1 = pk(1);
        let l2 = pk(2);
        let chain = vec![(l1, l2), (l2, Pubkey::default())];
        assert!(validate_referral_chain_topology(l1, &chain).is_ok());
    }
}
