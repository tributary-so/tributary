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

export interface UseCreateSubscriptionReturn {
  createSubscription: (
    params: CreateSubscriptionParams
  ) => Promise<CreateSubscriptionResult>;
  loading: boolean;
  error: string | null;
}
