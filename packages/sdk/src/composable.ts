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
 * The straight-line orchestrator {@link buildComposableExecutionPayload}
 * composes the primitives for the common case where no per-step override is
 * needed (ADR-0030 §1, amended — third caller materialized in tests +
 * external integrators; the CLI override path keeps the primitives
 * exported alongside).
 */

import { PublicKey, type AccountMeta, type Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
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

/**
 * Derive the scheduler fee ATA for the permissionless execution path
 * (ADR-0016 amended).
 *
 * When the caller (`authority` / fee_payer) is NOT the gateway signer and
 * the gateway has a non-zero `schedulerShareBps`, the program requires the
 * relayer's input-mint ATA as the LAST entry in `remaining_accounts`.
 * Without it, execution fails with `MissingSchedulerFeeAccount`.
 *
 * Returns the ATA pubkey when the permissionless + scheduler-share
 * conditions are met, or `null` otherwise (trusted-signer path or zero
 * scheduler share → no ATA needed).
 *
 * The ATA is the standard associated token account for `(inputMint,
 * authority)` — the program validates `owner == fee_payer` and
 * `mint == input_mint` on-chain (`InvalidSchedulerFeeAccount`).
 *
 * Pure function — PDA derivation only, no RPC.
 */
export function deriveSchedulerAta(args: {
  authority: PublicKey;
  gatewaySigner: PublicKey;
  schedulerShareBps: number;
  inputMint: PublicKey;
}): PublicKey | null {
  const { authority, gatewaySigner, schedulerShareBps, inputMint } = args;
  const isPermissionless = !authority.equals(gatewaySigner);
  if (!isPermissionless || schedulerShareBps <= 0) return null;
  return getAssociatedTokenAddressSync(inputMint, authority);
}

/**
 * Build the full execution payload (`instructionData` + `remaining_accounts`)
 * for `execute_composable` by composing the four primitives in order
 * (ADR-0030 §1, amended).
 *
 * Flow:
 * 1. **Forward gate** — when {@link isForwardEnabled} is true and a
 *    `forwardBuilder` is supplied, run it with the caller-resolved `face` to
 *    obtain the forward instruction data + forward-program account slice.
 *    Throws when forward is enabled but no builder is passed — the
 *    orchestrator cannot synthesize a forward instruction. When forward is
 *    disabled, `instructionData` is an empty buffer and the forward-account
 *    slice is empty (any supplied builder is ignored).
 * 2. **Validation targets** — pre and post targets are resolved in parallel
 *    via {@link resolveValidationTargets}; each returns `[]` when the
 *    respective spec is not `ProgramCall`.
 * 3. **Assembly** — {@link assembleComposableRemainingAccounts} stamps the
 *    ADR-0016 order `[...preTargets, ...forwardAccounts, ...postTargets]`
 *    with `isSigner: false` on every entry (ADR-0008).
 *
 * Does **not** derive `face` — the caller resolves it via
 * {@link resolveDefaultForwardAmount} or a manual override. Does **not**
 * append the scheduler fee ATA — the SDK `executeComposable` facade owns
 * that (ADR-0016 amended). Callers needing per-step override (CLI flags)
 * should call the primitives directly.
 */
export async function buildComposableExecutionPayload(args: {
  connection: Connection;
  policy: ComposablePolicy;
  composablePolicyPda: PublicKey;
  programId: PublicKey;
  forwardBuilder?: ForwardBuilder;
  face: BN;
}): Promise<{ instructionData: Buffer; remainingAccounts: AccountMeta[] }> {
  const {
    connection,
    policy,
    composablePolicyPda,
    programId,
    forwardBuilder,
    face,
  } = args;

  const forwardOn = isForwardEnabled(policy);

  let instructionData: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let forwardAccounts: ForwardAccountMeta[] = [];

  if (forwardOn) {
    if (!forwardBuilder) {
      throw new Error(
        "buildComposableExecutionPayload: forward is enabled on the policy but no forwardBuilder was supplied"
      );
    }
    const built = await forwardBuilder.build({
      connection,
      policy,
      composablePolicyPda,
      face,
    });
    instructionData = built.instructionData;
    forwardAccounts = built.forwardAccounts;
  }

  const [preTargets, postTargets] = await Promise.all([
    resolveValidationTargets(
      connection,
      composablePolicyPda,
      policy.preValidation,
      programId,
      "pre"
    ),
    resolveValidationTargets(
      connection,
      composablePolicyPda,
      policy.postValidation,
      programId,
      "post"
    ),
  ]);

  const remainingAccounts = assembleComposableRemainingAccounts({
    preTargets,
    forwardAccounts,
    postTargets,
  });

  return { instructionData, remainingAccounts };
}
