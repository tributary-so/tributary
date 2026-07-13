// Stops Rust Analyzer complaining about missing configs
// See https://solana.stackexchange.com/questions/17777
#![allow(unexpected_cfgs)]
// Fix warning: use of deprecated method `anchor_lang::prelude::AccountInfo::<'a>::realloc`: Use AccountInfo::resize() instead
// See https://solana.stackexchange.com/questions/22979
#![allow(deprecated)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod policies;
pub mod shared;
pub mod state;

use anchor_lang::prelude::*;
#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

pub use constants::*;
pub use instructions::*;
pub use policies::*;
pub use state::*;

declare_id!("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ");

#[program]
pub mod tributary {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Initialize::handle_initialize(ctx)
    }

    pub fn change_program_authority(ctx: Context<ChangeProgramAuthority>) -> Result<()> {
        ChangeProgramAuthority::handler_change_program_authority(ctx)
    }

    pub fn set_emergency_pause(ctx: Context<SetEmergencyPause>, paused: bool) -> Result<()> {
        SetEmergencyPause::handler_set_emergency_pause(ctx, paused)
    }

    pub fn create_user_payment(ctx: Context<CreateUserPayment>) -> Result<()> {
        CreateUserPayment::handler_create_user_payment(ctx)
    }

    pub fn create_referral_account<'info>(
        ctx: Context<'_, '_, 'info, 'info, CreateReferralAccount<'info>>,
        referral_code: [u8; 6],
    ) -> Result<()> {
        CreateReferralAccount::handler_create_referral_account(ctx, referral_code)
    }

    pub fn create_payment_gateway(
        ctx: Context<CreatePaymentGateway>,
        gateway_fee_bps: u16,
        scheduler_share_bps: u16,
        name: [u8; 32],
        url: [u8; 64],
        initial_feature_flags: u8,
    ) -> Result<()> {
        CreatePaymentGateway::handler_create_payment_gateway(
            ctx,
            gateway_fee_bps,
            scheduler_share_bps,
            name,
            url,
            initial_feature_flags,
        )
    }

    pub fn create_payment_policy(
        ctx: Context<CreatePaymentPolicy>,
        policy_type: PolicyType,
        memo: [u8; 64],
    ) -> Result<()> {
        CreatePaymentPolicy::handler_create_payment_policy(ctx, policy_type, memo)
    }

    pub fn execute_payment<'info>(
        ctx: Context<'_, '_, 'info, 'info, ExecutePayment<'info>>,
        payment_amount: Option<u64>,
    ) -> Result<()> {
        ExecutePayment::handler(ctx, payment_amount)
    }

    pub fn change_payment_policy_status(
        ctx: Context<ChangePaymentPolicyStatus>,
        policy_id: u32,
        new_status: PolicyStatus,
    ) -> Result<()> {
        ChangePaymentPolicyStatus::handler_change_payment_policy_status(ctx, policy_id, new_status)
    }

    pub fn delete_payment_policy(ctx: Context<DeletePaymentPolicy>, policy_id: u32) -> Result<()> {
        DeletePaymentPolicy::handler_delete_payment_policy(ctx, policy_id)
    }

    pub fn delete_user_payment(ctx: Context<DeleteUserPayment>) -> Result<()> {
        DeleteUserPayment::handler_delete_user_payment(ctx)
    }

    pub fn delete_payment_gateway(ctx: Context<DeletePaymentGateway>) -> Result<()> {
        DeletePaymentGateway::handler_delete_payment_gateway(ctx)
    }

    pub fn change_gateway_signer(ctx: Context<ChangeGatewaySigner>) -> Result<()> {
        ChangeGatewaySigner::handler_change_gateway_signer(ctx)
    }

    pub fn change_gateway_fee_recipient(ctx: Context<ChangeGatewayFeeRecipient>) -> Result<()> {
        ChangeGatewayFeeRecipient::handler_change_gateway_fee_recipient(ctx)
    }

    pub fn change_gateway_fee_bps(
        ctx: Context<ChangeGatewayFeeBps>,
        new_fee_bps: u16,
    ) -> Result<()> {
        ChangeGatewayFeeBps::handler_change_gateway_fee_bps(ctx, new_fee_bps)
    }

    pub fn update_gateway_referral_settings(
        ctx: Context<UpdateGatewayReferralSettings>,
        args: UpdateGatewayReferralSettingsArgs,
    ) -> Result<()> {
        UpdateGatewayReferralSettings::handle_update_gateway_referral_settings(ctx, args)
    }

    pub fn update_gateway_protocol_fee(
        ctx: Context<UpdateGatewayProtocolFee>,
        args: UpdateGatewayProtocolFeeArgs,
    ) -> Result<()> {
        UpdateGatewayProtocolFee::handle_update_gateway_protocol_fee(ctx, args)
    }

    pub fn update_gateway_scheduler_share(
        ctx: Context<UpdateGatewaySchedulerShare>,
        scheduler_share_bps: u16,
    ) -> Result<()> {
        UpdateGatewaySchedulerShare::handle_update_gateway_scheduler_share(ctx, scheduler_share_bps)
    }

    pub fn update_gateway_feature_flags(
        ctx: Context<UpdateGatewayFeatureFlags>,
        args: UpdateGatewayFeatureFlagsArgs,
    ) -> Result<()> {
        UpdateGatewayFeatureFlags::handle_update_gateway_feature_flags(ctx, args)
    }

    pub fn transfer<'info>(
        ctx: Context<'_, '_, 'info, 'info, TransferTokens<'info>>,
        amount: u64,
        memo: [u8; 64],
    ) -> Result<()> {
        TransferTokens::handler(ctx, amount, memo)
    }

    // ponytail: arg list is the on-chain program interface (locked by the IDL).
    #[allow(clippy::too_many_arguments)]
    pub fn create_composable_policy(
        ctx: Context<CreateComposablePolicy>,
        policy_type: PolicyType,
        memo: [u8; 32],
        forward_config: ForwardConfig,
        pre_validation: ValidationSpec,
        pre_init: ValidationInit,
        post_validation: ValidationSpec,
        post_init: ValidationInit,
    ) -> Result<()> {
        CreateComposablePolicy::handler(
            ctx,
            policy_type,
            memo,
            forward_config,
            pre_validation,
            pre_init,
            post_validation,
            post_init,
        )
    }

    pub fn execute_composable<'info>(
        ctx: Context<'_, '_, 'info, 'info, ExecuteComposable<'info>>,
        instruction_data: Vec<u8>,
        forward_amount: Option<u64>,
    ) -> Result<()> {
        ExecuteComposable::handler(ctx, instruction_data, forward_amount)
    }

    pub fn delete_composable_policy(
        ctx: Context<DeleteComposablePolicy>,
        policy_id: u32,
    ) -> Result<()> {
        DeleteComposablePolicy::handler(ctx, policy_id)
    }

    pub fn change_composable_status(
        ctx: Context<ChangeComposableStatus>,
        policy_id: u32,
        new_status: PolicyStatus,
    ) -> Result<()> {
        ChangeComposableStatus::handler(ctx, policy_id, new_status)
    }
}

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Tributary.so",
    project_url: "https://tributary.so",
    contacts: "email:security@tributary.so,link:https://github.com/tributary-so/tributary/issues",
    policy: "https://github.com/tributary-so/tributary/blob/master/SECURITY.md",

    // Optional Fields
    preferred_languages: "en,de",
    source_code: "https://github.com/tributary-so/tributary",
    // source_revision: default_env!("GITHUB_SHA", ""),
    // source_release: default_env!("GITHUB_REF_NAME", ""),
    auditors: "None",
    acknowledgements: "Big shoutout to @rektoff for their Security Bootcamp!"
}
