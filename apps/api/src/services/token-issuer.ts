import { SignJWT } from "jose";
import { randomUUID } from "crypto";
import { getCurrentSigningKey, importPrivateKey } from "./jwks";
import { getSubscriptionDetails } from "./subscription";
import { verifyTransactionPayment } from "./tx-verifier";
import { encodeMemo } from "@tributary-so/sdk";
import { PolicyLookupOptions } from "@tributary-so/payments";
import { getDb } from "../db";
import { events } from "../db/schema";
import { OneTimePaymentClaim } from "../types";
import { eq, desc, and, sql } from "drizzle-orm";
import { decodeMemo } from "@tributary-so/sdk";
import {
  type PolicyClaim,
  type PolicyVariant,
  type PaymentRecord,
} from "@tributary-so/payments";

const JWT_ISSUER = process.env.JWT_ISSUER || "https://api.tributary.so";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "tributary-checkout";
const JWT_MAX_TTL_DAYS = parseInt(process.env.JWT_MAX_TTL_DAYS || "30", 10);
const JWT_EXPIRY_BUFFER_MINUTES = parseInt(
  process.env.JWT_EXPIRY_BUFFER_MINUTES || "10",
  10
);
// Default JWT lifetime (seconds) when a policy exposes no time-derived field
// (e.g. PayAsYouGo just installed, OneTime with no expiry). Ponytail: 1h is a
// sensible upper bound for an authorization-only attestation; merchants that
// want longer-lived tokens configure JWT_MAX_TTL_DAYS for the absolute cap.
const JWT_DEFAULT_LIFETIME_SECONDS = parseInt(
  process.env.JWT_DEFAULT_LIFETIME_SECONDS || "3600",
  10
);

export interface TokenIssueRequest {
  walletPublicKey?: string;
  tokenMint?: string;
  policyAddress?: string;
  recipient?: string;
  transactionSignature?: string;
  trackingId?: string;
}

export interface PaymentRecordData {
  payment_policy: string;
  gateway: string;
  amount: number;
  timestamp: number;
  memo: number[];
  record_id: number;
  payer: string;
  recipient: string;
}

export interface TokenResponse {
  /** JWT string — consumers MUST validate exp from the decoded token, not from expiresAt */
  token: string;
  /** Convenience timestamp — do NOT use as sole expiry check */
  expiresAt: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers: BN / field coercion
// ──────────────────────────────────────────────────────────────────────────

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  // BN-like
  const maybe = (v as { toNumber?: () => number }).toNumber;
  if (typeof maybe === "function") return maybe.call(v);
  return Number(v);
}

function toString(v: unknown): string {
  if (v == null) return "0";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  // BN-like
  const maybe = (v as { toString?: () => string }).toString;
  if (typeof maybe === "function") return maybe.call(v);
  return String(v);
}

function toNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  return toNumber(v);
}

/**
 * Anchor Borsh `Option<i64>` decodes as `{ some: BN }` or `{ none: {} }`.
 * Returns null for both `none` and `some(<=0)` (sentinel for "immediate"/"unset").
 */
function optionToNullableTs(v: unknown): number | null {
  if (v == null || typeof v !== "object") return null;
  if ("none" in v) return null;
  if ("some" in v) {
    const n = toNumber((v as { some: unknown }).some);
    return n > 0 ? n : null;
  }
  const n = toNumber(v);
  return n > 0 ? n : null;
}

function getFrequencyLabel(freq: any): string {
  if (!freq) return "monthly";
  if (typeof freq === "object") {
    const key = Object.keys(freq)[0];
    const map: Record<string, string> = {
      Daily: "daily",
      Weekly: "weekly",
      Biweekly: "biweekly",
      Monthly: "monthly",
      Quarterly: "quarterly",
      Yearly: "yearly",
    };
    if (key === "Custom") {
      const n = toNumber(freq[key]);
      return `custom:${n}`;
    }
    return map[key] ?? "monthly";
  }
  return String(freq);
}

// ──────────────────────────────────────────────────────────────────────────
// Per-variant PolicyClaim builders
// ──────────────────────────────────────────────────────────────────────────

function buildSubscriptionClaim(
  p: any
): Extract<PolicyClaim, { variant: "subscription" }> {
  const sub = p.policyType.subscription;
  const nextPaymentDue = sub.nextPaymentDue
    ? toNullableNumber(sub.nextPaymentDue)
    : null;
  const maxRenewals =
    sub.maxRenewals != null ? toNumber(sub.maxRenewals) : null;
  const totalPayments = typeof p.totalPaid === "number" ? p.totalPaid : 0;
  const createdAt = toNumber(p.createdAt);

  let status: "paid" | "overdue" | "completed";
  if (maxRenewals !== null && totalPayments >= maxRenewals) {
    status = "completed";
  } else if (
    nextPaymentDue !== null &&
    nextPaymentDue > 0 &&
    nextPaymentDue < Math.floor(Date.now() / 1000)
  ) {
    status = "overdue";
  } else {
    status = "paid";
  }

  return {
    variant: "subscription",
    policyAddress: p.policyAccount?.toString() ?? "",
    policyId: p.policyId,
    recipient: p.recipient?.toString() ?? "",
    gateway: p.gateway?.toString() ?? "",
    memo: p.memo,
    createdAt,
    amount: toString(sub.amount),
    paymentFrequency: getFrequencyLabel(sub.paymentFrequency),
    totalPayments,
    nextPaymentDue,
    status,
    autoRenew: sub.autoRenew ?? true,
    maxRenewals,
  };
}

function buildMilestoneClaim(
  p: any
): Extract<PolicyClaim, { variant: "milestone" }> {
  const ms = p.policyType.milestone;
  const totalMilestones = ms.totalMilestones ?? 0;
  const currentMilestone = ms.currentMilestone ?? 0;
  const escrowAmount = toString(ms.escrowAmount);
  const totalPaid = typeof p.totalPaid === "number" ? p.totalPaid : 0;
  const escrowRemaining = Math.max(0, toNumber(ms.escrowAmount) - totalPaid);
  const milestoneAmounts = (ms.milestoneAmounts ?? [])
    .slice(0, totalMilestones)
    .map(toString);
  const milestoneTimestamps = (ms.milestoneTimestamps ?? [])
    .slice(0, totalMilestones)
    .map((t: unknown) => toNumber(t));

  const status: "active" | "completed" =
    totalMilestones > 0 && currentMilestone >= totalMilestones
      ? "completed"
      : "active";

  return {
    variant: "milestone",
    policyAddress: p.policyAccount?.toString() ?? "",
    policyId: p.policyId,
    recipient: p.recipient?.toString() ?? "",
    gateway: p.gateway?.toString() ?? "",
    memo: p.memo,
    createdAt: toNumber(p.createdAt),
    milestoneAmounts,
    milestoneTimestamps,
    currentMilestone,
    totalMilestones,
    escrowAmount,
    escrowRemaining: String(escrowRemaining),
    releaseCondition: ms.releaseCondition ?? 0,
    status,
  };
}

function buildPayAsYouGoClaim(
  p: any
): Extract<PolicyClaim, { variant: "payAsYouGo" }> {
  const payg = p.policyType.payAsYouGo;
  const maxAmountPerPeriod = toNumber(payg.maxAmountPerPeriod);
  const currentPeriodTotal = toNumber(payg.currentPeriodTotal);
  const periodLengthSeconds = toNumber(payg.periodLengthSeconds);
  const currentPeriodStart = toNumber(payg.currentPeriodStart);
  const capRemainingThisPeriod = Math.max(
    0,
    maxAmountPerPeriod - currentPeriodTotal
  );
  const periodResetsAt = currentPeriodStart + periodLengthSeconds;

  const status: "active" | "exhausted" =
    maxAmountPerPeriod > 0 && capRemainingThisPeriod === 0
      ? "exhausted"
      : "active";

  return {
    variant: "payAsYouGo",
    policyAddress: p.policyAccount?.toString() ?? "",
    policyId: p.policyId,
    recipient: p.recipient?.toString() ?? "",
    gateway: p.gateway?.toString() ?? "",
    memo: p.memo,
    createdAt: toNumber(p.createdAt),
    maxAmountPerPeriod: toString(payg.maxAmountPerPeriod),
    maxChunkAmount: toString(payg.maxChunkAmount),
    periodLengthSeconds,
    currentPeriodStart,
    currentPeriodTotal: toString(payg.currentPeriodTotal),
    capRemainingThisPeriod: String(capRemainingThisPeriod),
    periodResetsAt,
    status,
  };
}

function buildOneTimeClaim(
  p: any
): Extract<PolicyClaim, { variant: "oneTime" }> {
  const ot = p.policyType.oneTime;
  const dueDateRaw = toNumber(ot.dueDate);
  const dueDate = dueDateRaw > 0 ? dueDateRaw : null;
  const expiryDate = optionToNullableTs(ot.expiryDate);
  const nowSec = Math.floor(Date.now() / 1000);

  // policy.status is the on-chain PolicyStatus enum ({active:{}} | {paused:{}}
  // | {completed:{}}). `completed` is terminal and means the OneTime has fired.
  const policyStatusCompleted =
    p.status != null && typeof p.status === "object" && "completed" in p.status;

  let status: "pending" | "completed" | "expired";
  if (policyStatusCompleted) {
    status = "completed";
  } else if (expiryDate !== null && expiryDate < nowSec) {
    status = "expired";
  } else {
    status = "pending";
  }

  return {
    variant: "oneTime",
    policyAddress: p.policyAccount?.toString() ?? "",
    policyId: p.policyId,
    recipient: p.recipient?.toString() ?? "",
    gateway: p.gateway?.toString() ?? "",
    memo: p.memo,
    createdAt: toNumber(p.createdAt),
    amount: toString(ot.amount),
    dueDate,
    expiryDate,
    status,
  };
}

function buildUpToClaim(p: any): Extract<PolicyClaim, { variant: "upTo" }> {
  const ut = p.policyType.upTo;
  const validAfterRaw = toNumber(ut.validAfter);
  const validAfter = validAfterRaw > 0 ? validAfterRaw : null;
  const deadline = toNumber(ut.deadline);
  const nowSec = Math.floor(Date.now() / 1000);

  const policyStatusCompleted =
    p.status != null && typeof p.status === "object" && "completed" in p.status;

  let status: "pending" | "settled" | "expired";
  if (policyStatusCompleted) {
    status = "settled";
  } else if (deadline > 0 && deadline < nowSec) {
    status = "expired";
  } else {
    status = "pending";
  }

  return {
    variant: "upTo",
    policyAddress: p.policyAccount?.toString() ?? "",
    policyId: p.policyId,
    recipient: p.recipient?.toString() ?? "",
    gateway: p.gateway?.toString() ?? "",
    memo: p.memo,
    createdAt: toNumber(p.createdAt),
    maxAmount: toString(ut.maxAmount),
    validAfter,
    deadline,
    status,
  };
}

/**
 * Map stripped on-chain policies to the JWT's discriminated `PolicyClaim[]`.
 * No variant filter — all 5 variants are eligible. An "authorization-only"
 * claim (no PaymentRecord yet) is a valid output; the merchant decides
 * whether to require payment proof on top.
 *
 * Exported for unit tests; not part of the public API surface.
 */
export function buildPolicyClaims(policies: any[]): PolicyClaim[] {
  const out: PolicyClaim[] = [];
  for (const p of policies) {
    if (!p.policyType) continue;
    if ("subscription" in p.policyType && p.policyType.subscription) {
      out.push(buildSubscriptionClaim(p));
    } else if ("milestone" in p.policyType && p.policyType.milestone) {
      out.push(buildMilestoneClaim(p));
    } else if ("payAsYouGo" in p.policyType && p.policyType.payAsYouGo) {
      out.push(buildPayAsYouGoClaim(p));
    } else if ("oneTime" in p.policyType && p.policyType.oneTime) {
      out.push(buildOneTimeClaim(p));
    } else if ("upTo" in p.policyType && p.policyType.upTo) {
      out.push(buildUpToClaim(p));
    }
  }
  return out;
}

/**
 * Derive JWT expiration from a per-variant time field. Exported for unit
 * tests; not part of the public API surface.
 */
export function computePolicyExpiration(claims: PolicyClaim[]): number {
  const nowSec = Math.floor(Date.now() / 1000);
  const maxTtl = JWT_MAX_TTL_DAYS * 24 * 60 * 60;
  const bufferSec = JWT_EXPIRY_BUFFER_MINUTES * 60;

  if (claims.length === 0) {
    return Math.min(nowSec + JWT_DEFAULT_LIFETIME_SECONDS, nowSec + maxTtl);
  }

  const expCandidates: number[] = [];
  for (const c of claims) {
    switch (c.variant) {
      case "subscription":
        if (c.nextPaymentDue !== null && c.nextPaymentDue > 0) {
          expCandidates.push(c.nextPaymentDue + bufferSec);
        }
        break;
      case "milestone": {
        const last = c.milestoneTimestamps[c.milestoneTimestamps.length - 1];
        if (last && last > 0) expCandidates.push(last + bufferSec);
        break;
      }
      case "payAsYouGo":
        if (c.periodResetsAt > 0)
          expCandidates.push(c.periodResetsAt + bufferSec);
        break;
      case "oneTime":
        if (c.expiryDate !== null && c.expiryDate > 0) {
          expCandidates.push(c.expiryDate + bufferSec);
        }
        break;
      case "upTo":
        // UpTo deadline is a hard wall; don't soften with buffer beyond maxTtl.
        if (c.deadline > 0) expCandidates.push(c.deadline);
        break;
    }
  }

  if (expCandidates.length === 0) {
    return Math.min(nowSec + JWT_DEFAULT_LIFETIME_SECONDS, nowSec + maxTtl);
  }

  const earliest = Math.min(...expCandidates);
  return Math.min(earliest, nowSec + maxTtl);
}

async function getLastPayments(options: {
  walletPublicKey?: string;
  recipient?: string;
  policyAddresses?: string[];
  transactionSignature?: string;
  tokenMint?: string;
  limit?: number;
  trackingId?: string;
}): Promise<PaymentRecord[]> {
  const db = getDb();
  const conditions = [eq(events.eventName, "tributary_PaymentRecord")];

  if (options.walletPublicKey) {
    conditions.push(sql`${events.data}->>'payer' = ${options.walletPublicKey}`);
  }

  if (options?.recipient) {
    conditions.push(sql`${events.data}->>'recipient' = ${options.recipient}`);
  }

  if (options?.trackingId) {
    const memoArray = encodeMemo(options.trackingId); // Assuming this returns number[]
    const jsonArrayString = JSON.stringify(memoArray);

    // Exact match of the entire array (order matters)
    conditions.push(sql`${events.data}->'memo' = ${jsonArrayString}::jsonb`);
  }

  if (options?.transactionSignature) {
    conditions.push(eq(events.signature, options.transactionSignature));
  }

  if (options?.policyAddresses && options.policyAddresses.length > 0) {
    conditions.push(
      sql`${events.data}->>'payment_policy' = ANY(ARRAY[${sql.join(
        options.policyAddresses.map((addr) => sql`${addr}`),
        sql`, `
      )}])`
    );
  }

  const results = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.timestamp))
    .limit(options?.limit ?? 3);

  return results
    .filter((event) => {
      const data = event.data as PaymentRecordData;
      const payer = data.payer;
      return !options.walletPublicKey || payer === options.walletPublicKey;
    })
    .map((event) => {
      const data = event.data as any;
      return {
        signature: event.signature,
        slot: event.slot,
        timestamp: Math.floor(new Date(event.timestamp).getTime() / 1000),
        policyAddress: data.payment_policy,
        amount: String(data.amount),
        tokenMint: data.tokenMint,
        payer: data.payer,
        recipient: data.recipient,
        gateway: data.gateway,
        memo: decodeMemo(data.memo),
        recordId: data.record_id,
      };
    });
}

export async function issueToken(
  request: TokenIssueRequest
): Promise<TokenResponse> {
  const options: PolicyLookupOptions = {};
  if (request.walletPublicKey) {
    options.walletPublicKey = request.walletPublicKey;
  }
  if (request.recipient) {
    options.recipient = request.recipient;
  }
  if (request.tokenMint) {
    options.tokenMint = request.tokenMint;
  }
  if (request.trackingId) {
    options.trackingId = request.trackingId;
  }

  let oneTimePayment: OneTimePaymentClaim | null = null;
  let txPolicyAddress: string | null = null;

  if (request.transactionSignature) {
    oneTimePayment = await verifyTransactionPayment(
      request.transactionSignature,
      request.walletPublicKey
    );
    txPolicyAddress = oneTimePayment.policyAddress ?? null;
  }

  let allPolicies = await getSubscriptionDetails(options);
  let policies: PolicyClaim[] = [];

  if (request.transactionSignature) {
    const matching = allPolicies.filter(
      (p: any) => p.policyAccount?.toString() === txPolicyAddress
    );
    policies = buildPolicyClaims(matching);
  } else {
    policies = buildPolicyClaims(allPolicies);
  }

  let lastPayments: PaymentRecord[] = [];

  if (request.transactionSignature || request.trackingId) {
    let dbPayments = await getLastPayments(options);

    if (dbPayments.length === 0 && oneTimePayment) {
      lastPayments = [
        {
          signature: oneTimePayment.signature,
          slot: oneTimePayment.slot,
          timestamp: oneTimePayment.blockTime,
          policyAddress: txPolicyAddress ?? "11111111111111111111111111111111",
          amount: oneTimePayment.amount,
          tokenMint: oneTimePayment.tokenMint,
          payer: oneTimePayment.payer,
          recipient: oneTimePayment.recipient,
          gateway: (oneTimePayment as any).gateway ?? "",
          memo: oneTimePayment.memo ?? "",
          recordId: (oneTimePayment as any).recordId ?? 0,
        },
      ];
    } else {
      lastPayments = dbPayments;
    }
  } else if (policies.length > 0) {
    const policyAddresses = policies.map((s) => s.policyAddress);
    lastPayments = await getLastPayments({
      walletPublicKey: request.walletPublicKey,
      policyAddresses,
      recipient: request.recipient,
      tokenMint: request.tokenMint,
    });
  }

  if (policies.length === 0 && lastPayments.length === 0) {
    throw new Error("No active subscription policies or payments found");
  }

  const signingKey = await getCurrentSigningKey();
  if (!signingKey) {
    throw new Error("No signing key available");
  }

  const privateKey = await importPrivateKey(signingKey.privateKey);
  const expiresAt = computePolicyExpiration(policies);

  const jwtPayload: Record<string, any> = {
    policies,
    lastPayments,
  };

  const jwt = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "ES256", kid: signingKey.kid, typ: "JWT" })
    .setSubject(
      request.walletPublicKey ??
        request.transactionSignature ??
        `${request.recipient}-${request.trackingId}`
    )
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setNotBefore(Math.floor(Date.now() / 1000))
    .setJti(randomUUID())
    .sign(privateKey);

  return { token: jwt, expiresAt };
}
