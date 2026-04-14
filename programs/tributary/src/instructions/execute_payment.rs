use crate::{constants::*, error::TributaryError, policies::*, state::*};
use anchor_lang::{prelude::*, solana_program::program_option::COption};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

/// Context for referral reward distribution
struct ReferralContext<'a, 'info> {
    remaining_accounts: &'info [AccountInfo<'info>],
    user_token_account_info: AccountInfo<'info>,
    payments_delegate_info: AccountInfo<'info>,
    token_program_info: AccountInfo<'info>,
    signer_seeds: &'a [&'a [&'a [u8]]],
    expected_mint: Pubkey,
    payment_policy_key: Pubkey,
    gateway_key: Pubkey,
    payment_amount: u64,
    timestamp: i64,
}

/// Process referral rewards - extracted to reduce stack frame size
#[inline(never)]
fn process_referral_rewards<'a, 'info>(
    ctx: ReferralContext<'a, 'info>,
    gateway_fee: u64,
    referral_allocation_bps: u16,
    referral_tiers_bps: &[u16; 3],
) -> Result<()> {
    let referral_pool = gateway_fee
        .checked_mul(referral_allocation_bps as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    if referral_pool == 0 {
        return Ok(());
    }

    let level1_reward = referral_pool
        .checked_mul(referral_tiers_bps[0] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let level2_reward = referral_pool
        .checked_mul(referral_tiers_bps[1] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    let level3_reward = referral_pool
        .checked_mul(referral_tiers_bps[2] as u64)
        .ok_or(TributaryError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(TributaryError::ArithmeticOverflow)?;

    // Parse remaining accounts into referral and token accounts
    let (referral_accounts, token_accounts) =
        parse_remaining_accounts(ctx.remaining_accounts, ctx.expected_mint)?;

    if referral_accounts.is_empty() {
        return Ok(());
    }

    let level1_referrer: Option<&AccountLoader<ReferralAccount>> = referral_accounts.last();
    let mut level2_referrer: Option<&AccountLoader<ReferralAccount>> = None;
    let mut level3_referrer: Option<&AccountLoader<ReferralAccount>> = None;
    if referral_accounts.len() == 3 {
        level2_referrer = referral_accounts.get(referral_accounts.len().saturating_sub(2));
        level3_referrer = referral_accounts.first();
    } else if referral_accounts.len() == 2 {
        level2_referrer = referral_accounts.first();
    }

    emit!(ReferralRewardDistributedRecord {
        payment_policy: ctx.payment_policy_key,
        gateway: ctx.gateway_key,
        payment_amount: ctx.payment_amount,
        timestamp: ctx.timestamp,
        rewards: [
            level1_referrer.map(|loader| ReferralReward {
                pubkey: loader.key(),
                reward: level1_reward,
            }),
            level2_referrer.map(|loader| ReferralReward {
                pubkey: loader.key(),
                reward: level2_reward,
            }),
            level3_referrer.map(|loader| ReferralReward {
                pubkey: loader.key(),
                reward: level3_reward,
            }),
        ],
    });

    // Transfer rewards and update total_earned
    transfer_referral_reward(&ctx, &token_accounts, level1_referrer, level1_reward)?;
    transfer_referral_reward(&ctx, &token_accounts, level2_referrer, level2_reward)?;
    transfer_referral_reward(&ctx, &token_accounts, level3_referrer, level3_reward)?;

    msg!(
        "Referral pool: {} (L1: {}, L2: {}, L3: {})",
        referral_pool,
        level1_reward,
        level2_reward,
        level3_reward
    );

    Ok(())
}

/// Parse remaining accounts into referral AccountLoaders and token account infos
#[inline(never)]
fn parse_remaining_accounts<'info>(
    remaining_accounts: &'info [AccountInfo<'info>],
    expected_mint: Pubkey,
) -> Result<(
    Vec<AccountLoader<'info, ReferralAccount>>,
    Vec<(Pubkey, AccountInfo<'info>)>,
)> {
    let mut referral_accounts = Vec::new();
    let mut token_accounts = Vec::new();

    for acc in remaining_accounts {
        if acc.data_len() == ReferralAccount::SIZE {
            if let Ok(loader) = AccountLoader::<ReferralAccount>::try_from(acc) {
                // Verify we can actually load it (validates discriminator)
                if loader.load().is_ok() {
                    referral_accounts.push(loader);
                } else {
                    return Err(TributaryError::ReferrerAccountInvalid.into());
                }
            } else {
                return Err(TributaryError::ReferrerAccountInvalid.into());
            }
        } else if acc.data_len() == 165 {
            // TokenAccount::LEN {
            if let Ok(token_acc) = Account::<TokenAccount>::try_from(acc.as_ref()) {
                if token_acc.mint == expected_mint {
                    token_accounts.push((token_acc.owner, acc.clone()));
                } else {
                    return Err(TributaryError::ReferrerATAInvalid.into());
                }
            } else {
                return Err(TributaryError::ReferrerATAInvalid.into());
            }
        }
    }

    if referral_accounts.len() != token_accounts.len() {
        msg!(
            "We have {} referrals vs {} atas",
            referral_accounts.len(),
            token_accounts.len()
        );
        return Err(TributaryError::MismatchAtaReferralAccountNumbers.into());
    }

    Ok((referral_accounts, token_accounts))
}

/// Transfer reward to a single referrer and update their total_earned.
/// Fails if a ReferralAccount is provided but no matching ATA is found.
#[inline(never)]
fn transfer_referral_reward<'info>(
    ctx: &ReferralContext<'_, 'info>,
    token_accounts: &[(Pubkey, AccountInfo<'info>)],
    referral_loader: Option<&AccountLoader<'info, ReferralAccount>>,
    reward: u64,
) -> Result<()> {
    if reward == 0 {
        return Ok(());
    }

    if let Some(loader) = referral_loader {
        // Get the referral account owner to find their token account
        let referrer_pubkey = loader.load()?.owner;

        // Find the ATA whose owner matches the ReferralAccount owner - fail if missing
        let (_, ata_info) = token_accounts
            .iter()
            .find(|(owner, _)| *owner == referrer_pubkey)
            .ok_or(TributaryError::MissingReferralAta)?;

        // Transfer the reward
        let cpi_accounts = Transfer {
            from: ctx.user_token_account_info.clone(),
            to: ata_info.clone(),
            authority: ctx.payments_delegate_info.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.token_program_info.clone(),
            cpi_accounts,
            ctx.signer_seeds,
        );
        token::transfer(cpi_ctx, reward)?;

        // Update total_earned in the ReferralAccount
        let mut referral_account = loader.load_mut()?;
        referral_account.total_earned = referral_account
            .total_earned
            .checked_add(reward)
            .ok_or(TributaryError::ArithmeticOverflow)?;
    }

    Ok(())
}

pub fn token_account_has_delegate(
    token_account: &TokenAccount,
    expected_delegate: &Pubkey,
) -> bool {
    match token_account.delegate {
        COption::Some(delegate) => delegate == *expected_delegate,
        COption::None => false,
    }
}

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
        constraint = payment_policy.status == PaymentStatus::Active @ crate::error::TributaryError::PolicyPaused,
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
        constraint = token_account_has_delegate(&user_token_account, &payments_delegate.key()) @ crate::error::TributaryError::NoDelegateSet,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = recipient_token_account.mint == user_payment.token_mint,
        constraint = recipient_token_account.owner == payment_policy.recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = gateway_fee_account.mint == user_payment.token_mint,
        constraint = gateway_fee_account.owner == gateway.fee_recipient,
    )]
    pub gateway_fee_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = protocol_fee_account.mint == user_payment.token_mint,
        constraint = protocol_fee_account.owner == config.fee_recipient,
    )]
    pub protocol_fee_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl<'info> ExecutePayment<'info> {
    pub fn handler(
        ctx: Context<'_, '_, 'info, 'info, ExecutePayment<'info>>,
        payment_amount: Option<u64>,
    ) -> Result<()> {
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
        let payments_delegate_bump = ctx.bumps.payments_delegate;
        let expected_mint = accounts.user_token_account.mint;

        // Get appropriate strategy for policy type
        let mut strategy = crate::policies::get_policy_strategy(payment_policy)?;

        // Execute policy-specific logic
        let execution_result = strategy.execute(
            payment_policy,
            payment_amount,
            clock.unix_timestamp,
            &fee_payer_key,
            &user_owner,
            gateway,
        )?;
        let payment_amount = execution_result.payment_amount;

        // Only in the case of PayAsYouGo can the recipient trigger payments
        if fee_payer_key == payment_policy.recipient {
            if !matches!(&payment_policy.policy_type, PolicyType::PayAsYouGo { .. }) {
                return Err(TributaryError::Unauthorized.into());
            }
        }

        // Additional validation for pay-as-you-go policies
        if let PolicyType::PayAsYouGo { .. } = &payment_policy.policy_type {
            let mut payg_strategy = PayAsYouGoStrategy;
            payg_strategy.validate_payment_constraints(
                payment_policy,
                payment_amount,
                clock.unix_timestamp,
            )?;
            payg_strategy.update_period_total(
                payment_policy,
                payment_amount,
                clock.unix_timestamp,
            )?;
        }

        // Calculate fees (same calculation for both modes)
        let gateway_fee = payment_amount
            .checked_mul(gateway.gateway_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        let protocol_fee_bps = if gateway.is_custom_protocol_fee_enabled() {
            gateway.custom_protocol_fee_bps
        } else {
            config.protocol_fee_bps
        };

        let protocol_fee = payment_amount
            .checked_mul(protocol_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        // Calculate recipient amount and total based on net/gross mode
        let (recipient_amount, total_amount_from_user) = if gateway.is_amount_net() {
            // Net mode: payment_amount is what recipient receives, fees added on top
            let total = payment_amount
                .checked_add(gateway_fee)
                .ok_or(TributaryError::ArithmeticOverflow)?
                .checked_add(protocol_fee)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            (payment_amount, total)
        } else {
            // Gross mode (default): payment_amount includes fees, recipient gets less
            let recipient = payment_amount
                .checked_sub(gateway_fee)
                .ok_or(TributaryError::ArithmeticOverflow)?
                .checked_sub(protocol_fee)
                .ok_or(TributaryError::ArithmeticOverflow)?;
            (recipient, payment_amount)
        };

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

        // Transfer to recipient
        let seeds = &[PAYMENTS_SEED, &[payments_delegate_bump]];
        let signer_seeds = &[&seeds[..]];

        if recipient_amount > 0 {
            let cpi_accounts = Transfer {
                from: user_token_account_info.clone(),
                to: recipient_token_account_info.clone(),
                authority: payments_delegate_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, recipient_amount)?;
        }

        // Transfer gateway fee
        if gateway_fee > 0 {
            let cpi_accounts = Transfer {
                from: user_token_account_info.clone(),
                to: gateway_fee_account_info.clone(),
                authority: payments_delegate_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, gateway_fee)?;
        }

        // Transfer protocol fee
        if protocol_fee > 0 {
            let cpi_accounts = Transfer {
                from: user_token_account_info.clone(),
                to: protocol_fee_account_info.clone(),
                authority: payments_delegate_info.clone(),
            };
            let cpi_ctx =
                CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, protocol_fee)?;
        }

        // Process referral rewards if enabled
        if gateway.is_referral_enabled() && gateway.referral_allocation_bps > 0 {
            let referral_ctx = ReferralContext {
                remaining_accounts,
                user_token_account_info: user_token_account_info.clone(),
                payments_delegate_info: payments_delegate_info.clone(),
                token_program_info: token_program_info.clone(),
                signer_seeds,
                expected_mint,
                payment_policy_key,
                gateway_key: gateway.key(),
                payment_amount,
                timestamp: clock.unix_timestamp,
            };
            process_referral_rewards(
                referral_ctx,
                gateway_fee,
                gateway.referral_allocation_bps,
                &gateway.referral_tiers_bps,
            )?;
        }

        payment_policy.total_paid = payment_policy
            .total_paid
            .checked_add(payment_amount)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        payment_policy.payment_count = payment_policy
            .payment_count
            .checked_add(1)
            .ok_or(TributaryError::ArithmeticOverflow)?;
        payment_policy.updated_at = clock.unix_timestamp;

        // Pause policy if needed based on strategy recommendation
        if execution_result.should_pause {
            payment_policy.status = PaymentStatus::Paused;
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
        });

        msg!(
            "Payment executed: {} -> recipient, {} gateway fee, {} protocol fee",
            recipient_amount,
            gateway_fee,
            protocol_fee
        );

        Ok(())
    }
}
