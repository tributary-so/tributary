use crate::constants::*;
use crate::error::TributaryError;
use crate::state::PaymentGateway;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateGatewayFeatureFlagsArgs {
    pub feature_flags: u8,
}

#[derive(Accounts)]
pub struct UpdateGatewayFeatureFlags<'info> {
    #[account(
        mut,
        seeds = [GATEWAY_SEED, authority.key().as_ref()],
        bump = gateway.bump,
        constraint = gateway.authority == authority.key() @ TributaryError::Unauthorized
    )]
    pub gateway: Box<Account<'info, PaymentGateway>>,

    pub authority: Signer<'info>,
}

impl<'info> UpdateGatewayFeatureFlags<'info> {
    pub fn handle_update_gateway_feature_flags(
        ctx: Context<UpdateGatewayFeatureFlags>,
        args: UpdateGatewayFeatureFlagsArgs,
    ) -> Result<()> {
        let gateway = &mut ctx.accounts.gateway;

        // Accept-mask: only referral / net-amount are freely toggleable.
        // CUSTOM_PROTOCOL_FEE is a fee parameter (set via its own instruction)
        // — preserved across writes.
        // FEATURE_PERMISSIONLESS is frozen at create (tributary-1355): it
        // cannot be flipped in either direction post-create. A gateway built
        // on the permissionless scheduler layer needs a stable expectation —
        // toggling it off would break liveness for cold-relayer policies.
        require!(
            args.feature_flags
                <= (PaymentGateway::FEATURE_REFERRAL
                    | PaymentGateway::FEATURE_NET_AMOUNT
                    | PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
                    | PaymentGateway::FEATURE_PERMISSIONLESS),
            TributaryError::InvalidFeatureFlags
        );

        let preserved_bits = gateway.feature_flags
            & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
                | PaymentGateway::FEATURE_PERMISSIONLESS);
        gateway.feature_flags = (args.feature_flags
            & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
            | preserved_bits;

        // SZ-M-3 (Slot Zero 2026-11-08 §T3): enabling referral must also
        // validate the STORED tiers when a live allocation exists. This
        // path previously validated nothing, so tiers stored while dormant
        // (possibly garbage, or pre-dating the write-time gate) could go
        // live and debit payers beyond the documented fee bound. Mirrors
        // the live-state guard in update_gateway_referral_settings.
        if gateway.is_referral_enabled() && gateway.referral_allocation_bps > 0 {
            gateway.validate_referral_tiers()?;
        }

        msg!(
            "Gateway feature flags updated: flags={}",
            gateway.feature_flags
        );

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_gateway(flags: u8) -> PaymentGateway {
        PaymentGateway {
            authority: Pubkey::default(),
            fee_recipient: Pubkey::default(),
            gateway_fee_bps: 500,
            is_active: true,
            padding1: 0,
            created_at: 0,
            bump: 0,
            name: [0; 32],
            url: [0; 64],
            signer: Pubkey::default(),
            feature_flags: flags,
            referral_allocation_bps: 0,
            referral_tiers_bps: [0; 3],
            custom_protocol_share_bps: 0,
            scheduler_share_bps: 0,
            padding: [0; 115],
        }
    }

    /// Permissionless bit set at create is preserved when update tries to clear it.
    #[test]
    fn permissionless_bit_preserved_on_attempted_clear() {
        let mut gw = make_gateway(PaymentGateway::FEATURE_PERMISSIONLESS);
        // Update tries to clear everything.
        let new_flags = 0;
        let preserved_bits = gw.feature_flags
            & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
                | PaymentGateway::FEATURE_PERMISSIONLESS);
        gw.feature_flags = (new_flags
            & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
            | preserved_bits;
        assert!(
            gw.is_permissionless(),
            "permissionless bit must survive update"
        );
    }

    /// Permissionless bit clear at create stays clear when update tries to set it.
    #[test]
    fn permissionless_bit_preserved_on_attempted_set() {
        let mut gw = make_gateway(0);
        let new_flags = PaymentGateway::FEATURE_PERMISSIONLESS;
        let preserved_bits = gw.feature_flags
            & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
                | PaymentGateway::FEATURE_PERMISSIONLESS);
        gw.feature_flags = (new_flags
            & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
            | preserved_bits;
        assert!(
            !gw.is_permissionless(),
            "permissionless bit must not be settable via update"
        );
    }

    /// Other bits (REFERRAL, NET_AMOUNT) still toggle freely.
    #[test]
    fn other_bits_toggle_freely() {
        let mut gw = make_gateway(0);
        let new_flags = PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT;
        let preserved_bits = gw.feature_flags
            & (PaymentGateway::FEATURE_CUSTOM_PROTOCOL_FEE
                | PaymentGateway::FEATURE_PERMISSIONLESS);
        gw.feature_flags = (new_flags
            & (PaymentGateway::FEATURE_REFERRAL | PaymentGateway::FEATURE_NET_AMOUNT))
            | preserved_bits;
        assert!(gw.is_referral_enabled());
        assert!(gw.is_amount_net());
    }

    /// SZ-M-3 (Slot Zero 2026-11-08 §T3): enabling referral via the flags
    /// path must validate STORED tiers when a live allocation exists — the
    /// store-garbage-while-dormant, flip-the-flag sequence debited payers
    /// beyond the documented fee bound pre-fix (10.933 USDC on a 10 USDC
    /// gross policy in the review's repro).
    #[test]
    fn enabling_referral_with_live_allocation_rejects_garbage_stored_tiers() {
        let mut gw = make_gateway(0);
        gw.referral_allocation_bps = 1000;
        gw.referral_tiers_bps = [65535, 65535, 65535]; // stored pre-fix
        // Handler write: only REFERRAL / NET_AMOUNT toggle freely.
        gw.feature_flags = PaymentGateway::FEATURE_REFERRAL;
        let guard = gw.is_referral_enabled() && gw.referral_allocation_bps > 0;
        assert!(guard, "the live-state guard must fire once referral is on");
        assert!(
            gw.validate_referral_tiers().is_err(),
            "garbage stored tiers must block enabling referral"
        );
    }
}
