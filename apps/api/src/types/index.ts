/**
 * API Types and Interfaces
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface SubscriptionStatusRequest {
  trackingId: string;
  userPublicKey?: string;
  gatewayPublicKey?: string;
  tokenMint?: string;
}

export interface SubscriptionStatusResponse {
  subscriptionCreated: boolean;
  initialPaymentExecuted: boolean;
  paymentCount: number;
  nextPaymentDue?: number;
  status: "pending" | "created" | "active" | "failed";
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  uptime: number;
}

export interface SkillParams {
  tokenMint: string;
  recipient: string;
  amount: number;
  decimals: number;
  paymentFrequency: string;
  autoRenew: boolean;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  trackingId?: string;
  maxRenewals?: number | null;
  startTime?: string | number;
}
