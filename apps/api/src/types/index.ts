/**
 * API Types and Interfaces
 */

import { PublicKey } from "@solana/web3.js";

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
  amount: number;
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

export interface OneTimePaymentClaim {
  signature: string;
  slot: number;
  blockTime: number;
  amount: string;
  tokenMint: string;
  payer: string;
  recipient: string;
  memo: string | null;
  policyAddress?: string;
  gateway?: string;
  recordId?: number;
}


export interface OneTimePaymentDetails {
  trackingId: string;
  signature: string;
  slot: number;
  timestamp: Date;
  paymentPolicy: string;
  gateway: string;
  amount: number;
  memo: string;
  recordId: number;
}

export interface SigningKeyRecord {
  kid: string;
  privateKey: string;
  publicJwk: Record<string, unknown>;
  algorithm: string;
  isCurrent: boolean;
  createdAt: Date | null;
  expiresAt: Date | null;
  rotatedAt: Date | null;
}

export interface JwkKey {
  kty: string;
  crv: string;
  kid: string;
  alg: string;
  use: string;
  x: string;
  y: string;
}

export interface DecodedPaymentRecord {
  payment_policy: PublicKey;
  gateway: PublicKey;
  amount: bigint;
  timestamp: bigint;
  memo: number[];
  record_id: number;
  payer: PublicKey;
  recipient: PublicKey;
}

