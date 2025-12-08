import { PublicKey } from "@solana/web3.js";
import { type RecurringPayments } from "../../target/types/recurring_payments.js";
import { IdlAccounts, IdlTypes } from "@coral-xyz/anchor";

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
export type ProgramConfig = IdlAccounts<RecurringPayments>["programConfig"];

/**
 * Payment gateway account structure.
 * Represents a payment gateway that can execute recurring payments with configurable fees.
 */
export type PaymentGateway = IdlAccounts<RecurringPayments>["paymentGateway"];

/**
 * User payment account structure.
 * Tracks a user's payment activity across multiple policies for a specific token mint.
 */
export type UserPayment = IdlAccounts<RecurringPayments>["userPayment"];

/**
 * Payment policy account structure.
 * Defines the terms of a recurring payment including amount, frequency, and recipients.
 */
export type PaymentPolicy = IdlAccounts<RecurringPayments>["paymentPolicy"];

// IDL-derived types - These types are automatically generated from the Anchor IDL
// and represent enums and structs used within the Tributary program.

/**
 * Type of payment policy (fixed amount vs percentage-based).
 * Determines how payment amounts are calculated and distributed.
 */
export type PolicyType = IdlTypes<RecurringPayments>["policyType"];

/**
 * Payment frequency configuration.
 * Defines when payments should occur, either as predefined intervals or custom seconds.
 */
export type PaymentFrequency = IdlTypes<RecurringPayments>["paymentFrequency"];

/**
 * Status of a payment execution.
 * Tracks whether payments were successful, failed, or are pending.
 */
export type PaymentStatus = IdlTypes<RecurringPayments>["paymentStatus"];

/**
 * Record of a completed payment.
 * Contains details about the payment execution including amount, timestamp, and fees.
 */
export type PaymentRecord = IdlTypes<RecurringPayments>["paymentRecord"];
