/**
 * API Types and Interfaces
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
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

export interface WebSocketMessage<T = any> {
  type: "payment_notification" | "error" | "ack";
  data: T;
  timestamp: number;
}

export interface PaymentNotificationData {
  trackingId: string;
  policyId: string;
  amount: number;
  tokenMint: string;
  recipient: string;
  timestamp: number;
  status: "executed" | "failed" | "pending";
  signature?: string;
}

export interface WebSocketSubscribeData {
  trackingId: string;
}

export interface WebSocketErrorData {
  code: string;
  message: string;
  details?: any;
}
