use crate::{constants::*, error::TributaryError, policies::*, state::*};
use anchor_lang::{prelude::*, solana_program::program_option::COption, Discriminator};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use arrayref::array_ref;

// Add this helper function to your program
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
        constraint = gateway.signer == fee_payer.key() || user_payment.owner == fee_payer.key(),
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
    /// Execute payment using appropriate policy strategy
    pub fn handler_execute_payment(
        ctx: Context<ExecutePayment>,
        payment_amount: Option<u64>,
    ) -> Result<()> {
        let payment_policy = &mut ctx.accounts.payment_policy;
        let user_payment = &mut ctx.accounts.user_payment;
        let gateway = &ctx.accounts.gateway;
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;
        let payment_policy_key = payment_policy.key();

        // Get appropriate strategy for policy type
        let mut strategy = crate::policies::get_policy_strategy(payment_policy)?;

        // Execute policy-specific logic
        let execution_result =
            strategy.execute(payment_policy, payment_amount, clock.unix_timestamp)?;
        let payment_amount = execution_result.payment_amount;

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

        // Validate delegated amount is sufficient
        require!(
            ctx.accounts.user_token_account.delegated_amount >= payment_amount,
            TributaryError::InsufficientDelegatedAmount
        );

        // Check if user has sufficient balance
        require!(
            ctx.accounts.user_token_account.amount >= payment_amount,
            crate::error::TributaryError::InsufficientBalance
        );

        // Calculate fees
        let gateway_fee = payment_amount
            .checked_mul(gateway.gateway_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        let protocol_fee = payment_amount
            .checked_mul(config.protocol_fee_bps as u64)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        let recipient_amount = payment_amount
            .checked_sub(gateway_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?
            .checked_sub(protocol_fee)
            .ok_or(TributaryError::ArithmeticOverflow)?;

        // Transfer to recipient
        if recipient_amount > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.payments_delegate.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let seeds = &[PAYMENTS_SEED, &[ctx.bumps.payments_delegate]];
            let signer_seeds = &[&seeds[..]];
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, recipient_amount)?;
        }

        // Transfer gateway fee
        if gateway_fee > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.gateway_fee_account.to_account_info(),
                authority: ctx.accounts.payments_delegate.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let seeds = &[PAYMENTS_SEED, &[ctx.bumps.payments_delegate]];
            let signer_seeds = &[&seeds[..]];
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, gateway_fee)?;
        }

        // Transfer protocol fee
        if protocol_fee > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.protocol_fee_account.to_account_info(),
                authority: ctx.accounts.payments_delegate.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let seeds = &[PAYMENTS_SEED, &[ctx.bumps.payments_delegate]];
            let signer_seeds = &[&seeds[..]];
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, protocol_fee)?;
        }

        // Process referral rewards if enabled
        if gateway.is_referral_enabled() && gateway.referral_allocation_bps > 0 {
            let referral_pool = gateway_fee
                .checked_mul(gateway.referral_allocation_bps as u64)
                .ok_or(TributaryError::ArithmeticOverflow)?
                .checked_div(10000)
                .ok_or(TributaryError::ArithmeticOverflow)?;

            if referral_pool > 0 {
                let tiers = &gateway.referral_tiers_bps;
                let level1_reward = referral_pool
                    .checked_mul(tiers[0] as u64)
                    .ok_or(TributaryError::ArithmeticOverflow)?
                    .checked_div(10000)
                    .ok_or(TributaryError::ArithmeticOverflow)?;

                let level2_reward = referral_pool
                    .checked_mul(tiers[1] as u64)
                    .ok_or(TributaryError::ArithmeticOverflow)?
                    .checked_div(10000)
                    .ok_or(TributaryError::ArithmeticOverflow)?;

                let level3_reward = referral_pool
                    .checked_mul(tiers[2] as u64)
                    .ok_or(TributaryError::ArithmeticOverflow)?
                    .checked_div(10000)
                    .ok_or(TributaryError::ArithmeticOverflow)?;

                // Parse referral accounts from remaining_accounts
                // SDK's getReferralChain() returns [L1, L2, L3] where L3 is first/original
                // But rewards should be: L3 (original) = 60%, L2 = 30%, L1 (immediate) = 10%
                // So we need to process remaining_accounts in reverse order
                let mut level1_referrer: Option<Pubkey> = None;
                let mut level2_referrer: Option<Pubkey> = None;
                let mut level3_referrer: Option<Pubkey> = None;

                // Collect all valid referral accounts first
                let mut referral_accounts: Vec<Pubkey> = Vec::new();
                for account_info in ctx.remaining_accounts.iter() {
                    if !account_info.is_writable {
                        break;
                    }

                    // Verify discriminator to ensure this is a valid ReferralAccount
                    let data = match account_info.try_borrow_data() {
                        Ok(data) => data,
                        Err(_) => break,
                    };
                    let expected_data_len = ReferralAccount::SIZE;
                    if data.len() < expected_data_len {
                        break;
                    }

                    let account_discriminator = array_ref![data, 0, 8];
                    if account_discriminator != &ReferralAccount::DISCRIMINATOR {
                        break;
                    }

                    // Valid referral account - add to collection
                    referral_accounts.push(*account_info.key);
                }

                // Validate and assign referrers in REVERSE order (SDK returns [L1, L2, L3])
                // L3 (original referrer) should get highest reward (60%), L1 gets lowest (10%)
                // So referral_accounts[0] = L1, referral_accounts[1] = L2, referral_accounts[2] = L3
                // But we want: L3 → level1 (60%), L2 → level2 (30%), L1 → level3 (10%)
                if !referral_accounts.is_empty() {
                    // Level 3 referrer (original) gets highest reward (60%)
                    // This is the last account in SDK's chain (referral_accounts[referral_accounts.len()-1])
                    level1_referrer = Some(referral_accounts[referral_accounts.len() - 1]);

                    // Level 2 referrer gets 30% - second to last
                    if referral_accounts.len() >= 2 {
                        level2_referrer = Some(referral_accounts[referral_accounts.len() - 2]);
                    }

                    // Level 1 referrer (immediate) gets 10% - first in SDK's chain
                    if referral_accounts.len() >= 3 {
                        level3_referrer = Some(referral_accounts[0]);
                    }
                }

                // Validate chain ordering: account[0].referrer == account[1].owner, etc.
                // SDK returns [L1, L2, L3] where:
                // - L1.referrer = L2.publicKey
                // - L2.referrer = L3.publicKey
                // - L3.referrer = None
                if referral_accounts.len() >= 2 {
                    // Validate L1 refers to L2
                    let l1_data = ctx.remaining_accounts[0]
                        .try_borrow_data()
                        .map_err(|_| TributaryError::CouldNotDeserializeReferrer)?;
                    if l1_data.len() < ReferralAccount::SIZE {
                        return Err(TributaryError::ReferralAccountSizeMismatch.into());
                    }
                    let l1_referrer = array_ref![l1_data, ReferralAccount::SIZE - 32, 32];
                    if *l1_referrer != referral_accounts[1].as_ref() {
                        return Err(TributaryError::InvalidReferralChainOrdering.into());
                    }
                }
                if referral_accounts.len() >= 3 {
                    // Validate L2 refers to L3
                    let l2_data = ctx.remaining_accounts[1]
                        .try_borrow_data()
                        .map_err(|_| TributaryError::CouldNotDeserializeReferrer)?;
                    if l2_data.len() < ReferralAccount::SIZE {
                        return Err(TributaryError::ReferralAccountSizeMismatch.into());
                    }
                    let l2_referrer = array_ref![l2_data, ReferralAccount::SIZE - 32, 32];
                    if *l2_referrer != referral_accounts[2].as_ref() {
                        return Err(TributaryError::InvalidReferralChainOrdering.into());
                    }
                }
                // L3 should have no referrer (checked by SDK during creation)

                emit!(ReferralRewardDistributedRecord {
                    payment_policy: payment_policy_key,
                    gateway: gateway.key(),
                    payment_amount,
                    timestamp: clock.unix_timestamp,
                    rewards: [
                        level1_referrer.map(|pubkey| ReferralReward {
                            pubkey,
                            reward: level1_reward,
                        }),
                        level2_referrer.map(|pubkey| ReferralReward {
                            pubkey,
                            reward: level2_reward,
                        }),
                        level3_referrer.map(|pubkey| ReferralReward {
                            pubkey,
                            reward: level3_reward,
                        }),
                    ],
                });

                msg!(
                    "Referral pool: {} (L1: {}, L2: {}, L3: {})",
                    referral_pool,
                    level1_reward,
                    level2_reward,
                    level3_reward
                );
            }
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
