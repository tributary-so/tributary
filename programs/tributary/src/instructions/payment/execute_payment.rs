use crate::{
    constants::*,
    error::TributaryError,
    shared::delegation::{resolve_delegate, token_account_has_any_delegate},
    shared::mint::validate_mint_compatible,
    shared::referral::{process_referral_rewards, AuthorityMode},
    shared::schedule::{advance_policy, validate_policy_execution, MilestoneSigners},
    state::*,
};
use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TransferChecked};

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// CHECK: The gateway authority that can trigger payments
    #[account(
        constraint = (
            fee_payer.key() == gateway.signer      // gateway can execute
            || fee_payer.key() == user_payment.owner  // payer can execute
            || fee_payer.key() == payment_policy.recipient // recipient can only execute pay-as-you-go!
        ),
    )]
    pub fee_payer: Signer<'info>,

    #[account(
        seeds = [PAYMENTS_SEED],
        bump
    )]
    /// CHECK: Program-derived delegate authority for token transfers
    pub payments_delegate: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [PAYMENT_POLICY_SEED, payment_policy.user_payment.as_ref(), payment_policy.policy_id.to_le_bytes().as_ref()],
        bump = payment_policy.bump,
        constraint = payment_policy.status == PolicyStatus::Active @ crate::error::TributaryError::PolicyPaused,
    )]
    pub payment_policy: Box<Account<'info, PaymentPolicy>>,

    #[account(
        mut,
        seeds = [USER_PAYMENT_SEED, user_payment.owner.as_ref(), user_payment.token_mint.as_ref()],
        bump = user_payment.bump,
        constraint = user_payment.is_active,
    )]
    pub user_payment: Box<Account<'info, UserPayment>>,

    #[account(
        mut,
        seeds = [GATEWAY_SEED, gateway.authority.as_ref()],
        bump = gateway.bump,
        constraint = gateway.is_active,
        constraint = gateway.key() == payment_policy.gateway,
    )]
    pub gateway: Box<Account<'info, PaymentGateway>>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = !config.emergency_pause,
    )]
    pub config: Box<Account<'info, ProgramConfig>>,

    #[account(
        mut,
        constraint = user_token_account.key() == user_payment.token_account,
        constraint = user_token_account.mint == user_payment.token_mint,
        constraint = token_account_has_any_delegate(
            &user_token_account.delegate,
            &[&payments_delegate.key(), &user_payment.key()]
        ) @ crate::error::TributaryError::NoDelegateSet,
    )]
    pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        constraint = mint.key() == user_payment.token_mint
            @ TributaryError::TokenMintMismatch,
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        constraint = recipient_token_account.mint == user_payment.token_mint,
        constraint = recipient_token_account.owner == payment_policy.recipient,
    )]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = gateway_fee_account.mint == user_payment.token_mint,
        constraint = gateway_fee_account.owner == gateway.fee_recipient,
    )]
    pub gateway_fee_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = protocol_fee_account.mint == user_payment.token_mint,
        constraint = protocol_fee_account.owner == config.fee_recipient,
    )]
    pub protocol_fee_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl<'info> ExecutePayment<'info> {
    pub fn handler(
        ctx: Context<'_, '_, 'info, 'info, ExecutePayment<'info>>,
        payment_amount: Option<u64>,
    ) -> Result<()> {
        // Re-validate the mint at execution time: Token-2022 extensions
        // (TransferHook, TransferFee) are mutable post-creation, so a mint that
        // was clean when the UserPayment was registered could have become
        // hostile before this payment runs.
        validate_mint_compatible(&ctx.accounts.mint.to_account_info())?;

        let remaining_accounts = ctx.remaining_accounts;
        let accounts = ctx.accounts;
        let payment_policy = &mut accounts.payment_policy;
        let user_payment = &mut accounts.user_payment;
        let gateway = &accounts.gateway;
        let config = &accounts.config;
        let clock = Clock::get()?;
        let payment_policy_key = payment_policy.key();
        let fee_payer_key = accounts.fee_payer.key();
        let user_owner = user_payment.owner;
        let user_token_account_info = accounts.user_token_account.to_account_info();
        let recipient_token_account_info = accounts.recipient_token_account.to_account_info();
        let gateway_fee_account_info = accounts.gateway_fee_account.to_account_info();
        let protocol_fee_account_info = accounts.protocol_fee_account.to_account_info();
        let payments_delegate_info = accounts.payments_delegate.to_account_info();
        let token_program_info = accounts.token_program.to_account_info();
        let mint_pubkey = accounts.mint.key();
        let mint_decimals = accounts.mint.decimals;
        let mint_info = accounts.mint.to_account_info();
        let payments_delegate_bump = ctx.bumps.payments_delegate;
        let expected_mint = accounts.user_token_account.mint;

        let user_payment_info = user_payment.to_account_info();
        let delegate = accounts.user_token_account.delegate;

        let pull_resolution = resolve_delegate(
            user_payment,
            user_payment_info.clone(),
            payments_delegate_info.clone(),
            payments_delegate_bump,
            &delegate,
        )?;
        let seed_slices: Vec<&[u8]> = pull_resolution.seeds.iter().map(|s| s.as_slice()).collect();
        let signer_seeds: &[&[u8]] = &seed_slices;
        let authority_info = pull_resolution.authority_info;

        // ── Validate policy + resolve amount (shared with execute_composable) ──
        // Single dispatch over PolicyType: timing gates, milestone
        // release_condition signer bits, and PayAsYouGo chunk/period bounds
        // all live in `shared::schedule::validate_policy_execution`. Returns
        // the authoritative payment amount (configured amount for
        // Subscription/Milestone, the caller-supplied chunk for PayAsYouGo).
        let schedule_amount = validate_policy_execution(
            &payment_policy.policy_type,
            clock.unix_timestamp,
            payment_amount,
            &MilestoneSigners {
                caller: &fee_payer_key,
                gateway_signer: &gateway.signer,
                owner: &user_owner,
                recipient: &payment_policy.recipient,
            },
        )?;
        let payment_amount = schedule_amount;

        // Only PayAsYouGo and UpTo allow the recipient to trigger execution.
        // PayAsYouGo: provider claims chunks as usage accrues.
        // UpTo: resource server (often the recipient) settles the actual
        // amount after measuring usage. Subscription / Milestone / OneTime
        // require the gateway signer or the owner — the recipient cannot
        // pull on their own authority.
        // (Milestone release_condition::RELEASE_RECIPIENT authorizes the
        // recipient to release escrow, but the caller must still be the
        // gateway signer or owner — see validate_policy_execution above.)
        if fee_payer_key == payment_policy.recipient
            && !matches!(
                &payment_policy.policy_type,
                PolicyType::PayAsYouGo { .. } | PolicyType::UpTo { .. }
            )
        {
            return Err(TributaryError::Unauthorized.into());
        }

        // Calculate fees (single shared helper for both net/gross modes).
        let fee_breakdown = crate::shared::fees::calculate_fees(
            payment_amount,
            gateway.gateway_fee_bps,
            gateway.effective_protocol_share_bps(config.protocol_share_bps),
            gateway.scheduler_share_bps,
            gateway.referral_allocation_bps,
            gateway.is_referral_enabled(),
            gateway.is_amount_net(),
        )?;
        let protocol_cut = fee_breakdown.protocol_cut;
        let scheduler_cut = fee_breakdown.scheduler_cut;
        let recipient_amount = fee_breakdown.recipient_amount;
        let total_amount_from_user = fee_breakdown.total_from_user;

        // Validate delegated amount is sufficient
        require!(
            accounts.user_token_account.delegated_amount >= total_amount_from_user,
            TributaryError::InsufficientDelegatedAmount
        );

        // Check if user has sufficient balance
        require!(
            accounts.user_token_account.amount >= total_amount_from_user,
            crate::error::TributaryError::InsufficientBalance
        );

        let seeds = &[signer_seeds];

        // ── Scheduler cut routing (ADR-0017) ───────────────────────────
        // Trusted path (fee_payer == gateway.signer): scheduler_cut merges
        // into gateway.fee_recipient — single transfer.
        // Permissionless path (anyone else): scheduler_cut routes to the
        // caller's ATA, supplied as the LAST remaining_account. The
        // account is stripped before referral processing so the referral
        // parser sees only its own accounts.
        let is_permissionless = fee_payer_key != gateway.signer;
        let needs_scheduler_ata = is_permissionless && gateway.scheduler_share_bps > 0;

        let (referral_slice, scheduler_ata_info) = if needs_scheduler_ata {
            require!(
                !remaining_accounts.is_empty(),
                TributaryError::MissingSchedulerFeeAccount
            );
            let last = remaining_accounts.len() - 1;
            (
                &remaining_accounts[..last],
                Some(remaining_accounts[last].clone()),
            )
        } else {
            (remaining_accounts, None)
        };

        // Process referral rewards if enabled (helper short-circuits when off).
        let _referral_pool = process_referral_rewards(
            gateway,
            fee_breakdown.total_fee,
            referral_slice,
            user_token_account_info.clone(),
            authority_info.clone(),
            AuthorityMode::PdaSigner(seeds),
            token_program_info.clone(),
            mint_info.clone(),
            mint_decimals,
            expected_mint,
            gateway.key(),
            payment_policy_key,
            payment_amount,
            clock.unix_timestamp,
            user_owner,
        )?;

        if recipient_amount > 0 {
            let cpi_accounts = TransferChecked {
                from: user_token_account_info.clone(),
                mint: mint_info.clone(),
                to: recipient_token_account_info.clone(),
                authority: authority_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, seeds);
            token_interface::transfer_checked(cpi_ctx, recipient_amount, mint_decimals)?;
        }

        if is_permissionless {
            if scheduler_cut > 0 {
                let scheduler_ata = scheduler_ata_info
                    .as_ref()
                    .ok_or(TributaryError::MissingSchedulerFeeAccount)?;
                {
                    let sta_data = scheduler_ata.try_borrow_data()?;
                    require!(
                        sta_data.len() >= 64,
                        TributaryError::InvalidSchedulerFeeAccount
                    );
                    let sta_mint = Pubkey::try_from(&sta_data[0..32]).unwrap_or_default();
                    let sta_owner = Pubkey::try_from(&sta_data[32..64]).unwrap_or_default();
                    require!(
                        sta_mint == expected_mint,
                        TributaryError::InvalidSchedulerFeeAccount
                    );
                    require!(
                        sta_owner == fee_payer_key,
                        TributaryError::InvalidSchedulerFeeAccount
                    );
                }
                let cpi_accounts = TransferChecked {
                    from: user_token_account_info.clone(),
                    mint: mint_info.clone(),
                    to: scheduler_ata.clone(),
                    authority: authority_info.clone(),
                };
                let cpi_ctx =
                    CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, seeds);
                token_interface::transfer_checked(cpi_ctx, scheduler_cut, mint_decimals)?;
            }

            if fee_breakdown.gateway_residual > 0 {
                let cpi_accounts = TransferChecked {
                    from: user_token_account_info.clone(),
                    mint: mint_info.clone(),
                    to: gateway_fee_account_info.clone(),
                    authority: authority_info.clone(),
                };
                let cpi_ctx =
                    CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, seeds);
                token_interface::transfer_checked(
                    cpi_ctx,
                    fee_breakdown.gateway_residual,
                    mint_decimals,
                )?;
            }
        } else {
            let gateway_amount = fee_breakdown
                .gateway_residual
                .checked_add(scheduler_cut)
                .ok_or(TributaryError::ArithmeticOverflow)?;

            if gateway_amount > 0 {
                let cpi_accounts = TransferChecked {
                    from: user_token_account_info.clone(),
                    mint: mint_info.clone(),
                    to: gateway_fee_account_info.clone(),
                    authority: authority_info.clone(),
                };
                let cpi_ctx =
                    CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, seeds);
                token_interface::transfer_checked(cpi_ctx, gateway_amount, mint_decimals)?;
            }
        }

        if protocol_cut > 0 {
            let cpi_accounts = TransferChecked {
                from: user_token_account_info.clone(),
                mint: mint_info.clone(),
                to: protocol_fee_account_info.clone(),
                authority: authority_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, seeds);
            token_interface::transfer_checked(cpi_ctx, protocol_cut, mint_decimals)?;
        }

        payment_policy.total_paid = payment_policy
            .total_paid
            .checked_add(total_amount_from_user)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        // Advance the schedule now that the transfer succeeded — same helper
        // `execute_composable` uses: Subscription advances `next_payment_due`
        // via calendar-month math and decrements `max_renewals`; Milestone
        // bumps `current_milestone`; PayAsYouGo accumulates/resets the period
        // total. Returns `true` when the policy is exhausted.
        let should_complete = advance_policy(
            &mut payment_policy.policy_type,
            clock.unix_timestamp,
            payment_amount,
        )?;

        // Increment payment_count after a successful execution. Both policy
        // paths (PaymentPolicy + ComposablePolicy) increment exactly once
        // here/at the equivalent composable site, post-transfer/post-swap.
        // `record_id` in PaymentRecord reflects this post-increment value.
        payment_policy.payment_count = payment_policy
            .payment_count
            .checked_add(1)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        payment_policy.updated_at = clock.unix_timestamp;

        // Terminal transition: `Completed` is the program-internal terminal
        // state (subscription `max_renewals` exhausted, or all milestones
        // released). Owners cannot reach `Completed` via
        // `change_payment_policy_status`; they only get Active<->Paused.
        if should_complete {
            payment_policy.status = PolicyStatus::Completed;
        }

        // Update user payment account
        user_payment.updated_at = clock.unix_timestamp;

        // Emit payment record event
        emit!(PaymentRecord {
            payment_policy: payment_policy.key(),
            gateway: gateway.key(),
            amount: payment_amount,
            timestamp: clock.unix_timestamp,
            memo: payment_policy.memo,
            record_id: payment_policy.payment_count,
            payer: user_payment.owner,
            recipient: accounts.recipient_token_account.owner.key(),
            token_mint: mint_pubkey,
        });

        msg!(
            "Payment executed: {} -> recipient, {} gateway fee, {} scheduler cut, {} protocol fee",
            recipient_amount,
            fee_breakdown.gateway_residual,
            if is_permissionless { scheduler_cut } else { 0 },
            protocol_cut
        );

        Ok(())
    }
}
