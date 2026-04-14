export type PublicKey = string;

export type PaymentStatus = "Active" | "Paused";

export type PaymentFrequency =
  | { Daily: null }
  | { Weekly: null }
  | { Monthly: null }
  | { Quarterly: null }
  | { SemiAnnually: null }
  | { Annually: null }
  | { Custom: number };

export interface SubscriptionPolicy {
  amount: number;
  auto_renew: boolean;
  max_renewals: number | null;
  payment_frequency: PaymentFrequency;
  next_payment_due: number;
}

export interface MilestonePolicy {
  milestone_amounts: [number, number, number, number];
  milestone_timestamps: [number, number, number, number];
  current_milestone: number;
  release_condition: number;
  total_milestones: number;
  escrow_amount: number;
}

export interface PayAsYouGoPolicy {
  max_amount_per_period: number;
  max_chunk_amount: number;
  period_length_seconds: number;
  current_period_start: number;
  current_period_total: number;
}

export type PolicyType =
  | { Subscription: SubscriptionPolicy }
  | { Milestone: MilestonePolicy }
  | { PayAsYouGo: PayAsYouGoPolicy };

export interface ReferralReward {
  pubkey: PublicKey;
  reward: number;
}

export interface TributaryGatewayFeeBpsChanged {
  gateway: PublicKey;
  old_fee_bps: number;
  new_fee_bps: number;
}

export interface TributaryGatewayFeeRecipientChanged {
  gateway: PublicKey;
  old_fee_recipient: PublicKey;
  new_fee_recipient: PublicKey;
}

export interface TributaryGatewaySignerChanged {
  gateway: PublicKey;
  old_signer: PublicKey;
  new_signer: PublicKey;
}

export interface TributaryPaymentGatewayCreated {
  authority: PublicKey;
  fee_recipient: PublicKey;
  gateway_fee_bps: number;
  name: number[];
  url: number[];
}

export interface TributaryPaymentGatewayDeleted {
  gateway: PublicKey;
  authority: PublicKey;
  name: number[];
}

export interface TributaryPaymentPolicyCreated {
  user_payment: PublicKey;
  recipient: PublicKey;
  gateway: PublicKey;
  policy_id: number;
  policy_type: PolicyType;
  memo: number[];
  created_policies_count: number;
}

export interface TributaryPaymentPolicyDeleted {
  payment_policy: PublicKey;
  owner: PublicKey;
  policy_id: number;
}

export interface TributaryPaymentPolicyStatusChanged {
  payment_policy: PublicKey;
  old_status: PaymentStatus;
  new_status: PaymentStatus;
}

export interface TributaryPaymentRecord {
  payment_policy: PublicKey;
  gateway: PublicKey;
  amount: number;
  timestamp: number;
  memo: number[];
  record_id: number;
  payer?: PublicKey;
  recipient?: PublicKey;
}

export interface TributaryProgramConfigCreated {
  admin: PublicKey;
  fee_recipient: PublicKey;
  protocol_fee_bps: number;
  max_policies_per_user: number;
}

export interface TributaryReferralRewardDistributedRecord {
  payment_policy: PublicKey;
  gateway: PublicKey;
  payment_amount: number;
  timestamp: number;
  rewards: (ReferralReward | null)[];
}

export interface TributaryUserPaymentCreated {
  owner: PublicKey;
  token_account: PublicKey;
  token_mint: PublicKey;
}

export type TributaryEventName =
  | "tributary_gateway_fee_bps_changed"
  | "tributary_gateway_fee_recipient_changed"
  | "tributary_gateway_signer_changed"
  | "tributary_payment_gateway_created"
  | "tributary_payment_gateway_deleted"
  | "tributary_payment_policy_created"
  | "tributary_payment_policy_deleted"
  | "tributary_payment_policy_status_changed"
  | "tributary_payment_record"
  | "tributary_program_config_created"
  | "tributary_referral_reward_distributed_record"
  | "tributary_user_payment_created";

export type TributaryEventDataMap = {
  tributary_gateway_fee_bps_changed: TributaryGatewayFeeBpsChanged;
  tributary_gateway_fee_recipient_changed: TributaryGatewayFeeRecipientChanged;
  tributary_gateway_signer_changed: TributaryGatewaySignerChanged;
  tributary_payment_gateway_created: TributaryPaymentGatewayCreated;
  tributary_payment_gateway_deleted: TributaryPaymentGatewayDeleted;
  tributary_payment_policy_created: TributaryPaymentPolicyCreated;
  tributary_payment_policy_deleted: TributaryPaymentPolicyDeleted;
  tributary_payment_policy_status_changed: TributaryPaymentPolicyStatusChanged;
  tributary_payment_record: TributaryPaymentRecord;
  tributary_program_config_created: TributaryProgramConfigCreated;
  tributary_referral_reward_distributed_record: TributaryReferralRewardDistributedRecord;
  tributary_user_payment_created: TributaryUserPaymentCreated;
};

export function isTributaryEvent(
  eventName: string
): eventName is TributaryEventName {
  return eventName.startsWith("tributary_");
}

export function bytesToString(bytes: number[]): string {
  return String.fromCharCode(...bytes.filter((b) => b !== 0));
}

export function parsePaymentFrequency(data: unknown): PaymentFrequency {
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if ("Daily" in obj) return { Daily: null };
    if ("Weekly" in obj) return { Weekly: null };
    if ("Monthly" in obj) return { Monthly: null };
    if ("Quarterly" in obj) return { Quarterly: null };
    if ("SemiAnnually" in obj) return { SemiAnnually: null };
    if ("Annually" in obj) return { Annually: null };
    if ("Custom" in obj) return { Custom: obj.Custom as number };
  }
  return { Daily: null };
}

export function parsePaymentStatus(data: unknown): PaymentStatus {
  if (data === "Active" || data === "Paused") return data;
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if ("Active" in obj) return "Active";
    if ("Paused" in obj) return "Paused";
  }
  return "Active";
}

export function parsePolicyType(data: unknown): PolicyType {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid policy type data");
  }
  const obj = data as Record<string, unknown>;
  if ("Subscription" in obj) {
    const sub = obj.Subscription as Record<string, unknown>;
    return {
      Subscription: {
        amount: sub.amount as number,
        auto_renew: sub.auto_renew as boolean,
        max_renewals: sub.max_renewals as number | null,
        payment_frequency: parsePaymentFrequency(sub.payment_frequency),
        next_payment_due: sub.next_payment_due as number,
      },
    };
  }
  if ("Milestone" in obj) {
    const mile = obj.Milestone as Record<string, unknown>;
    return {
      Milestone: {
        milestone_amounts: mile.milestone_amounts as [
          number,
          number,
          number,
          number
        ],
        milestone_timestamps: mile.milestone_timestamps as [
          number,
          number,
          number,
          number
        ],
        current_milestone: mile.current_milestone as number,
        release_condition: mile.release_condition as number,
        total_milestones: mile.total_milestones as number,
        escrow_amount: mile.escrow_amount as number,
      },
    };
  }
  if ("PayAsYouGo" in obj) {
    const payg = obj.PayAsYouGo as Record<string, unknown>;
    return {
      PayAsYouGo: {
        max_amount_per_period: payg.max_amount_per_period as number,
        max_chunk_amount: payg.max_chunk_amount as number,
        period_length_seconds: payg.period_length_seconds as number,
        current_period_start: payg.current_period_start as number,
        current_period_total: payg.current_period_total as number,
      },
    };
  }
  throw new Error("Unknown policy type");
}

export function parseReferralReward(data: unknown): ReferralReward | null {
  if (data === null || data === undefined) return null;
  if (typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  return {
    pubkey: obj.pubkey as PublicKey,
    reward: obj.reward as number,
  };
}
