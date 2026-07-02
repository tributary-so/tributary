// User-owned. Regenerating the spec does NOT overwrite this file.
// Guard checks live in the sibling `crate::guards` module and ARE
// regenerated on every `qedgen codegen`. Drift between the spec
// handler block and the `spec_hash` below fires a compile_error!
// via the `#[qed(verified, ...)]` macro.

use anchor_lang::prelude::*;
use crate::ref_impls::*;
use crate::guards;
use qedgen_macros::qed;
use crate::ExecuteComposableCase0;

impl<'info> ExecuteComposableCase0<'info> {
    #[qed(verified, spec = "../tributary.qedspec", handler = "execute_composable", hash = "edd89b679367b23a", spec_hash = "4430a3a05c4729c8")]
    #[inline(always)]
    pub fn handler(&mut self, chunk: u64, current_time: u64, min_output: u64) -> Result<()> {
        guards::execute_composable_case_0(self, chunk, current_time, min_output)?;
        self.state.current_period_start = current_time;
        self.state.current_period_total = chunk;
        self.state.pulled_amount = chunk;
        self.state.payment_amount = chunk;
        // Spec effect (needs fill): total_fee set (bps_mul (chunk) (gateway_fee_bps))
        // Spec effect (needs fill): protocol_cut set (bps_mul (total_fee) (protocol_share_bps))
        // Spec effect (needs fill): scheduler_cut set (bps_mul (total_fee) (scheduler_share_bps))
        // Spec effect (needs fill): referral_pool set (if is_referral_enabled = 1 then (bps_mul (total_fee) (referral_allocation_bps)) else 0)
        // Spec effect (needs fill): gateway_residual set total_fee - protocol_cut - scheduler_cut - referral_pool
        // Spec effect (needs fill): recipient_amount set payment_amount - total_fee
        self.state.total_from_user = self.state.payment_amount;
        todo!("fill non-mechanical effects, events, transfers, calls")
    }
}
