// User-owned. Regenerating the spec does NOT overwrite this file.
// Guard checks live in the sibling `crate::guards` module and ARE
// regenerated on every `qedgen codegen`. Drift between the spec
// handler block and the `spec_hash` below fires a compile_error!
// via the `#[qed(verified, ...)]` macro.

use anchor_lang::prelude::*;
use crate::ref_impls::*;
use crate::guards;
use qedgen_macros::qed;
use crate::ExecuteComposableOtherwise;

impl ExecuteComposableOtherwise {
    #[qed(verified, spec = "../tributary.qedspec", handler = "execute_composable", hash = "4c14f8b6d50bec6a", spec_hash = "4430a3a05c4729c8")]
    #[inline(always)]
    pub fn handler(&self, chunk: u64, current_time: u64, min_output: u64) -> Result<()> {
        guards::execute_composable_otherwise(self, chunk, current_time, min_output)?;
        Ok(())
    }
}
