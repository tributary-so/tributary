// User-owned. Regenerating the spec does NOT overwrite this file.
// Guard checks live in the sibling `crate::guards` module and ARE
// regenerated on every `qedgen codegen`. Drift between the spec
// handler block and the `spec_hash` below fires a compile_error!
// via the `#[qed(verified, ...)]` macro.

use anchor_lang::prelude::*;
use crate::ref_impls::*;
use crate::guards;
use qedgen_macros::qed;
use crate::ExecutePaymentOtherwise;

impl ExecutePaymentOtherwise {
    #[qed(verified, spec = "../tributary.qedspec", handler = "execute_payment", hash = "0b3130faff3b0958", spec_hash = "4430a3a05c4729c8")]
    #[inline(always)]
    pub fn handler(&self, chunk: u64, current_time: u64) -> Result<()> {
        guards::execute_payment_otherwise(self, chunk, current_time)?;
        Ok(())
    }
}
