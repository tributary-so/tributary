import { PublicKey, Transaction, VersionedTransaction, TransactionInstruction } from "@solana/web3.js";
import { type Tributary } from "../../../target/types/tributary.js";
import { IdlAccounts, IdlEvents, IdlTypes } from "@coral-xyz/anchor";
import BN from "bn.js";

export type IWallet = {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[],
  ): Promise<T[]>;
};

/**
 * Result of a Program Derived Address (PDA) derivation operation.
 * Contains the computed address and the bump seed used to ensure the address is not on the Ed25519 curve.
 */
export interface PdaResult {
  /** The derived PDA address */
  address: PublicKey;
  /** The bump seed (0-255) used in the derivation to find a valid PDA */
  bump: number;
}

/**
 * String representation of payment frequency options.
 * These correspond to the PaymentFrequency enum in the smart contract.
 */
export type PaymentFrequencyString =
  | "daily" // Payment occurs every day
  | "weekly" // Payment occurs every week
  | "monthly" // Payment occurs every month
  | "quarterly" // Payment occurs every quarter (3 months)
  | "semiAnnually" // Payment occurs twice per year (6 months)
  | "annually" // Payment occurs once per year
  | "custom"; // Custom frequency defined by seconds interval

// IDL-derived Accounts - These types are automatically generated from the Anchor IDL
// and represent the on-chain account structures for the Tributary program.

/**
 * Program configuration account structure.
 * Contains global protocol settings including emergency pause state and admin authority.
 */
export type ProgramConfig = IdlAccounts<Tributary>["programConfig"];

/**
 * Payment gateway account structure.
 * Represents a payment gateway that can execute recurring payments with configurable fees.
 */
export type PaymentGateway = IdlAccounts<Tributary>["paymentGateway"];

/**
 * User payment account structure.
 * Tracks a user's payment activity across multiple policies for a specific token mint.
 */
export type UserPayment = IdlAccounts<Tributary>["userPayment"];

/**
 * Payment policy account structure.
 * Defines the terms of a recurring payment including amount, frequency, and recipients.
 */
export type PaymentPolicy = IdlAccounts<Tributary>["paymentPolicy"];

/**
 * Composable policy account structure.
 * Defines a composable payment policy that can execute arbitrary instructions
 * alongside optional token forwards.
 */
export type ComposablePolicy = IdlAccounts<Tributary>["composablePolicy"];

// IDL-derived types - These types are automatically generated from the Anchor IDL
// and represent enums and structs used within the Tributary program.

/**
 * Type of payment policy (fixed amount vs percentage-based).
 * Determines how payment amounts are calculated and distributed.
 */
export type PolicyType = IdlTypes<Tributary>["policyType"];

/**
 * Payment frequency configuration.
 * Defines when payments should occur, either as predefined intervals or custom seconds.
 */
export type PaymentFrequency = IdlTypes<Tributary>["paymentFrequency"];

/**
 * Lifecycle status of a policy (PaymentPolicy or ComposablePolicy).
 * Unified on-chain enum: `active | paused | completed`.
 *
 * - `active`: payments can be executed.
 * - `paused`: owner-initiated pause (toggleable via `changePaymentPolicyStatus`
 *   / `changeComposablePolicyStatus`).
 * - `completed`: program-internal terminal state. For PaymentPolicy this is
 *   set by the program when a subscription hits `max_renewals` or all
 *   milestones are released; it is NOT accepted from owners in
 *   `change_payment_policy_status`. PayAsYouGo never auto-completes (no
 *   global max).
 *
 * Note: accounts that terminated before the unification keep their legacy
 * `paused` status; only new terminal transitions write `completed`.
 */
export type PolicyStatus = IdlTypes<Tributary>["policyStatus"];

/**
 * @deprecated Use {@link PolicyStatus}. Unified with `PolicyStatus` on-chain;
 * the separate `paymentStatus` IDL type has been removed. This alias is a
 * widening (it now also includes `completed`) so existing call sites passing
 * `{ active: {} }` / `{ paused: {} }` keep compiling. Removed next minor.
 */
export type PaymentStatus = PolicyStatus;

/**
 * Record of a completed payment.
 * Contains details about the payment execution including amount, timestamp, and fees.
 */
export type PaymentRecord = IdlTypes<Tributary>["paymentRecord"];

/**
 * Referral account structure.
 * Tracks a user's referral code, referrer chain, and earned rewards.
 */
export type ReferralAccount = IdlAccounts<Tributary>["referralAccount"];

// Composable policy types - These types will resolve once the IDL is regenerated
// after `anchor build`. They resolve to `any` until the IDL includes them.

/**
 * Forward configuration for composable policies.
 * Contains InstructionConstraint (program pinning + account pinning) + mints + flags.
 */
export type ForwardConfig = IdlTypes<Tributary>["forwardConfig"];

/**
 * Instruction constraint for composable policies.
 * Pins the forward program, its instruction selector, and indexed accounts
 * (`PinnedAccount { index, pubkey }`).
 */
export type InstructionConstraint =
  IdlTypes<Tributary>["instructionConstraint"];

/**
 * Validation spec for composable policies (pre or post forward).
 * Disabled | ProgramCall { program_id } | Inline (reserved).
 */
export type ValidationSpec = IdlTypes<Tributary>["validationSpec"];

/**
 * Byte range check for composable policy validation.
 * Specifies a range of bytes to validate in instruction data.
 */
export type ByteRangeCheck = IdlTypes<Tributary>["byteRangeCheck"];

/**
 * Validation PDA account structure.
 * Stores the Lighthouse assertion bytes for a composable policy plus the
 * owner-pinned target accounts (ADR-0016).
 *
 * Note: the on-chain program deserialises this via `AccountDeserialize`
 * inside `run_validation_cpi`. The IDL does NOT register it as a fetchable
 * `program.account.validationPda` target because it is never declared as a
 * typed `Account<'info, ValidationPda>` in any instruction context — it
 * enters as an `UncheckedAccount` (optional, absent when validation is
 * disabled). Off-chain consumers use {@link parseValidationPda} below.
 */
export interface ValidationPdaAccount {
  /** Canonical PDA bump. */
  bump: number;
  /** Arity of the active pinned-target slice (0/1/2). */
  numPinnedAccounts: number;
  /** Owner-declared Lighthouse target pubkeys, positional. Only
   *  `[0..numPinnedAccounts]` are meaningful; the rest are zero-padded. */
  pinnedAccounts: PublicKey[];
  /** Length of the active assertion-data prefix. */
  dataLen: number;
  /** Active assertion bytes (passed verbatim to Lighthouse at execute). */
  data: Buffer;
}

/**
 * Manual byte-layout constants for the on-chain `ValidationPda`. Kept in
 * sync with `programs/tributary/src/state/validation_pda.rs`.
 *
 * Layout: 8 (disc) + 1 (bump) + 1 (num_pinned) + 64 (pinned[2]) +
 *         2 (data_len) + data[1024]
 */
export const VALIDATION_PDA_LAYOUT = {
  DISCRIMINATOR: 8,
  BUMP: 1,
  NUM_PINNED: 1,
  PINNED: 32 * 2,
  DATA_LEN: 2,
  HEADER: 8 + 1 + 1 + 32 * 2 + 2, // = 76
} as const;

/**
 * Parse a full `ValidationPda` from a raw account buffer (e.g.
 * `connection.getAccountInfo(...).data`). Used by off-chain consumers
 * (scheduler, indexers, tests) that don't go through Anchor's typed
 * deserialiser.
 *
 * The on-chain program deserialises via `AccountDeserialize`; this is a
 * pure-TS mirror that keeps the layout in lockstep.
 */
export function parseValidationPda(data: Buffer): ValidationPdaAccount {
  const bump = data[8];
  const numPinnedAccounts = data[9];
  const pinnedAccounts: PublicKey[] = [];
  for (let i = 0; i < numPinnedAccounts; i++) {
    pinnedAccounts.push(
      new PublicKey(data.subarray(10 + i * 32, 10 + (i + 1) * 32)),
    );
  }
  const dataLen = data.readUInt16LE(VALIDATION_PDA_LAYOUT.HEADER - 2);
  return {
    bump,
    numPinnedAccounts,
    pinnedAccounts,
    dataLen,
    data: data.subarray(
      VALIDATION_PDA_LAYOUT.HEADER,
      VALIDATION_PDA_LAYOUT.HEADER + dataLen,
    ),
  };
}

/**
 * Read only the Lighthouse assertion-data slice from a raw `ValidationPda`
 * account buffer. Convenience for consumers (scheduler pre-filter) that
 * don't care about the pinned-set metadata.
 */
export function parseValidationPdaData(data: Buffer): Buffer {
  return parseValidationPda(data).data;
}

// ── Setup metadata types (ADR 0006) ────────────────────────────

export type SetupStepType =
  | "createAta"
  | "createUserPayment"
  | "createReferral"
  | "createPaymentPolicy"
  | "createComposablePolicy"
  | "approve"
  | "executePayment";

export interface ApproveStepData {
  delegateAddress: PublicKey;
  delegateLabel: "userPaymentPda";
  ownerTokenAccount: PublicKey;
  approvalAmount: BN;
  existingPolicies: Array<{
    publicKey: PublicKey;
    account: PaymentPolicy | ComposablePolicy;
  }>;
  newPolicy: {
    policyType: PolicyType;
    approvalContribution: BN;
  };
}

export type SetupStep = {
  instruction: TransactionInstruction;
} & (
  | { type: "createAta"; data: { owner: PublicKey; mint: PublicKey; ata: PublicKey } }
  | { type: "createUserPayment"; data: { owner: PublicKey; mint: PublicKey; pda: PublicKey } }
  | { type: "createReferral"; data: { gateway: PublicKey; code: string } }
  | { type: "createPaymentPolicy"; data: { policyType: PolicyType; recipient: PublicKey; gateway: PublicKey; policyPda: PublicKey } }
  | { type: "createComposablePolicy"; data: { policyType: PolicyType; recipient: PublicKey; gateway: PublicKey; forwardConfig: ForwardConfig; policyPda: PublicKey } }
  | { type: "approve"; data: ApproveStepData }
  | { type: "executePayment"; data: { policyPda: PublicKey } }
);

export interface SetupResult {
  instructions: TransactionInstruction[];
  steps: SetupStep[];
}


// ── IDL-derived event types ─────────────────────────────────────────
// Single source of truth for all on-chain event shapes.
// Consumers (API event indexer, dashboard, tests) import from here
// instead of hand-writing interfaces that drift from the IDL.
//
// Note: IdlEvents<Tributary> keys are camelCase (matching the IDL
// type-definition names). The export aliases use PascalCase + "Event"
// suffix for ergonomic imports.

export type PaymentRecordEvent = IdlEvents<Tributary>["paymentRecord"];
export type ComposableExecutedEvent = IdlEvents<Tributary>["composableExecuted"];
export type ComposablePolicyCreatedEvent = IdlEvents<Tributary>["composablePolicyCreated"];
export type ComposablePolicyDeletedEvent = IdlEvents<Tributary>["composablePolicyDeleted"];
export type ComposablePolicyStatusChangedEvent = IdlEvents<Tributary>["composablePolicyStatusChanged"];
export type PaymentPolicyCreatedEvent = IdlEvents<Tributary>["paymentPolicyCreated"];
export type PaymentPolicyDeletedEvent = IdlEvents<Tributary>["paymentPolicyDeleted"];
export type PaymentPolicyStatusChangedEvent = IdlEvents<Tributary>["paymentPolicyStatusChanged"];
export type PaymentGatewayCreatedEvent = IdlEvents<Tributary>["paymentGatewayCreated"];
export type PaymentGatewayDeletedEvent = IdlEvents<Tributary>["paymentGatewayDeleted"];
export type GatewaySignerChangedEvent = IdlEvents<Tributary>["gatewaySignerChanged"];
export type GatewayFeeRecipientChangedEvent = IdlEvents<Tributary>["gatewayFeeRecipientChanged"];
export type GatewayFeeBpsChangedEvent = IdlEvents<Tributary>["gatewayFeeBpsChanged"];
export type ProgramConfigCreatedEvent = IdlEvents<Tributary>["programConfigCreated"];
export type UserPaymentCreatedEvent = IdlEvents<Tributary>["userPaymentCreated"];
export type UserPaymentDeletedEvent = IdlEvents<Tributary>["userPaymentDeleted"];
export type ProgramAuthorityChangedEvent = IdlEvents<Tributary>["programAuthorityChanged"];
export type EmergencyPauseChangedEvent = IdlEvents<Tributary>["emergencyPauseChanged"];
export type ReferralRewardDistributedRecordEvent = IdlEvents<Tributary>["referralRewardDistributedRecord"];
