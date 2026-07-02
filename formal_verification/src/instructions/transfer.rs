// User-owned. Regenerating the spec does NOT overwrite this file.
// Guard checks live in the sibling `crate::guards` module and ARE
// regenerated on every `qedgen codegen`. Drift between the spec
// handler block and the `spec_hash` below fires a compile_error!
// via the `#[qed(verified, ...)]` macro.

use anchor_lang::prelude::*;
use crate::ref_impls::*;
use crate::guards;
use qedgen_macros::qed;
use crate::Transfer;

impl<'info> Transfer<'info> {
    #[qed(verified, spec = "../tributary.qedspec", handler = "transfer", hash = "6f049e096a5789e7", spec_hash = "b93434031a6aa4c8")]
    #[inline(always)]
    pub fn handler(&mut self, amount: u64) -> Result<()> {
        guards::transfer(self, amount)?;
        self.state.pulled_amount = amount;
        Ok(())
    }
}
