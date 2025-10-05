import { PublicKey } from "@solana/web3.js";
import { type RecurringPayments } from "../../target/types/recurring_payments.js";
import { IdlAccounts, IdlTypes } from "@coral-xyz/anchor";

export interface PdaResult {
  address: PublicKey;
  bump: number;
}

// IDL-derived Accounts
export type ProgramConfig = IdlAccounts<RecurringPayments>["programConfig"];
export type PaymentGateway = IdlAccounts<RecurringPayments>["paymentGateway"];
export type UserPayment = IdlAccounts<RecurringPayments>["userPayment"];
export type PaymentPolicy = IdlAccounts<RecurringPayments>["paymentPolicy"];

// IDL-derived types
export type PolicyType = IdlTypes<RecurringPayments>["policyType"];
export type PaymentFrequency = IdlTypes<RecurringPayments>["paymentFrequency"];
export type PaymentStatus = IdlTypes<RecurringPayments>["paymentStatus"];
export type PaymentRecord = IdlTypes<RecurringPayments>["paymentRecord"];
