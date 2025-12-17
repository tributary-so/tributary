import { PublicKey } from "@solana/web3.js";
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
}

export interface CreateSubscriptionResult {
  txId: string;
  instructions: any[];
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
  instructions: any[];
}

export interface UseCreateMilestoneReturn {
  createMilestone: (
    params: CreateMilestoneParams
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
  instructions: any[];
}

export interface UseCreatePayAsYouGoReturn {
  createPayAsYouGo: (
    params: CreatePayAsYouGoParams
  ) => Promise<CreatePayAsYouGoResult>;
  loading: boolean;
  error: string | null;
}

export interface UseCreateSubscriptionReturn {
  createSubscription: (
    params: CreateSubscriptionParams
  ) => Promise<CreateSubscriptionResult>;
  loading: boolean;
  error: string | null;
}
