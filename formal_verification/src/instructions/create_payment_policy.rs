// User-owned. Regenerating the spec does NOT overwrite this file.
// Guard checks live in the sibling `crate::guards` module and ARE
// regenerated on every `qedgen codegen`. Drift between the spec
// handler block and the `spec_hash` below fires a compile_error!
// via the `#[qed(verified, ...)]` macro.

use anchor_lang::prelude::*;
use crate::ref_impls::*;
use crate::guards;
use qedgen_macros::qed;
use crate::CreatePaymentPolicy;

impl<'info> CreatePaymentPolicy<'info> {
    #[qed(verified, spec = "../tributary.qedspec", handler = "create_payment_policy", hash = "91033ae80d4af801", spec_hash = "ca789cdf001d0d82")]
    #[inline(always)]
    pub fn handler(&mut self, max_per_period: u64, max_chunk: u64, period_secs: u64, fee_bps: u16, proto_share: u16, sched_share: u16, referral_share: u16) -> Result<()> {
        guards::create_payment_policy(self, max_per_period, max_chunk, period_secs, fee_bps, proto_share, sched_share, referral_share)?;
        self.state.policy_status = 0;
        self.state.max_amount_per_period = max_per_period;
        self.state.max_chunk_amount = max_chunk;
        self.state.period_length_seconds = period_secs;
        self.state.current_period_total = 0;
        self.state.current_period_start = 0;
        self.state.gateway_fee_bps = fee_bps;
        self.state.protocol_share_bps = proto_share;
        self.state.scheduler_share_bps = sched_share;
        self.state.referral_allocation_bps = referral_share;
        self.state.pulled_amount = 0;
        self.state.payment_amount = 0;
        self.state.total_fee = 0;
        self.state.protocol_cut = 0;
        self.state.scheduler_cut = 0;
        self.state.referral_pool = 0;
        self.state.gateway_residual = 0;
        self.state.recipient_amount = 0;
        self.state.total_from_user = 0;
        Ok(())
    }
}
