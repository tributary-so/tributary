import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export enum PaymentInterval {
  Daily = "daily",
  Weekly = "weekly",
  Monthly = "monthly",
  Quarterly = "quarterly",
  SemiAnnually = "semiAnnually",
  Annually = "annually",
  Custom = "custom",
}

export interface TokenIssuerConfig {
  apiBaseUrl: string;
  trackingId?: string;
}

export interface CreateSubscriptionParams {
  amount: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  interval: PaymentInterval;
  custom_interval?: number; // seconds
  maxRenewals?: number;
  memo?: string;
  startTime?: Date;
  approvalAmount?: BN;
  executeImmediately?: boolean;
  fetchToken?: boolean;
  tokenIssuerConfig?: TokenIssuerConfig;
}

export interface CreateSubscriptionResult {
  txId: string;
  instructions: TransactionInstruction[];
  token?: string;
}

export interface CreateMilestoneParams {
  milestoneAmounts: BN[];
  milestoneTimestamps: BN[];
  releaseCondition: number; // 0=time-based, 1=manual approval, 2=automatic
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  memo?: string;
  approvalAmount?: BN;
  executeImmediately?: boolean;
}

export interface CreateMilestoneResult {
  txId: string;
  instructions: TransactionInstruction[];
}

export interface UseCreateMilestoneReturn {
  createMilestone: (
    params: CreateMilestoneParams,
  ) => Promise<CreateMilestoneResult>;
  loading: boolean;
  error: string | null;
}

export interface CreatePayAsYouGoParams {
  maxAmountPerPeriod: BN;
  maxChunkAmount: BN;
  periodLengthSeconds: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  memo?: string;
  approvalAmount?: BN;
}

export interface CreatePayAsYouGoResult {
  txId: string;
  instructions: TransactionInstruction[];
}

export interface UseCreatePayAsYouGoReturn {
  createPayAsYouGo: (
    params: CreatePayAsYouGoParams,
  ) => Promise<CreatePayAsYouGoResult>;
  loading: boolean;
  error: string | null;
}

export interface UseCreateSubscriptionReturn {
  createSubscription: (
    params: CreateSubscriptionParams,
  ) => Promise<CreateSubscriptionResult>;
  loading: boolean;
  error: string | null;
}

// ──────────────────────────────────────────────────────────────────────────
// OneTime (ADR-0019) — single-shot fixed-amount policy
// ──────────────────────────────────────────────────────────────────────────

export interface CreateOneTimeParams {
  amount: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  memo?: string;
  /** Earliest execution timestamp (seconds). Omit / null / <=0 = immediate. */
  dueDate?: BN | null;
  /** Hard expiry (seconds). Omit / null = never expires. */
  expiryDate?: BN | null;
  approvalAmount?: BN;
}

export interface CreateOneTimeResult {
  txId: string;
  instructions: TransactionInstruction[];
}

export interface UseCreateOneTimeReturn {
  createOneTime: (params: CreateOneTimeParams) => Promise<CreateOneTimeResult>;
  loading: boolean;
  error: string | null;
}

// ──────────────────────────────────────────────────────────────────────────
// UpTo (ADR-0020) — single-use variable-amount authorization
// ──────────────────────────────────────────────────────────────────────────

export interface CreateUpToParams {
  /** Ceiling on the settlement amount (smallest token units). */
  maxAmount: BN;
  token: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  /** Mandatory hard expiry (seconds). MUST be > 0 and > validAfter. */
  deadline: BN;
  /** Earliest settlement (seconds). Omit / null / <=0 = immediate. */
  validAfter?: BN | null;
  memo?: string;
  approvalAmount?: BN;
}

export interface CreateUpToResult {
  txId: string;
  instructions: TransactionInstruction[];
}

export interface UseCreateUpToReturn {
  createUpTo: (params: CreateUpToParams) => Promise<CreateUpToResult>;
  loading: boolean;
  error: string | null;
}
