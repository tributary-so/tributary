/-
Proofs.lean — user-owned preservation proofs.

`qedgen codegen` bootstraps this file once and never touches it again.
Spec.lean is regenerated; this file is durable. `qedgen check`
(and `qedgen reconcile`) flag orphan theorems (handler removed from
spec) and missing obligations (new `preserved_by` declared).
-/
import Spec

namespace Tributary

open QEDGen.Solana

-- Preservation obligations the spec expects.
-- Write each theorem against the signature generated in Spec.lean
-- (the handler's transition + the property predicate). Close with
-- tactics like `unfold`, `omega`, or `simp_all` as appropriate, or
-- `QEDGen.Solana.IndexedState.forall_update_pres` for per-account
-- invariants in Map-backed specs.
--
--   theorem fee_conservation_preserved_by_execute_composable_case_0
--   theorem fee_conservation_preserved_by_execute_composable_case_1
--   theorem fee_conservation_preserved_by_execute_composable_otherwise
--   theorem fee_conservation_preserved_by_execute_payment_case_0
--   theorem fee_conservation_preserved_by_execute_payment_case_1
--   theorem fee_conservation_preserved_by_execute_payment_otherwise
--   theorem fee_conservation_preserved_by_release_milestone
--   theorem fee_conservation_preserved_by_transfer
--   theorem fee_is_bps_decomposition_preserved_by_execute_composable_case_0
--   theorem fee_is_bps_decomposition_preserved_by_execute_composable_case_1
--   theorem fee_is_bps_decomposition_preserved_by_execute_composable_otherwise
--   theorem fee_is_bps_decomposition_preserved_by_execute_payment_case_0
--   theorem fee_is_bps_decomposition_preserved_by_execute_payment_case_1
--   theorem fee_is_bps_decomposition_preserved_by_execute_payment_otherwise
--   theorem fee_is_bps_decomposition_preserved_by_release_milestone
--   theorem period_bounded_preserved_by_execute_composable_case_0
--   theorem period_bounded_preserved_by_execute_composable_case_1
--   theorem period_bounded_preserved_by_execute_composable_otherwise
--   theorem period_bounded_preserved_by_execute_payment_case_0
--   theorem period_bounded_preserved_by_execute_payment_case_1
--   theorem period_bounded_preserved_by_execute_payment_otherwise
--   theorem period_bounded_preserved_by_release_milestone
--   theorem period_bounded_preserved_by_transfer
--   theorem period_cap_fixed_preserved_by_execute_composable_case_0
--   theorem period_cap_fixed_preserved_by_execute_composable_case_1
--   theorem period_cap_fixed_preserved_by_execute_composable_otherwise
--   theorem period_cap_fixed_preserved_by_execute_payment_case_0
--   theorem period_cap_fixed_preserved_by_execute_payment_case_1
--   theorem period_cap_fixed_preserved_by_execute_payment_otherwise
--   theorem period_cap_fixed_preserved_by_release_milestone
--   theorem period_cap_fixed_preserved_by_transfer
--   theorem pull_bounded_preserved_by_execute_composable_case_0
--   theorem pull_bounded_preserved_by_execute_composable_case_1
--   theorem pull_bounded_preserved_by_execute_composable_otherwise
--   theorem pull_bounded_preserved_by_execute_payment_case_0
--   theorem pull_bounded_preserved_by_execute_payment_case_1
--   theorem pull_bounded_preserved_by_execute_payment_otherwise
--   theorem recipient_net_of_fee_preserved_by_execute_composable_case_0
--   theorem recipient_net_of_fee_preserved_by_execute_composable_case_1
--   theorem recipient_net_of_fee_preserved_by_execute_composable_otherwise
--   theorem recipient_net_of_fee_preserved_by_execute_payment_case_0
--   theorem recipient_net_of_fee_preserved_by_execute_payment_case_1
--   theorem recipient_net_of_fee_preserved_by_execute_payment_otherwise
--   theorem recipient_net_of_fee_preserved_by_release_milestone
--   theorem residual_nonnegative_preserved_by_execute_composable_case_0
--   theorem residual_nonnegative_preserved_by_execute_composable_case_1
--   theorem residual_nonnegative_preserved_by_execute_composable_otherwise
--   theorem residual_nonnegative_preserved_by_execute_payment_case_0
--   theorem residual_nonnegative_preserved_by_execute_payment_case_1
--   theorem residual_nonnegative_preserved_by_execute_payment_otherwise
--   theorem residual_nonnegative_preserved_by_release_milestone

end Tributary
