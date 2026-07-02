// User-owned. Regenerating the spec does NOT overwrite this file.
// Guard checks live in the sibling `crate::guards` module and ARE
// regenerated on every `qedgen codegen`. Drift between the spec
// handler block and the `spec_hash` below fires a compile_error!
// via the `#[qed(verified, ...)]` macro.

use anchor_lang::prelude::*;
use crate::ref_impls::*;
use crate::guards;
use qedgen_macros::qed;
use crate::ReleaseMilestone;

impl<'info> ReleaseMilestone<'info> {
    #[qed(verified, spec = "../tributary.qedspec", handler = "release_milestone", hash = "f687fb0cb2195a1d", spec_hash = "1b5f5c21e9da5df1")]
    #[inline(always)]
    pub fn handler(&mut self, current_time: u64, due_timestamp: u64) -> Result<()> {
        guards::release_milestone(self, current_time, due_timestamp)?;
        self.state.pulled_amount = self.state.payment_amount;
        // Spec effect (needs fill): total_fee set (bps_mul (payment_amount) (gateway_fee_bps))
        // Spec effect (needs fill): protocol_cut set (bps_mul (total_fee) (protocol_share_bps))
        // Spec effect (needs fill): scheduler_cut set (bps_mul (total_fee) (scheduler_share_bps))
        // Spec effect (needs fill): referral_pool set (if is_referral_enabled = 1 then (bps_mul (total_fee) (referral_allocation_bps)) else 0)
        // Spec effect (needs fill): gateway_residual set total_fee - protocol_cut - scheduler_cut - referral_pool
        // Spec effect (needs fill): recipient_amount set payment_amount - total_fee
        self.state.total_from_user = self.state.payment_amount;
        todo!("fill non-mechanical effects, events, transfers, calls")
    }
}
