import { PublicKey } from "@solana/web3.js";
import { type RecurringPayments } from "../../target/types/recurring_payments.js";
import { IdlAccounts, IdlTypes } from "@coral-xyz/anchor";

export interface PdaResult {
  address: PublicKey;
  bump: number;
}

// IDL-derived types
export type ProgramConfig = IdlAccounts<RecurringPayments>["programConfig"];
export type PaymentGateway = IdlAccounts<RecurringPayments>["paymentGateway"];
export type UserPayment = IdlAccounts<RecurringPayments>["userPayment"];
export type PaymentPolicy = IdlAccounts<RecurringPayments>["paymentPolicy"];

export type PolicyType = IdlTypes<RecurringPayments>["policyType"];
export type PaymentFrequency = IdlTypes<RecurringPayments>["paymentFrequency"];
export type PaymentStatus = IdlTypes<RecurringPayments>["paymentStatus"];
export type PaymentRecord = IdlTypes<RecurringPayments>["paymentRecord"];

// Account interfaces for instructions
export interface CreateUserPaymentAccounts {
  owner: PublicKey;
  tokenAccount: PublicKey;
  tokenMint: PublicKey;
  userPayment?: PublicKey;
  systemProgram?: PublicKey;
}

export interface CreatePaymentGatewayAccounts {
  authority: PublicKey;
  gateway: PublicKey;
  feeRecipient: PublicKey;
  systemProgram?: PublicKey;
}

export interface CreatePaymentPolicyAccounts {
  user: PublicKey;
  userPayment: PublicKey;
  recipient: PublicKey;
  tokenMint: PublicKey;
  gateway: PublicKey;
  paymentPolicy: PublicKey;
  systemProgram?: PublicKey;
}

export interface ExecutePaymentAccounts {
  gatewayAuthority: PublicKey;
  paymentsDelegate: PublicKey;
  paymentPolicy: PublicKey;
  userPayment: PublicKey;
  gateway: PublicKey;
  config: PublicKey;
  userTokenAccount: PublicKey;
  recipientTokenAccount: PublicKey;
  gatewayFeeAccount: PublicKey;
  protocolFeeAccount: PublicKey;
  tokenProgram?: PublicKey;
}
