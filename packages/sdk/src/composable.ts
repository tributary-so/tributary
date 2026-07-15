/**
 * Composable execution primitives — shared helpers extracted from
 * `apps/scheduler` and `apps/cli` (ADR-0030).
 *
 * These functions cover the four duplicated concerns of composable policy
 * execution:
 *
 * 1. **Forward-gate check** — {@link isForwardEnabled}
 * 2. **PayAsYouGo face→gross adjustment** — {@link grossCapToFace}
 * 3. **Default forward-amount derivation** — {@link resolveDefaultForwardAmount}
 * 4. **Validation-target resolution** — {@link resolveValidationTargets}
 * 5. **remaining_accounts assembly** — {@link assembleComposableRemainingAccounts}
 *
 * Plus the {@link ForwardBuilder} interface that decouples the SDK from any
 * specific forward-program implementation (concrete impls live in
 * `@tributary-so/forward-builders`).
 *
 * There is intentionally **no orchestrator**. Callers chain the primitives
 * explicitly — the CLI needs to override individual steps via flags, and an
 * opts-bag orchestrator would just re-encode the primitives as optional
 * params (ADR-0030 §1).
 */

import { PublicKey, type AccountMeta, type Connection } from "@solana/web3.js";
import BN from "bn.js";
import { getPostValidationPda, getPreValidationPda } from "./pda";
import {
  parseValidationPda,
  type ComposablePolicy,
  type PaymentGateway,
  type ValidationSpec,
} from "./types";

/**
 * Per-account metadata returned by a {@link ForwardBuilder}.
 *
 * Deliberately omits `isSigner` — the assembler
 * ({@link assembleComposableRemainingAccounts}) stamps `isSigner: false` on
 * every account, enforcing ADR-0008 (CPI signer sanitization). A builder
 * literally cannot leak signer authority because the field does not exist
 * on this type.
 */
export type ForwardAccountMeta = { pubkey: PublicKey; isWritable: boolean };

/**
 * Result of {@link ForwardBuilder.build}.
 */
export interface ForwardBuildResult {
  /** Raw instruction data for the forward-program CPI (empty when disabled). */
  instructionData: Buffer;
  /** Forward-program accounts in program-declared order. */
  forwardAccounts: ForwardAccountMeta[];
}

/**
 * Builds the forward-program instruction for a composable execution.
 *
 * The builder receives `face` (the amount the forward consumes; the caller
 * resolves it via {@link resolveDefaultForwardAmount} or a manual override)
 * and returns the instruction data + the forward-program account list with
 * per-account writability.
 *
 * Concrete implementations (e.g. `MeteoraDlmmForward`) live in
 * `@tributary-so/forward-builders`, keeping the SDK's dependency surface
 * free of forward-program crates.
 */
export interface ForwardBuilder {
  build(ctx: {
    connection: Connection;
    policy: ComposablePolicy;
    composablePolicyPda: PublicKey;
    face: BN;
  }): Promise<ForwardBuildResult>;
}

/**
 * True when the composable policy has a forward step enabled.
 *
 * A sentinel `programId` of `PublicKey.default` on the
 * `InstructionConstraint` disables forwarding entirely (ADR-0009).
 */
export function isForwardEnabled(policy: ComposablePolicy): boolean {
  return !policy.forwardConfig.instructionConstraint.programId.equals(
    PublicKey.default
  );
}

/**
 * Convert a gross-denominated cap into the face amount the forward consumes.
 *
 * Composable execution is NET-on-pull (ADR-0026): the program pulls
 * `gross = face + fee` from the user, then skims the fee in the input mint.
 * For a PayAsYouGo policy whose `maxChunkAmount` binds on GROSS, the forward
 * can consume at most `face = floor(grossCap × 10000 / (10000 + feeBps))`.
 *
 * Pure function — no I/O.
 */
export function grossCapToFace(grossCap: BN, feeBps: number): BN {
  if (feeBps <= 0) return grossCap;
  return grossCap.muln(10_000).divn(10_000 + feeBps);
}

/**
 * Derive the default forward (face) amount for a composable policy.
 *
 * - **PayAsYouGo**: `grossCapToFace(maxChunkAmount, feeBps)` capped by the
 *   remaining per-period allowance
 *   (`maxAmountPerPeriod − currentPeriodTotal`).
 * - **Subscription / Milestone / OneTime / UpTo**: `null` — the program
 *   derives the amount from the policy (or, for UpTo, the caller must supply
 *   the actual amount at execute time).
 *
 * Pure function — reads from the account structs, no RPC.
 */
export function resolveDefaultForwardAmount(
  policy: ComposablePolicy,
  gateway: PaymentGateway
): BN | null {
  const payg = policy.policyType.payAsYouGo;
  if (!payg) return null;

  const face = grossCapToFace(payg.maxChunkAmount, gateway.gatewayFeeBps);
  const remainingPeriod = payg.maxAmountPerPeriod.sub(payg.currentPeriodTotal);
  return BN.min(face, remainingPeriod);
}

/**
 * Resolve the Lighthouse target accounts pinned in a composable policy's
 * ValidationPda for the given phase.
 *
 * - If `spec` is not `ProgramCall` → `[]` (validation disabled).
 * - Fetches the ValidationPda derived from `policyPda` + `phase` +
 *   `programId`.
 * - If the account is missing/unreadable → `[]` (lets the on-chain pin-check
 *   reject loudly — matches scheduler/CLI behavior).
 * - Otherwise returns `pinnedAccounts[0..numPinnedAccounts]`.
 *
 * The ValidationPda itself is a named Anchor account and is **not** part of
 * the returned slice (ADR-0016).
 */
export async function resolveValidationTargets(
  connection: Connection,
  policyPda: PublicKey,
  spec: ValidationSpec,
  programId: PublicKey,
  phase: "pre" | "post"
): Promise<PublicKey[]> {
  if (!("programCall" in spec)) return [];

  const valPda =
    phase === "pre"
      ? getPreValidationPda(policyPda, programId).address
      : getPostValidationPda(policyPda, programId).address;

  const acct = await connection.getAccountInfo(valPda);
  if (!acct?.data) return [];

  const parsed = parseValidationPda(acct.data);
  return parsed.pinnedAccounts.slice(0, parsed.numPinnedAccounts);
}

/**
 * Assemble the `remaining_accounts` slice for `execute_composable` in the
 * ADR-0016 order: `[...preTargets, ...forwardAccounts, ...postTargets]`.
 *
 * This function owns the ADR-0008 security boundary: `isSigner` is **always**
 * `false` on every emitted {@link AccountMeta}. Forward builders supply
 * per-account `isWritable`; validation targets are read-only.
 *
 * The ValidationPda itself is **not** part of this slice — it is a named
 * Anchor account (`pre_validation_pda` / `post_validation_pda`).
 */
export function assembleComposableRemainingAccounts(args: {
  preTargets: PublicKey[];
  forwardAccounts: ForwardAccountMeta[];
  postTargets: PublicKey[];
}): AccountMeta[] {
  const { preTargets, forwardAccounts, postTargets } = args;
  return [
    ...preTargets.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: false,
    })),
    ...forwardAccounts.map(({ pubkey, isWritable }) => ({
      pubkey,
      isSigner: false,
      isWritable,
    })),
    ...postTargets.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: false,
    })),
  ];
}
