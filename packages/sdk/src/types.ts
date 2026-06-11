import { PublicKey } from "@solana/web3.js";
import { type Tributary } from "../../../target/types/tributary.js";
import { IdlAccounts, IdlTypes } from "@coral-xyz/anchor";

export type IWallet = {
  publicKey: PublicKey;
  signTransaction<T>(tx: T): Promise<T>;
  signAllTransactions<T>(txs: T[]): Promise<T[]>;
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
 * Status of a payment execution.
 * Tracks whether payments were successful, failed, or are pending.
 */
export type PaymentStatus = IdlTypes<Tributary>["paymentStatus"];

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
 * Schedule type for composable policies.
 * Defines when and how composable policy executions occur.
 */
export type ScheduleType = IdlTypes<Tributary>["scheduleType"];

/**
 * Forward configuration for composable policies.
 * Specifies token forwarding behavior during composable execution.
 */
export type ForwardConfig = IdlTypes<Tributary>["forwardConfig"];

/**
 * Validation configuration for composable policies.
 * Defines validation rules applied during composable execution.
 */
export type ValidationConfig = IdlTypes<Tributary>["validationConfig"];

/**
 * Byte range check for composable policy validation.
 * Specifies a range of bytes to validate in instruction data.
 */
export type ByteRangeCheck = IdlTypes<Tributary>["byteRangeCheck"];

/**
 * Status of a composable policy.
 * Tracks whether a composable policy is active, paused, or completed.
 */
export type PolicyStatus = IdlTypes<Tributary>["policyStatus"];

/**
 * Validation PDA account structure.
 * Stores assertion data for composable policies with external validation.
 * Not IDL-derived — manually defined since ValidationPda is initialized via invoke_signed.
 */
export interface ValidationPdaAccount {
  /** Length of stored validation data */
  dataLen: number;
  /** Raw validation data (up to 1024 bytes) */
  data: Buffer;
}

/**
 * Parse a ValidationPda account from raw on-chain data.
 * Layout: 8 (Anchor discriminator) + 2 (data_len u16) + data
 */
export function parseValidationPda(data: Buffer): ValidationPdaAccount {
  const dataLen = data.readUInt16LE(8);
  return {
    dataLen,
    data: data.subarray(10, 10 + dataLen),
  };
}
