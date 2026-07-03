import QEDGen.Solana.Account
import QEDGen.Solana.Cpi
import QEDGen.Solana.State
import QEDGen.Solana.Valid

namespace Tributary

open QEDGen.Solana

-- Reference implementations: pure expressions named so
-- ensures clauses can call them. The user's Rust impl is
-- verified to satisfy the ensures referencing these, not
-- forced to implement them verbatim.
def bps_mul (amount : Nat) (bps : Nat) : Nat := (((amount) * (bps)) / (10000))

abbrev BPS_DENOMINATOR : Nat := 10000

structure State where
  policy_status : Nat
  emergency_pause : Nat
  max_amount_per_period : Nat
  max_chunk_amount : Nat
  period_length_seconds : Nat
  current_period_start : Nat
  current_period_total : Nat
  pulled_amount : Nat
  payment_amount : Nat
  gateway_fee_bps : Nat
  protocol_share_bps : Nat
  scheduler_share_bps : Nat
  referral_allocation_bps : Nat
  is_referral_enabled : Nat
  is_net_mode : Nat
  total_fee : Nat
  protocol_cut : Nat
  scheduler_cut : Nat
  referral_pool : Nat
  gateway_residual : Nat
  recipient_amount : Nat
  total_from_user : Nat
  release_due_date : Nat
  release_requires_gateway : Nat
  release_requires_owner : Nat
  release_requires_recipient : Nat
  caller_is_gateway : Nat
  caller_is_owner : Nat
  caller_is_recipient : Nat
  deriving Repr, DecidableEq, BEq, Inhabited

def create_payment_policyTransition (s : State) (signer : Pubkey) (max_per_period : Nat) (max_chunk : Nat) (period_secs : Nat) (fee_bps : Nat) (proto_share : Nat) (sched_share : Nat) (referral_share : Nat) : Option State :=
  if max_per_period > 0 ∧ max_chunk > 0 ∧ max_chunk ≤ max_per_period ∧ period_secs > 0 ∧ (proto_share + sched_share + referral_share) ≤ 10000 then
    some { s with policy_status := 0, max_amount_per_period := max_per_period, max_chunk_amount := max_chunk, period_length_seconds := period_secs, current_period_total := 0, current_period_start := 0, gateway_fee_bps := fee_bps, protocol_share_bps := proto_share, scheduler_share_bps := sched_share, referral_allocation_bps := referral_share, pulled_amount := 0, payment_amount := 0, total_fee := 0, protocol_cut := 0, scheduler_cut := 0, referral_pool := 0, gateway_residual := 0, recipient_amount := 0, total_from_user := 0 }
  else none

def execute_payment_case_0Transition (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat) : Option State :=
  if emergency_pause = 0 ∧ policy_status = 0 ∧ chunk > 0 ∧ chunk ≤ max_chunk_amount then
    some { s with current_period_start := current_time, current_period_total := chunk, pulled_amount := chunk, payment_amount := chunk, total_fee := (bps_mul (chunk) (gateway_fee_bps)), protocol_cut := (bps_mul (total_fee) (protocol_share_bps)), scheduler_cut := (bps_mul (total_fee) (scheduler_share_bps)), referral_pool := (if is_referral_enabled = 1 then (bps_mul (total_fee) (referral_allocation_bps)) else 0), gateway_residual := s.total_fee - protocol_cut - scheduler_cut - referral_pool, recipient_amount := s.payment_amount - total_fee, total_from_user := s.payment_amount }
  else none

def execute_payment_case_1Transition (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat) : Option State :=
  if emergency_pause = 0 ∧ policy_status = 0 ∧ chunk > 0 ∧ chunk ≤ max_chunk_amount ∧ s.current_period_total + chunk ≤ 18446744073709551615 then
    some { s with current_period_total := s.current_period_total + chunk, pulled_amount := chunk, payment_amount := chunk, total_fee := (bps_mul (chunk) (gateway_fee_bps)), protocol_cut := (bps_mul (total_fee) (protocol_share_bps)), scheduler_cut := (bps_mul (total_fee) (scheduler_share_bps)), referral_pool := (if is_referral_enabled = 1 then (bps_mul (total_fee) (referral_allocation_bps)) else 0), gateway_residual := s.total_fee - protocol_cut - scheduler_cut - referral_pool, recipient_amount := s.payment_amount - total_fee, total_from_user := s.payment_amount }
  else none

def execute_payment_otherwiseTransition (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat) : Option State :=
  if emergency_pause = 0 ∧ policy_status = 0 ∧ chunk > 0 ∧ chunk ≤ max_chunk_amount ∧ 0 = 1 then
    some s
  else none

def execute_composable_case_0Transition (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat) : Option State :=
  if emergency_pause = 0 ∧ policy_status = 0 ∧ chunk > 0 ∧ chunk ≤ max_chunk_amount then
    some { s with current_period_start := current_time, current_period_total := chunk, pulled_amount := chunk, payment_amount := chunk, total_fee := (bps_mul (chunk) (gateway_fee_bps)), protocol_cut := (bps_mul (total_fee) (protocol_share_bps)), scheduler_cut := (bps_mul (total_fee) (scheduler_share_bps)), referral_pool := (if is_referral_enabled = 1 then (bps_mul (total_fee) (referral_allocation_bps)) else 0), gateway_residual := s.total_fee - protocol_cut - scheduler_cut - referral_pool, recipient_amount := s.payment_amount - total_fee, total_from_user := s.payment_amount }
  else none

def execute_composable_case_1Transition (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat) : Option State :=
  if emergency_pause = 0 ∧ policy_status = 0 ∧ chunk > 0 ∧ chunk ≤ max_chunk_amount ∧ s.current_period_total + chunk ≤ 18446744073709551615 then
    some { s with current_period_total := s.current_period_total + chunk, pulled_amount := chunk, payment_amount := chunk, total_fee := (bps_mul (chunk) (gateway_fee_bps)), protocol_cut := (bps_mul (total_fee) (protocol_share_bps)), scheduler_cut := (bps_mul (total_fee) (scheduler_share_bps)), referral_pool := (if is_referral_enabled = 1 then (bps_mul (total_fee) (referral_allocation_bps)) else 0), gateway_residual := s.total_fee - protocol_cut - scheduler_cut - referral_pool, recipient_amount := s.payment_amount - total_fee, total_from_user := s.payment_amount }
  else none

def execute_composable_otherwiseTransition (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat) : Option State :=
  if emergency_pause = 0 ∧ policy_status = 0 ∧ chunk > 0 ∧ chunk ≤ max_chunk_amount ∧ 0 = 1 then
    some s
  else none

def transferTransition (s : State) (signer : Pubkey) (amount : Nat) : Option State :=
  if emergency_pause = 0 ∧ policy_status = 0 ∧ amount > 0 then
    some { s with pulled_amount := amount }
  else none

def release_milestoneTransition (s : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat) : Option State :=
  if emergency_pause = 0 ∧ policy_status = 0 ∧ (release_due_date = 0 ∨ current_time ≥ due_timestamp) ∧ (release_requires_gateway = 0 ∨ caller_is_gateway = 1) ∧ (release_requires_owner = 0 ∨ caller_is_owner = 1) ∧ (release_requires_recipient = 0 ∨ caller_is_recipient = 1) then
    some { s with pulled_amount := s.payment_amount, total_fee := (bps_mul (payment_amount) (gateway_fee_bps)), protocol_cut := (bps_mul (total_fee) (protocol_share_bps)), scheduler_cut := (bps_mul (total_fee) (scheduler_share_bps)), referral_pool := (if is_referral_enabled = 1 then (bps_mul (total_fee) (referral_allocation_bps)) else 0), gateway_residual := s.total_fee - protocol_cut - scheduler_cut - referral_pool, recipient_amount := s.payment_amount - total_fee, total_from_user := s.payment_amount }
  else none

/-- Invariant: fee_share_sum_bounded -/
theorem fee_share_sum_bounded (s : State) : (s.s.protocol_share_bps + s.s.scheduler_share_bps + s.s.referral_allocation_bps) ≤ 10000 := by sorry

/-- Invariant: milestone_signer_bits_mutually_exclusive -/
theorem milestone_signer_bits_mutually_exclusive (s : State) : (s.s.release_requires_gateway + s.s.release_requires_owner + s.s.release_requires_recipient) ≤ 1 := by sorry

inductive Operation where
  | create_payment_policy (max_per_period : Nat) (max_chunk : Nat) (period_secs : Nat) (fee_bps : Nat) (proto_share : Nat) (sched_share : Nat) (referral_share : Nat)
  | execute_payment_case_0 (chunk : Nat) (current_time : Nat)
  | execute_payment_case_1 (chunk : Nat) (current_time : Nat)
  | execute_payment_otherwise (chunk : Nat) (current_time : Nat)
  | execute_composable_case_0 (chunk : Nat) (current_time : Nat)
  | execute_composable_case_1 (chunk : Nat) (current_time : Nat)
  | execute_composable_otherwise (chunk : Nat) (current_time : Nat)
  | transfer (amount : Nat)
  | release_milestone (current_time : Nat) (due_timestamp : Nat)
  deriving Repr, DecidableEq, BEq

def applyOp (s : State) (signer : Pubkey) : Operation → Option State
  | .create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share => create_payment_policyTransition s signer max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share
  | .execute_payment_case_0 chunk current_time => execute_payment_case_0Transition s signer chunk current_time
  | .execute_payment_case_1 chunk current_time => execute_payment_case_1Transition s signer chunk current_time
  | .execute_payment_otherwise chunk current_time => execute_payment_otherwiseTransition s signer chunk current_time
  | .execute_composable_case_0 chunk current_time => execute_composable_case_0Transition s signer chunk current_time
  | .execute_composable_case_1 chunk current_time => execute_composable_case_1Transition s signer chunk current_time
  | .execute_composable_otherwise chunk current_time => execute_composable_otherwiseTransition s signer chunk current_time
  | .transfer amount => transferTransition s signer amount
  | .release_milestone current_time due_timestamp => release_milestoneTransition s signer current_time due_timestamp

def period_bounded (s : State) : Prop := s.current_period_total ≤ s.max_amount_per_period

theorem period_bounded_preserved_by_execute_payment_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_bounded s) (h : execute_payment_case_0Transition s signer chunk current_time = some s') :
    period_bounded s' := by
  unfold execute_payment_case_0Transition at h; split at h
  · next hg => cases h; unfold period_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem period_bounded_preserved_by_execute_payment_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_bounded s) (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    period_bounded s' := by
  unfold execute_payment_case_1Transition at h; split at h
  · next hg => cases h; unfold period_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem period_bounded_preserved_by_execute_payment_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_bounded s) (h : execute_payment_otherwiseTransition s signer chunk current_time = some s') :
    period_bounded s' := by
  unfold execute_payment_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_bounded_preserved_by_execute_composable_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_bounded s) (h : execute_composable_case_0Transition s signer chunk current_time = some s') :
    period_bounded s' := by
  unfold execute_composable_case_0Transition at h; split at h
  · next hg => cases h; unfold period_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem period_bounded_preserved_by_execute_composable_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_bounded s) (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    period_bounded s' := by
  unfold execute_composable_case_1Transition at h; split at h
  · next hg => cases h; unfold period_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem period_bounded_preserved_by_execute_composable_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_bounded s) (h : execute_composable_otherwiseTransition s signer chunk current_time = some s') :
    period_bounded s' := by
  unfold execute_composable_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_bounded_preserved_by_transfer (s s' : State) (signer : Pubkey) (amount : Nat)
    (h_inv : period_bounded s) (h : transferTransition s signer amount = some s') :
    period_bounded s' := by
  unfold transferTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_bounded_preserved_by_release_milestone (s s' : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h_inv : period_bounded s) (h : release_milestoneTransition s signer current_time due_timestamp = some s') :
    period_bounded s' := by
  unfold release_milestoneTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

/-- period_bounded is preserved by every operation. Auto-proven by case split. -/
theorem period_bounded_inductive (s s' : State) (signer : Pubkey) (op : Operation)
    (h_inv : period_bounded s) (h : applyOp s signer op = some s') : period_bounded s' := by
  cases op with
  | create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share =>
    simp [applyOp] at h
    unfold create_payment_policyTransition at h; split at h
    · next hg => cases h; unfold period_bounded at h_inv ⊢; dsimp; omega
    · contradiction
  | execute_payment_case_0 chunk current_time => exact period_bounded_preserved_by_execute_payment_case_0 s s' signer chunk current_time h_inv h
  | execute_payment_case_1 chunk current_time => exact period_bounded_preserved_by_execute_payment_case_1 s s' signer chunk current_time h_inv h
  | execute_payment_otherwise chunk current_time => exact period_bounded_preserved_by_execute_payment_otherwise s s' signer chunk current_time h_inv h
  | execute_composable_case_0 chunk current_time => exact period_bounded_preserved_by_execute_composable_case_0 s s' signer chunk current_time h_inv h
  | execute_composable_case_1 chunk current_time => exact period_bounded_preserved_by_execute_composable_case_1 s s' signer chunk current_time h_inv h
  | execute_composable_otherwise chunk current_time => exact period_bounded_preserved_by_execute_composable_otherwise s s' signer chunk current_time h_inv h
  | transfer amount => exact period_bounded_preserved_by_transfer s s' signer amount h_inv h
  | release_milestone current_time due_timestamp => exact period_bounded_preserved_by_release_milestone s s' signer current_time due_timestamp h_inv h

def period_cap_fixed (s : State) : Prop := s'.max_amount_per_period = s.max_amount_per_period

theorem period_cap_fixed_preserved_by_execute_payment_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_cap_fixed s) (h : execute_payment_case_0Transition s signer chunk current_time = some s') :
    period_cap_fixed s' := by
  unfold execute_payment_case_0Transition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_cap_fixed_preserved_by_execute_payment_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_cap_fixed s) (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    period_cap_fixed s' := by
  unfold execute_payment_case_1Transition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_cap_fixed_preserved_by_execute_payment_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_cap_fixed s) (h : execute_payment_otherwiseTransition s signer chunk current_time = some s') :
    period_cap_fixed s' := by
  unfold execute_payment_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_cap_fixed_preserved_by_execute_composable_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_cap_fixed s) (h : execute_composable_case_0Transition s signer chunk current_time = some s') :
    period_cap_fixed s' := by
  unfold execute_composable_case_0Transition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_cap_fixed_preserved_by_execute_composable_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_cap_fixed s) (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    period_cap_fixed s' := by
  unfold execute_composable_case_1Transition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_cap_fixed_preserved_by_execute_composable_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : period_cap_fixed s) (h : execute_composable_otherwiseTransition s signer chunk current_time = some s') :
    period_cap_fixed s' := by
  unfold execute_composable_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_cap_fixed_preserved_by_transfer (s s' : State) (signer : Pubkey) (amount : Nat)
    (h_inv : period_cap_fixed s) (h : transferTransition s signer amount = some s') :
    period_cap_fixed s' := by
  unfold transferTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem period_cap_fixed_preserved_by_release_milestone (s s' : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h_inv : period_cap_fixed s) (h : release_milestoneTransition s signer current_time due_timestamp = some s') :
    period_cap_fixed s' := by
  unfold release_milestoneTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

/-- period_cap_fixed is preserved by every operation. Auto-proven by case split. -/
theorem period_cap_fixed_inductive (s s' : State) (signer : Pubkey) (op : Operation)
    (h_inv : period_cap_fixed s) (h : applyOp s signer op = some s') : period_cap_fixed s' := by
  cases op with
  | create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share =>
    simp [applyOp] at h
    unfold create_payment_policyTransition at h; split at h
    · next hg => cases h; unfold period_cap_fixed at h_inv ⊢; dsimp; omega
    · contradiction
  | execute_payment_case_0 chunk current_time => exact period_cap_fixed_preserved_by_execute_payment_case_0 s s' signer chunk current_time h_inv h
  | execute_payment_case_1 chunk current_time => exact period_cap_fixed_preserved_by_execute_payment_case_1 s s' signer chunk current_time h_inv h
  | execute_payment_otherwise chunk current_time => exact period_cap_fixed_preserved_by_execute_payment_otherwise s s' signer chunk current_time h_inv h
  | execute_composable_case_0 chunk current_time => exact period_cap_fixed_preserved_by_execute_composable_case_0 s s' signer chunk current_time h_inv h
  | execute_composable_case_1 chunk current_time => exact period_cap_fixed_preserved_by_execute_composable_case_1 s s' signer chunk current_time h_inv h
  | execute_composable_otherwise chunk current_time => exact period_cap_fixed_preserved_by_execute_composable_otherwise s s' signer chunk current_time h_inv h
  | transfer amount => exact period_cap_fixed_preserved_by_transfer s s' signer amount h_inv h
  | release_milestone current_time due_timestamp => exact period_cap_fixed_preserved_by_release_milestone s s' signer current_time due_timestamp h_inv h

def fee_conservation (s : State) : Prop := (s.protocol_cut + s.scheduler_cut + s.referral_pool + s.gateway_residual) = s.total_fee

theorem fee_conservation_preserved_by_execute_payment_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_conservation s) (h : execute_payment_case_0Transition s signer chunk current_time = some s') :
    fee_conservation s' := by
  unfold execute_payment_case_0Transition at h; split at h
  · next hg => cases h; unfold fee_conservation at h_inv ⊢; dsimp; omega
  · contradiction

theorem fee_conservation_preserved_by_execute_payment_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_conservation s) (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    fee_conservation s' := by
  unfold execute_payment_case_1Transition at h; split at h
  · next hg => cases h; unfold fee_conservation at h_inv ⊢; dsimp; omega
  · contradiction

theorem fee_conservation_preserved_by_execute_payment_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_conservation s) (h : execute_payment_otherwiseTransition s signer chunk current_time = some s') :
    fee_conservation s' := by
  unfold execute_payment_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem fee_conservation_preserved_by_execute_composable_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_conservation s) (h : execute_composable_case_0Transition s signer chunk current_time = some s') :
    fee_conservation s' := by
  unfold execute_composable_case_0Transition at h; split at h
  · next hg => cases h; unfold fee_conservation at h_inv ⊢; dsimp; omega
  · contradiction

theorem fee_conservation_preserved_by_execute_composable_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_conservation s) (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    fee_conservation s' := by
  unfold execute_composable_case_1Transition at h; split at h
  · next hg => cases h; unfold fee_conservation at h_inv ⊢; dsimp; omega
  · contradiction

theorem fee_conservation_preserved_by_execute_composable_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_conservation s) (h : execute_composable_otherwiseTransition s signer chunk current_time = some s') :
    fee_conservation s' := by
  unfold execute_composable_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem fee_conservation_preserved_by_transfer (s s' : State) (signer : Pubkey) (amount : Nat)
    (h_inv : fee_conservation s) (h : transferTransition s signer amount = some s') :
    fee_conservation s' := by
  unfold transferTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem fee_conservation_preserved_by_release_milestone (s s' : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h_inv : fee_conservation s) (h : release_milestoneTransition s signer current_time due_timestamp = some s') :
    fee_conservation s' := by
  unfold release_milestoneTransition at h; split at h
  · next hg => cases h; unfold fee_conservation at h_inv ⊢; dsimp; omega
  · contradiction

/-- fee_conservation is preserved by every operation. Auto-proven by case split. -/
theorem fee_conservation_inductive (s s' : State) (signer : Pubkey) (op : Operation)
    (h_inv : fee_conservation s) (h : applyOp s signer op = some s') : fee_conservation s' := by
  cases op with
  | create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share =>
    simp [applyOp] at h
    unfold create_payment_policyTransition at h; split at h
    · next hg => cases h; unfold fee_conservation at h_inv ⊢; dsimp; omega
    · contradiction
  | execute_payment_case_0 chunk current_time => exact fee_conservation_preserved_by_execute_payment_case_0 s s' signer chunk current_time h_inv h
  | execute_payment_case_1 chunk current_time => exact fee_conservation_preserved_by_execute_payment_case_1 s s' signer chunk current_time h_inv h
  | execute_payment_otherwise chunk current_time => exact fee_conservation_preserved_by_execute_payment_otherwise s s' signer chunk current_time h_inv h
  | execute_composable_case_0 chunk current_time => exact fee_conservation_preserved_by_execute_composable_case_0 s s' signer chunk current_time h_inv h
  | execute_composable_case_1 chunk current_time => exact fee_conservation_preserved_by_execute_composable_case_1 s s' signer chunk current_time h_inv h
  | execute_composable_otherwise chunk current_time => exact fee_conservation_preserved_by_execute_composable_otherwise s s' signer chunk current_time h_inv h
  | transfer amount => exact fee_conservation_preserved_by_transfer s s' signer amount h_inv h
  | release_milestone current_time due_timestamp => exact fee_conservation_preserved_by_release_milestone s s' signer current_time due_timestamp h_inv h

def fee_is_bps_decomposition (s : State) : Prop := s.total_fee = (bps_mul (s.payment_amount) (s.gateway_fee_bps))

theorem fee_is_bps_decomposition_preserved_by_execute_payment_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_is_bps_decomposition s) (h : execute_payment_case_0Transition s signer chunk current_time = some s') :
    fee_is_bps_decomposition s' := by
  unfold execute_payment_case_0Transition at h; split at h
  · next hg => cases h; unfold fee_is_bps_decomposition at h_inv ⊢; dsimp; omega
  · contradiction

theorem fee_is_bps_decomposition_preserved_by_execute_payment_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_is_bps_decomposition s) (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    fee_is_bps_decomposition s' := by
  unfold execute_payment_case_1Transition at h; split at h
  · next hg => cases h; unfold fee_is_bps_decomposition at h_inv ⊢; dsimp; omega
  · contradiction

theorem fee_is_bps_decomposition_preserved_by_execute_payment_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_is_bps_decomposition s) (h : execute_payment_otherwiseTransition s signer chunk current_time = some s') :
    fee_is_bps_decomposition s' := by
  unfold execute_payment_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem fee_is_bps_decomposition_preserved_by_execute_composable_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_is_bps_decomposition s) (h : execute_composable_case_0Transition s signer chunk current_time = some s') :
    fee_is_bps_decomposition s' := by
  unfold execute_composable_case_0Transition at h; split at h
  · next hg => cases h; unfold fee_is_bps_decomposition at h_inv ⊢; dsimp; omega
  · contradiction

theorem fee_is_bps_decomposition_preserved_by_execute_composable_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_is_bps_decomposition s) (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    fee_is_bps_decomposition s' := by
  unfold execute_composable_case_1Transition at h; split at h
  · next hg => cases h; unfold fee_is_bps_decomposition at h_inv ⊢; dsimp; omega
  · contradiction

theorem fee_is_bps_decomposition_preserved_by_execute_composable_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : fee_is_bps_decomposition s) (h : execute_composable_otherwiseTransition s signer chunk current_time = some s') :
    fee_is_bps_decomposition s' := by
  unfold execute_composable_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem fee_is_bps_decomposition_preserved_by_release_milestone (s s' : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h_inv : fee_is_bps_decomposition s) (h : release_milestoneTransition s signer current_time due_timestamp = some s') :
    fee_is_bps_decomposition s' := by
  unfold release_milestoneTransition at h; split at h
  · next hg => cases h; unfold fee_is_bps_decomposition at h_inv ⊢; dsimp; omega
  · contradiction

/-- fee_is_bps_decomposition is preserved by every operation. Auto-proven by case split. -/
theorem fee_is_bps_decomposition_inductive (s s' : State) (signer : Pubkey) (op : Operation)
    (h_inv : fee_is_bps_decomposition s) (h : applyOp s signer op = some s') : fee_is_bps_decomposition s' := by
  cases op with
  | create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share =>
    simp [applyOp] at h
    unfold create_payment_policyTransition at h; split at h
    · next hg => cases h; unfold fee_is_bps_decomposition at h_inv ⊢; dsimp; omega
    · contradiction
  | execute_payment_case_0 chunk current_time => exact fee_is_bps_decomposition_preserved_by_execute_payment_case_0 s s' signer chunk current_time h_inv h
  | execute_payment_case_1 chunk current_time => exact fee_is_bps_decomposition_preserved_by_execute_payment_case_1 s s' signer chunk current_time h_inv h
  | execute_payment_otherwise chunk current_time => exact fee_is_bps_decomposition_preserved_by_execute_payment_otherwise s s' signer chunk current_time h_inv h
  | execute_composable_case_0 chunk current_time => exact fee_is_bps_decomposition_preserved_by_execute_composable_case_0 s s' signer chunk current_time h_inv h
  | execute_composable_case_1 chunk current_time => exact fee_is_bps_decomposition_preserved_by_execute_composable_case_1 s s' signer chunk current_time h_inv h
  | execute_composable_otherwise chunk current_time => exact fee_is_bps_decomposition_preserved_by_execute_composable_otherwise s s' signer chunk current_time h_inv h
  | transfer amount =>
    simp [applyOp, transferTransition] at h
    obtain ⟨_, h_eq⟩ := h
    subst h_eq; exact h_inv
  | release_milestone current_time due_timestamp => exact fee_is_bps_decomposition_preserved_by_release_milestone s s' signer current_time due_timestamp h_inv h

def recipient_net_of_fee (s : State) : Prop := (s.recipient_amount + s.total_fee) = s.payment_amount

theorem recipient_net_of_fee_preserved_by_execute_payment_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : recipient_net_of_fee s) (h : execute_payment_case_0Transition s signer chunk current_time = some s') :
    recipient_net_of_fee s' := by
  unfold execute_payment_case_0Transition at h; split at h
  · next hg => cases h; unfold recipient_net_of_fee at h_inv ⊢; dsimp; omega
  · contradiction

theorem recipient_net_of_fee_preserved_by_execute_payment_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : recipient_net_of_fee s) (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    recipient_net_of_fee s' := by
  unfold execute_payment_case_1Transition at h; split at h
  · next hg => cases h; unfold recipient_net_of_fee at h_inv ⊢; dsimp; omega
  · contradiction

theorem recipient_net_of_fee_preserved_by_execute_payment_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : recipient_net_of_fee s) (h : execute_payment_otherwiseTransition s signer chunk current_time = some s') :
    recipient_net_of_fee s' := by
  unfold execute_payment_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem recipient_net_of_fee_preserved_by_execute_composable_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : recipient_net_of_fee s) (h : execute_composable_case_0Transition s signer chunk current_time = some s') :
    recipient_net_of_fee s' := by
  unfold execute_composable_case_0Transition at h; split at h
  · next hg => cases h; unfold recipient_net_of_fee at h_inv ⊢; dsimp; omega
  · contradiction

theorem recipient_net_of_fee_preserved_by_execute_composable_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : recipient_net_of_fee s) (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    recipient_net_of_fee s' := by
  unfold execute_composable_case_1Transition at h; split at h
  · next hg => cases h; unfold recipient_net_of_fee at h_inv ⊢; dsimp; omega
  · contradiction

theorem recipient_net_of_fee_preserved_by_execute_composable_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : recipient_net_of_fee s) (h : execute_composable_otherwiseTransition s signer chunk current_time = some s') :
    recipient_net_of_fee s' := by
  unfold execute_composable_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem recipient_net_of_fee_preserved_by_release_milestone (s s' : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h_inv : recipient_net_of_fee s) (h : release_milestoneTransition s signer current_time due_timestamp = some s') :
    recipient_net_of_fee s' := by
  unfold release_milestoneTransition at h; split at h
  · next hg => cases h; unfold recipient_net_of_fee at h_inv ⊢; dsimp; omega
  · contradiction

/-- recipient_net_of_fee is preserved by every operation. Auto-proven by case split. -/
theorem recipient_net_of_fee_inductive (s s' : State) (signer : Pubkey) (op : Operation)
    (h_inv : recipient_net_of_fee s) (h : applyOp s signer op = some s') : recipient_net_of_fee s' := by
  cases op with
  | create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share =>
    simp [applyOp] at h
    unfold create_payment_policyTransition at h; split at h
    · next hg => cases h; unfold recipient_net_of_fee at h_inv ⊢; dsimp; omega
    · contradiction
  | execute_payment_case_0 chunk current_time => exact recipient_net_of_fee_preserved_by_execute_payment_case_0 s s' signer chunk current_time h_inv h
  | execute_payment_case_1 chunk current_time => exact recipient_net_of_fee_preserved_by_execute_payment_case_1 s s' signer chunk current_time h_inv h
  | execute_payment_otherwise chunk current_time => exact recipient_net_of_fee_preserved_by_execute_payment_otherwise s s' signer chunk current_time h_inv h
  | execute_composable_case_0 chunk current_time => exact recipient_net_of_fee_preserved_by_execute_composable_case_0 s s' signer chunk current_time h_inv h
  | execute_composable_case_1 chunk current_time => exact recipient_net_of_fee_preserved_by_execute_composable_case_1 s s' signer chunk current_time h_inv h
  | execute_composable_otherwise chunk current_time => exact recipient_net_of_fee_preserved_by_execute_composable_otherwise s s' signer chunk current_time h_inv h
  | transfer amount =>
    simp [applyOp, transferTransition] at h
    obtain ⟨_, h_eq⟩ := h
    subst h_eq; exact h_inv
  | release_milestone current_time due_timestamp => exact recipient_net_of_fee_preserved_by_release_milestone s s' signer current_time due_timestamp h_inv h

def pull_bounded (s : State) : Prop := s.pulled_amount ≤ s.max_chunk_amount

theorem pull_bounded_preserved_by_execute_payment_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : pull_bounded s) (h : execute_payment_case_0Transition s signer chunk current_time = some s') :
    pull_bounded s' := by
  unfold execute_payment_case_0Transition at h; split at h
  · next hg => cases h; unfold pull_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem pull_bounded_preserved_by_execute_payment_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : pull_bounded s) (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    pull_bounded s' := by
  unfold execute_payment_case_1Transition at h; split at h
  · next hg => cases h; unfold pull_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem pull_bounded_preserved_by_execute_payment_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : pull_bounded s) (h : execute_payment_otherwiseTransition s signer chunk current_time = some s') :
    pull_bounded s' := by
  unfold execute_payment_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem pull_bounded_preserved_by_execute_composable_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : pull_bounded s) (h : execute_composable_case_0Transition s signer chunk current_time = some s') :
    pull_bounded s' := by
  unfold execute_composable_case_0Transition at h; split at h
  · next hg => cases h; unfold pull_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem pull_bounded_preserved_by_execute_composable_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : pull_bounded s) (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    pull_bounded s' := by
  unfold execute_composable_case_1Transition at h; split at h
  · next hg => cases h; unfold pull_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem pull_bounded_preserved_by_execute_composable_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : pull_bounded s) (h : execute_composable_otherwiseTransition s signer chunk current_time = some s') :
    pull_bounded s' := by
  unfold execute_composable_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

/-- pull_bounded is preserved by every operation. Auto-proven by case split. -/
theorem pull_bounded_inductive (s s' : State) (signer : Pubkey) (op : Operation)
    (h_inv : pull_bounded s) (h : applyOp s signer op = some s') : pull_bounded s' := by
  cases op with
  | create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share =>
    simp [applyOp] at h
    unfold create_payment_policyTransition at h; split at h
    · next hg => cases h; unfold pull_bounded at h_inv ⊢; dsimp; omega
    · contradiction
  | execute_payment_case_0 chunk current_time => exact pull_bounded_preserved_by_execute_payment_case_0 s s' signer chunk current_time h_inv h
  | execute_payment_case_1 chunk current_time => exact pull_bounded_preserved_by_execute_payment_case_1 s s' signer chunk current_time h_inv h
  | execute_payment_otherwise chunk current_time => exact pull_bounded_preserved_by_execute_payment_otherwise s s' signer chunk current_time h_inv h
  | execute_composable_case_0 chunk current_time => exact pull_bounded_preserved_by_execute_composable_case_0 s s' signer chunk current_time h_inv h
  | execute_composable_case_1 chunk current_time => exact pull_bounded_preserved_by_execute_composable_case_1 s s' signer chunk current_time h_inv h
  | execute_composable_otherwise chunk current_time => exact pull_bounded_preserved_by_execute_composable_otherwise s s' signer chunk current_time h_inv h
  | transfer amount =>
    simp [applyOp] at h
    unfold transferTransition at h; split at h
    · next hg => cases h; unfold pull_bounded at h_inv ⊢; dsimp; omega
    · contradiction
  | release_milestone current_time due_timestamp =>
    simp [applyOp] at h
    unfold release_milestoneTransition at h; split at h
    · next hg => cases h; unfold pull_bounded at h_inv ⊢; dsimp; omega
    · contradiction

def residual_nonnegative (s : State) : Prop := s.gateway_residual ≤ s.total_fee

theorem residual_nonnegative_preserved_by_execute_payment_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : residual_nonnegative s) (h : execute_payment_case_0Transition s signer chunk current_time = some s') :
    residual_nonnegative s' := by
  unfold execute_payment_case_0Transition at h; split at h
  · next hg => cases h; unfold residual_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

theorem residual_nonnegative_preserved_by_execute_payment_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : residual_nonnegative s) (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    residual_nonnegative s' := by
  unfold execute_payment_case_1Transition at h; split at h
  · next hg => cases h; unfold residual_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

theorem residual_nonnegative_preserved_by_execute_payment_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : residual_nonnegative s) (h : execute_payment_otherwiseTransition s signer chunk current_time = some s') :
    residual_nonnegative s' := by
  unfold execute_payment_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem residual_nonnegative_preserved_by_execute_composable_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : residual_nonnegative s) (h : execute_composable_case_0Transition s signer chunk current_time = some s') :
    residual_nonnegative s' := by
  unfold execute_composable_case_0Transition at h; split at h
  · next hg => cases h; unfold residual_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

theorem residual_nonnegative_preserved_by_execute_composable_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : residual_nonnegative s) (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    residual_nonnegative s' := by
  unfold execute_composable_case_1Transition at h; split at h
  · next hg => cases h; unfold residual_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

theorem residual_nonnegative_preserved_by_execute_composable_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : residual_nonnegative s) (h : execute_composable_otherwiseTransition s signer chunk current_time = some s') :
    residual_nonnegative s' := by
  unfold execute_composable_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem residual_nonnegative_preserved_by_release_milestone (s s' : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h_inv : residual_nonnegative s) (h : release_milestoneTransition s signer current_time due_timestamp = some s') :
    residual_nonnegative s' := by
  unfold release_milestoneTransition at h; split at h
  · next hg => cases h; unfold residual_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

/-- residual_nonnegative is preserved by every operation. Auto-proven by case split. -/
theorem residual_nonnegative_inductive (s s' : State) (signer : Pubkey) (op : Operation)
    (h_inv : residual_nonnegative s) (h : applyOp s signer op = some s') : residual_nonnegative s' := by
  cases op with
  | create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share =>
    simp [applyOp] at h
    unfold create_payment_policyTransition at h; split at h
    · next hg => cases h; unfold residual_nonnegative at h_inv ⊢; dsimp; omega
    · contradiction
  | execute_payment_case_0 chunk current_time => exact residual_nonnegative_preserved_by_execute_payment_case_0 s s' signer chunk current_time h_inv h
  | execute_payment_case_1 chunk current_time => exact residual_nonnegative_preserved_by_execute_payment_case_1 s s' signer chunk current_time h_inv h
  | execute_payment_otherwise chunk current_time => exact residual_nonnegative_preserved_by_execute_payment_otherwise s s' signer chunk current_time h_inv h
  | execute_composable_case_0 chunk current_time => exact residual_nonnegative_preserved_by_execute_composable_case_0 s s' signer chunk current_time h_inv h
  | execute_composable_case_1 chunk current_time => exact residual_nonnegative_preserved_by_execute_composable_case_1 s s' signer chunk current_time h_inv h
  | execute_composable_otherwise chunk current_time => exact residual_nonnegative_preserved_by_execute_composable_otherwise s s' signer chunk current_time h_inv h
  | transfer amount =>
    simp [applyOp, transferTransition] at h
    obtain ⟨_, h_eq⟩ := h
    subst h_eq; exact h_inv
  | release_milestone current_time due_timestamp => exact residual_nonnegative_preserved_by_release_milestone s s' signer current_time due_timestamp h_inv h

def referral_pool_bounded (s : State) : Prop := s.referral_pool ≤ s.total_fee

theorem referral_pool_bounded_preserved_by_execute_payment_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : referral_pool_bounded s) (h : execute_payment_case_0Transition s signer chunk current_time = some s') :
    referral_pool_bounded s' := by
  unfold execute_payment_case_0Transition at h; split at h
  · next hg => cases h; unfold referral_pool_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem referral_pool_bounded_preserved_by_execute_payment_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : referral_pool_bounded s) (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    referral_pool_bounded s' := by
  unfold execute_payment_case_1Transition at h; split at h
  · next hg => cases h; unfold referral_pool_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem referral_pool_bounded_preserved_by_execute_payment_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : referral_pool_bounded s) (h : execute_payment_otherwiseTransition s signer chunk current_time = some s') :
    referral_pool_bounded s' := by
  unfold execute_payment_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem referral_pool_bounded_preserved_by_execute_composable_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : referral_pool_bounded s) (h : execute_composable_case_0Transition s signer chunk current_time = some s') :
    referral_pool_bounded s' := by
  unfold execute_composable_case_0Transition at h; split at h
  · next hg => cases h; unfold referral_pool_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem referral_pool_bounded_preserved_by_execute_composable_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : referral_pool_bounded s) (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    referral_pool_bounded s' := by
  unfold execute_composable_case_1Transition at h; split at h
  · next hg => cases h; unfold referral_pool_bounded at h_inv ⊢; dsimp; omega
  · contradiction

theorem referral_pool_bounded_preserved_by_execute_composable_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : referral_pool_bounded s) (h : execute_composable_otherwiseTransition s signer chunk current_time = some s') :
    referral_pool_bounded s' := by
  unfold execute_composable_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem referral_pool_bounded_preserved_by_release_milestone (s s' : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h_inv : referral_pool_bounded s) (h : release_milestoneTransition s signer current_time due_timestamp = some s') :
    referral_pool_bounded s' := by
  unfold release_milestoneTransition at h; split at h
  · next hg => cases h; unfold referral_pool_bounded at h_inv ⊢; dsimp; omega
  · contradiction

/-- referral_pool_bounded is preserved by every operation. Auto-proven by case split. -/
theorem referral_pool_bounded_inductive (s s' : State) (signer : Pubkey) (op : Operation)
    (h_inv : referral_pool_bounded s) (h : applyOp s signer op = some s') : referral_pool_bounded s' := by
  cases op with
  | create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share =>
    simp [applyOp] at h
    unfold create_payment_policyTransition at h; split at h
    · next hg => cases h; unfold referral_pool_bounded at h_inv ⊢; dsimp; omega
    · contradiction
  | execute_payment_case_0 chunk current_time => exact referral_pool_bounded_preserved_by_execute_payment_case_0 s s' signer chunk current_time h_inv h
  | execute_payment_case_1 chunk current_time => exact referral_pool_bounded_preserved_by_execute_payment_case_1 s s' signer chunk current_time h_inv h
  | execute_payment_otherwise chunk current_time => exact referral_pool_bounded_preserved_by_execute_payment_otherwise s s' signer chunk current_time h_inv h
  | execute_composable_case_0 chunk current_time => exact referral_pool_bounded_preserved_by_execute_composable_case_0 s s' signer chunk current_time h_inv h
  | execute_composable_case_1 chunk current_time => exact referral_pool_bounded_preserved_by_execute_composable_case_1 s s' signer chunk current_time h_inv h
  | execute_composable_otherwise chunk current_time => exact referral_pool_bounded_preserved_by_execute_composable_otherwise s s' signer chunk current_time h_inv h
  | transfer amount =>
    simp [applyOp, transferTransition] at h
    obtain ⟨_, h_eq⟩ := h
    subst h_eq; exact h_inv
  | release_milestone current_time due_timestamp => exact referral_pool_bounded_preserved_by_release_milestone s s' signer current_time due_timestamp h_inv h

def sweep_nonnegative (s : State) : Prop := s.recipient_amount ≤ s.payment_amount

theorem sweep_nonnegative_preserved_by_execute_payment_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : sweep_nonnegative s) (h : execute_payment_case_0Transition s signer chunk current_time = some s') :
    sweep_nonnegative s' := by
  unfold execute_payment_case_0Transition at h; split at h
  · next hg => cases h; unfold sweep_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

theorem sweep_nonnegative_preserved_by_execute_payment_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : sweep_nonnegative s) (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    sweep_nonnegative s' := by
  unfold execute_payment_case_1Transition at h; split at h
  · next hg => cases h; unfold sweep_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

theorem sweep_nonnegative_preserved_by_execute_payment_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : sweep_nonnegative s) (h : execute_payment_otherwiseTransition s signer chunk current_time = some s') :
    sweep_nonnegative s' := by
  unfold execute_payment_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem sweep_nonnegative_preserved_by_execute_composable_case_0 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : sweep_nonnegative s) (h : execute_composable_case_0Transition s signer chunk current_time = some s') :
    sweep_nonnegative s' := by
  unfold execute_composable_case_0Transition at h; split at h
  · next hg => cases h; unfold sweep_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

theorem sweep_nonnegative_preserved_by_execute_composable_case_1 (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : sweep_nonnegative s) (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    sweep_nonnegative s' := by
  unfold execute_composable_case_1Transition at h; split at h
  · next hg => cases h; unfold sweep_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

theorem sweep_nonnegative_preserved_by_execute_composable_otherwise (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_inv : sweep_nonnegative s) (h : execute_composable_otherwiseTransition s signer chunk current_time = some s') :
    sweep_nonnegative s' := by
  unfold execute_composable_otherwiseTransition at h; split at h
  · cases h; exact h_inv
  · contradiction

theorem sweep_nonnegative_preserved_by_release_milestone (s s' : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h_inv : sweep_nonnegative s) (h : release_milestoneTransition s signer current_time due_timestamp = some s') :
    sweep_nonnegative s' := by
  unfold release_milestoneTransition at h; split at h
  · next hg => cases h; unfold sweep_nonnegative at h_inv ⊢; dsimp; omega
  · contradiction

/-- sweep_nonnegative is preserved by every operation. Auto-proven by case split. -/
theorem sweep_nonnegative_inductive (s s' : State) (signer : Pubkey) (op : Operation)
    (h_inv : sweep_nonnegative s) (h : applyOp s signer op = some s') : sweep_nonnegative s' := by
  cases op with
  | create_payment_policy max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share =>
    simp [applyOp] at h
    unfold create_payment_policyTransition at h; split at h
    · next hg => cases h; unfold sweep_nonnegative at h_inv ⊢; dsimp; omega
    · contradiction
  | execute_payment_case_0 chunk current_time => exact sweep_nonnegative_preserved_by_execute_payment_case_0 s s' signer chunk current_time h_inv h
  | execute_payment_case_1 chunk current_time => exact sweep_nonnegative_preserved_by_execute_payment_case_1 s s' signer chunk current_time h_inv h
  | execute_payment_otherwise chunk current_time => exact sweep_nonnegative_preserved_by_execute_payment_otherwise s s' signer chunk current_time h_inv h
  | execute_composable_case_0 chunk current_time => exact sweep_nonnegative_preserved_by_execute_composable_case_0 s s' signer chunk current_time h_inv h
  | execute_composable_case_1 chunk current_time => exact sweep_nonnegative_preserved_by_execute_composable_case_1 s s' signer chunk current_time h_inv h
  | execute_composable_otherwise chunk current_time => exact sweep_nonnegative_preserved_by_execute_composable_otherwise s s' signer chunk current_time h_inv h
  | transfer amount =>
    simp [applyOp, transferTransition] at h
    obtain ⟨_, h_eq⟩ := h
    subst h_eq; exact h_inv
  | release_milestone current_time due_timestamp => exact sweep_nonnegative_preserved_by_release_milestone s s' signer current_time due_timestamp h_inv h

-- ============================================================================
-- Abort conditions — operations must reject under specified conditions
-- ============================================================================

theorem create_payment_policy_aborts_if_InvalidAmount_0 (s : State) (signer : Pubkey) (max_per_period : Nat) (max_chunk : Nat) (period_secs : Nat) (fee_bps : Nat) (proto_share : Nat) (sched_share : Nat) (referral_share : Nat)
    (h : ¬(max_per_period > 0)) : create_payment_policyTransition s signer max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share = none := by
  unfold create_payment_policyTransition
  rw [if_neg (fun hg => h hg.1)]

theorem create_payment_policy_aborts_if_InvalidAmount_1 (s : State) (signer : Pubkey) (max_per_period : Nat) (max_chunk : Nat) (period_secs : Nat) (fee_bps : Nat) (proto_share : Nat) (sched_share : Nat) (referral_share : Nat)
    (h : ¬(max_chunk > 0)) : create_payment_policyTransition s signer max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share = none := by
  unfold create_payment_policyTransition
  rw [if_neg (fun hg => h hg.2.1)]

theorem create_payment_policy_aborts_if_InvalidAmount_2 (s : State) (signer : Pubkey) (max_per_period : Nat) (max_chunk : Nat) (period_secs : Nat) (fee_bps : Nat) (proto_share : Nat) (sched_share : Nat) (referral_share : Nat)
    (h : ¬(max_chunk ≤ max_per_period)) : create_payment_policyTransition s signer max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share = none := by
  unfold create_payment_policyTransition
  rw [if_neg (fun hg => h hg.2.2.1)]

theorem create_payment_policy_aborts_if_InvalidAmount_3 (s : State) (signer : Pubkey) (max_per_period : Nat) (max_chunk : Nat) (period_secs : Nat) (fee_bps : Nat) (proto_share : Nat) (sched_share : Nat) (referral_share : Nat)
    (h : ¬(period_secs > 0)) : create_payment_policyTransition s signer max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share = none := by
  unfold create_payment_policyTransition
  rw [if_neg (fun hg => h hg.2.2.2.1)]

theorem create_payment_policy_aborts_if_CombinedFeeBpsExceedsMax (s : State) (signer : Pubkey) (max_per_period : Nat) (max_chunk : Nat) (period_secs : Nat) (fee_bps : Nat) (proto_share : Nat) (sched_share : Nat) (referral_share : Nat)
    (h : ¬((proto_share + sched_share + referral_share) ≤ 10000)) : create_payment_policyTransition s signer max_per_period max_chunk period_secs fee_bps proto_share sched_share referral_share = none := by
  unfold create_payment_policyTransition
  rw [if_neg (fun hg => h hg.2.2.2.2)]

theorem execute_payment_case_0_aborts_if_ProgramPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(emergency_pause = 0)) : execute_payment_case_0Transition s signer chunk current_time = none := by
  unfold execute_payment_case_0Transition
  rw [if_neg (fun hg => h hg.1)]

theorem execute_payment_case_0_aborts_if_PolicyPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(policy_status = 0)) : execute_payment_case_0Transition s signer chunk current_time = none := by
  unfold execute_payment_case_0Transition
  rw [if_neg (fun hg => h hg.2.1)]

theorem execute_payment_case_0_aborts_if_InvalidAmount_0 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk > 0)) : execute_payment_case_0Transition s signer chunk current_time = none := by
  unfold execute_payment_case_0Transition
  rw [if_neg (fun hg => h hg.2.2.1)]

theorem execute_payment_case_0_aborts_if_InvalidAmount_1 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk ≤ max_chunk_amount)) : execute_payment_case_0Transition s signer chunk current_time = none := by
  unfold execute_payment_case_0Transition
  rw [if_neg (fun hg => h hg.2.2.2)]

theorem execute_payment_case_1_aborts_if_ProgramPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(emergency_pause = 0)) : execute_payment_case_1Transition s signer chunk current_time = none := by
  unfold execute_payment_case_1Transition
  rw [if_neg (fun hg => h hg.1)]

theorem execute_payment_case_1_aborts_if_PolicyPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(policy_status = 0)) : execute_payment_case_1Transition s signer chunk current_time = none := by
  unfold execute_payment_case_1Transition
  rw [if_neg (fun hg => h hg.2.1)]

theorem execute_payment_case_1_aborts_if_InvalidAmount_0 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk > 0)) : execute_payment_case_1Transition s signer chunk current_time = none := by
  unfold execute_payment_case_1Transition
  rw [if_neg (fun hg => h hg.2.2.1)]

theorem execute_payment_case_1_aborts_if_InvalidAmount_1 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk ≤ max_chunk_amount)) : execute_payment_case_1Transition s signer chunk current_time = none := by
  unfold execute_payment_case_1Transition
  rw [if_neg (fun hg => h hg.2.2.2.1)]

theorem execute_payment_otherwise_aborts_if_ProgramPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(emergency_pause = 0)) : execute_payment_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_payment_otherwiseTransition
  rw [if_neg (fun hg => h hg.1)]

theorem execute_payment_otherwise_aborts_if_PolicyPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(policy_status = 0)) : execute_payment_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_payment_otherwiseTransition
  rw [if_neg (fun hg => h hg.2.1)]

theorem execute_payment_otherwise_aborts_if_InvalidAmount_0 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk > 0)) : execute_payment_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_payment_otherwiseTransition
  rw [if_neg (fun hg => h hg.2.2.1)]

theorem execute_payment_otherwise_aborts_if_InvalidAmount_1 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk ≤ max_chunk_amount)) : execute_payment_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_payment_otherwiseTransition
  rw [if_neg (fun hg => h hg.2.2.2.1)]

theorem execute_payment_otherwise_aborts_if_InsufficientDelegatedAmount (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(0 = 1)) : execute_payment_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_payment_otherwiseTransition
  rw [if_neg (fun hg => h hg.2.2.2.2)]

theorem execute_composable_case_0_aborts_if_ProgramPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(emergency_pause = 0)) : execute_composable_case_0Transition s signer chunk current_time = none := by
  unfold execute_composable_case_0Transition
  rw [if_neg (fun hg => h hg.1)]

theorem execute_composable_case_0_aborts_if_PolicyPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(policy_status = 0)) : execute_composable_case_0Transition s signer chunk current_time = none := by
  unfold execute_composable_case_0Transition
  rw [if_neg (fun hg => h hg.2.1)]

theorem execute_composable_case_0_aborts_if_InvalidAmount_0 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk > 0)) : execute_composable_case_0Transition s signer chunk current_time = none := by
  unfold execute_composable_case_0Transition
  rw [if_neg (fun hg => h hg.2.2.1)]

theorem execute_composable_case_0_aborts_if_InvalidAmount_1 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk ≤ max_chunk_amount)) : execute_composable_case_0Transition s signer chunk current_time = none := by
  unfold execute_composable_case_0Transition
  rw [if_neg (fun hg => h hg.2.2.2)]

theorem execute_composable_case_1_aborts_if_ProgramPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(emergency_pause = 0)) : execute_composable_case_1Transition s signer chunk current_time = none := by
  unfold execute_composable_case_1Transition
  rw [if_neg (fun hg => h hg.1)]

theorem execute_composable_case_1_aborts_if_PolicyPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(policy_status = 0)) : execute_composable_case_1Transition s signer chunk current_time = none := by
  unfold execute_composable_case_1Transition
  rw [if_neg (fun hg => h hg.2.1)]

theorem execute_composable_case_1_aborts_if_InvalidAmount_0 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk > 0)) : execute_composable_case_1Transition s signer chunk current_time = none := by
  unfold execute_composable_case_1Transition
  rw [if_neg (fun hg => h hg.2.2.1)]

theorem execute_composable_case_1_aborts_if_InvalidAmount_1 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk ≤ max_chunk_amount)) : execute_composable_case_1Transition s signer chunk current_time = none := by
  unfold execute_composable_case_1Transition
  rw [if_neg (fun hg => h hg.2.2.2.1)]

theorem execute_composable_otherwise_aborts_if_ProgramPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(emergency_pause = 0)) : execute_composable_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_composable_otherwiseTransition
  rw [if_neg (fun hg => h hg.1)]

theorem execute_composable_otherwise_aborts_if_PolicyPaused (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(policy_status = 0)) : execute_composable_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_composable_otherwiseTransition
  rw [if_neg (fun hg => h hg.2.1)]

theorem execute_composable_otherwise_aborts_if_InvalidAmount_0 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk > 0)) : execute_composable_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_composable_otherwiseTransition
  rw [if_neg (fun hg => h hg.2.2.1)]

theorem execute_composable_otherwise_aborts_if_InvalidAmount_1 (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(chunk ≤ max_chunk_amount)) : execute_composable_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_composable_otherwiseTransition
  rw [if_neg (fun hg => h hg.2.2.2.1)]

theorem execute_composable_otherwise_aborts_if_InsufficientDelegatedAmount (s : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h : ¬(0 = 1)) : execute_composable_otherwiseTransition s signer chunk current_time = none := by
  unfold execute_composable_otherwiseTransition
  rw [if_neg (fun hg => h hg.2.2.2.2)]

theorem transfer_aborts_if_ProgramPaused (s : State) (signer : Pubkey) (amount : Nat)
    (h : ¬(emergency_pause = 0)) : transferTransition s signer amount = none := by
  unfold transferTransition
  rw [if_neg (fun hg => h hg.1)]

theorem transfer_aborts_if_PolicyPaused (s : State) (signer : Pubkey) (amount : Nat)
    (h : ¬(policy_status = 0)) : transferTransition s signer amount = none := by
  unfold transferTransition
  rw [if_neg (fun hg => h hg.2.1)]

theorem transfer_aborts_if_InvalidAmount (s : State) (signer : Pubkey) (amount : Nat)
    (h : ¬(amount > 0)) : transferTransition s signer amount = none := by
  unfold transferTransition
  rw [if_neg (fun hg => h hg.2.2)]

theorem release_milestone_aborts_if_ProgramPaused (s : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h : ¬(emergency_pause = 0)) : release_milestoneTransition s signer current_time due_timestamp = none := by
  unfold release_milestoneTransition
  rw [if_neg (fun hg => h hg.1)]

theorem release_milestone_aborts_if_PolicyPaused (s : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h : ¬(policy_status = 0)) : release_milestoneTransition s signer current_time due_timestamp = none := by
  unfold release_milestoneTransition
  rw [if_neg (fun hg => h hg.2.1)]

theorem release_milestone_aborts_if_PaymentNotDue (s : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h : ¬(release_due_date = 0 ∨ current_time ≥ due_timestamp)) : release_milestoneTransition s signer current_time due_timestamp = none := by
  unfold release_milestoneTransition
  rw [if_neg (fun hg => h hg.2.2.1)]

theorem release_milestone_aborts_if_Unauthorized_0 (s : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h : ¬(release_requires_gateway = 0 ∨ caller_is_gateway = 1)) : release_milestoneTransition s signer current_time due_timestamp = none := by
  unfold release_milestoneTransition
  rw [if_neg (fun hg => h hg.2.2.2.1)]

theorem release_milestone_aborts_if_Unauthorized_1 (s : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h : ¬(release_requires_owner = 0 ∨ caller_is_owner = 1)) : release_milestoneTransition s signer current_time due_timestamp = none := by
  unfold release_milestoneTransition
  rw [if_neg (fun hg => h hg.2.2.2.2.1)]

theorem release_milestone_aborts_if_Unauthorized_2 (s : State) (signer : Pubkey) (current_time : Nat) (due_timestamp : Nat)
    (h : ¬(release_requires_recipient = 0 ∨ caller_is_recipient = 1)) : release_milestoneTransition s signer current_time due_timestamp = none := by
  unfold release_milestoneTransition
  rw [if_neg (fun hg => h hg.2.2.2.2.2)]

-- ============================================================================
-- Overflow safety obligations (auto-generated for operations with add effects)
-- ============================================================================

theorem execute_payment_case_1_overflow_safe (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_valid : valid_u8 s.policy_status ∧ valid_u8 s.emergency_pause ∧ valid_u64 s.max_amount_per_period ∧ valid_u64 s.max_chunk_amount ∧ valid_u64 s.period_length_seconds ∧ valid_u64 s.current_period_start ∧ valid_u64 s.current_period_total ∧ valid_u64 s.pulled_amount ∧ valid_u64 s.payment_amount ∧ valid_u16 s.gateway_fee_bps ∧ valid_u16 s.protocol_share_bps ∧ valid_u16 s.scheduler_share_bps ∧ valid_u16 s.referral_allocation_bps ∧ valid_u8 s.is_referral_enabled ∧ valid_u8 s.is_net_mode ∧ valid_u64 s.total_fee ∧ valid_u64 s.protocol_cut ∧ valid_u64 s.scheduler_cut ∧ valid_u64 s.referral_pool ∧ valid_u64 s.gateway_residual ∧ valid_u64 s.recipient_amount ∧ valid_u64 s.total_from_user ∧ valid_u8 s.release_due_date ∧ valid_u8 s.release_requires_gateway ∧ valid_u8 s.release_requires_owner ∧ valid_u8 s.release_requires_recipient ∧ valid_u8 s.caller_is_gateway ∧ valid_u8 s.caller_is_owner ∧ valid_u8 s.caller_is_recipient)
    (h_inv_period_bounded : period_bounded s)
    (h_inv_period_cap_fixed : period_cap_fixed s)
    (h_inv_fee_conservation : fee_conservation s)
    (h_inv_fee_is_bps_decomposition : fee_is_bps_decomposition s)
    (h_inv_recipient_net_of_fee : recipient_net_of_fee s)
    (h_inv_pull_bounded : pull_bounded s)
    (h_inv_residual_nonnegative : residual_nonnegative s)
    (h_inv_referral_pool_bounded : referral_pool_bounded s)
    (h_inv_sweep_nonnegative : sweep_nonnegative s)
    (h : execute_payment_case_1Transition s signer chunk current_time = some s') :
    valid_u8 s'.policy_status ∧ valid_u8 s'.emergency_pause ∧ valid_u64 s'.max_amount_per_period ∧ valid_u64 s'.max_chunk_amount ∧ valid_u64 s'.period_length_seconds ∧ valid_u64 s'.current_period_start ∧ valid_u64 s'.current_period_total ∧ valid_u64 s'.pulled_amount ∧ valid_u64 s'.payment_amount ∧ valid_u16 s'.gateway_fee_bps ∧ valid_u16 s'.protocol_share_bps ∧ valid_u16 s'.scheduler_share_bps ∧ valid_u16 s'.referral_allocation_bps ∧ valid_u8 s'.is_referral_enabled ∧ valid_u8 s'.is_net_mode ∧ valid_u64 s'.total_fee ∧ valid_u64 s'.protocol_cut ∧ valid_u64 s'.scheduler_cut ∧ valid_u64 s'.referral_pool ∧ valid_u64 s'.gateway_residual ∧ valid_u64 s'.recipient_amount ∧ valid_u64 s'.total_from_user ∧ valid_u8 s'.release_due_date ∧ valid_u8 s'.release_requires_gateway ∧ valid_u8 s'.release_requires_owner ∧ valid_u8 s'.release_requires_recipient ∧ valid_u8 s'.caller_is_gateway ∧ valid_u8 s'.caller_is_owner ∧ valid_u8 s'.caller_is_recipient := by
  unfold execute_payment_case_1Transition at h; split at h
  · next hg =>
    cases h
    refine ⟨h_valid.1, h_valid.2.1, h_valid.2.2.1, h_valid.2.2.2.1, h_valid.2.2.2.2.1, h_valid.2.2.2.2.2.1, ?_, h_valid.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2⟩
    simp only [valid_u64, Valid.valid_u64, Valid.U64_MAX]; omega
  · contradiction

theorem execute_composable_case_1_overflow_safe (s s' : State) (signer : Pubkey) (chunk : Nat) (current_time : Nat)
    (h_valid : valid_u8 s.policy_status ∧ valid_u8 s.emergency_pause ∧ valid_u64 s.max_amount_per_period ∧ valid_u64 s.max_chunk_amount ∧ valid_u64 s.period_length_seconds ∧ valid_u64 s.current_period_start ∧ valid_u64 s.current_period_total ∧ valid_u64 s.pulled_amount ∧ valid_u64 s.payment_amount ∧ valid_u16 s.gateway_fee_bps ∧ valid_u16 s.protocol_share_bps ∧ valid_u16 s.scheduler_share_bps ∧ valid_u16 s.referral_allocation_bps ∧ valid_u8 s.is_referral_enabled ∧ valid_u8 s.is_net_mode ∧ valid_u64 s.total_fee ∧ valid_u64 s.protocol_cut ∧ valid_u64 s.scheduler_cut ∧ valid_u64 s.referral_pool ∧ valid_u64 s.gateway_residual ∧ valid_u64 s.recipient_amount ∧ valid_u64 s.total_from_user ∧ valid_u8 s.release_due_date ∧ valid_u8 s.release_requires_gateway ∧ valid_u8 s.release_requires_owner ∧ valid_u8 s.release_requires_recipient ∧ valid_u8 s.caller_is_gateway ∧ valid_u8 s.caller_is_owner ∧ valid_u8 s.caller_is_recipient)
    (h_inv_period_bounded : period_bounded s)
    (h_inv_period_cap_fixed : period_cap_fixed s)
    (h_inv_fee_conservation : fee_conservation s)
    (h_inv_fee_is_bps_decomposition : fee_is_bps_decomposition s)
    (h_inv_recipient_net_of_fee : recipient_net_of_fee s)
    (h_inv_pull_bounded : pull_bounded s)
    (h_inv_residual_nonnegative : residual_nonnegative s)
    (h_inv_referral_pool_bounded : referral_pool_bounded s)
    (h_inv_sweep_nonnegative : sweep_nonnegative s)
    (h : execute_composable_case_1Transition s signer chunk current_time = some s') :
    valid_u8 s'.policy_status ∧ valid_u8 s'.emergency_pause ∧ valid_u64 s'.max_amount_per_period ∧ valid_u64 s'.max_chunk_amount ∧ valid_u64 s'.period_length_seconds ∧ valid_u64 s'.current_period_start ∧ valid_u64 s'.current_period_total ∧ valid_u64 s'.pulled_amount ∧ valid_u64 s'.payment_amount ∧ valid_u16 s'.gateway_fee_bps ∧ valid_u16 s'.protocol_share_bps ∧ valid_u16 s'.scheduler_share_bps ∧ valid_u16 s'.referral_allocation_bps ∧ valid_u8 s'.is_referral_enabled ∧ valid_u8 s'.is_net_mode ∧ valid_u64 s'.total_fee ∧ valid_u64 s'.protocol_cut ∧ valid_u64 s'.scheduler_cut ∧ valid_u64 s'.referral_pool ∧ valid_u64 s'.gateway_residual ∧ valid_u64 s'.recipient_amount ∧ valid_u64 s'.total_from_user ∧ valid_u8 s'.release_due_date ∧ valid_u8 s'.release_requires_gateway ∧ valid_u8 s'.release_requires_owner ∧ valid_u8 s'.release_requires_recipient ∧ valid_u8 s'.caller_is_gateway ∧ valid_u8 s'.caller_is_owner ∧ valid_u8 s'.caller_is_recipient := by
  unfold execute_composable_case_1Transition at h; split at h
  · next hg =>
    cases h
    refine ⟨h_valid.1, h_valid.2.1, h_valid.2.2.1, h_valid.2.2.2.1, h_valid.2.2.2.2.1, h_valid.2.2.2.2.2.1, ?_, h_valid.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.1, h_valid.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2⟩
    simp only [valid_u64, Valid.valid_u64, Valid.U64_MAX]; omega
  · contradiction

end Tributary
