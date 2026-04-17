import { SignJWT } from "jose";
import { getCurrentSigningKey, importPrivateKey } from "./jwks";
import { getSubscriptionDetails } from "./subscription";
import { verifyTransactionPayment } from "./tx-verifier";
import { PolicyLookupOptions } from "@tributary-so/payments";
import { getDb } from "../db";
import { events } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { decodeMemo } from "@tributary-so/sdk";
import {
  type SubscriptionClaim,
  type PaymentRecord,
} from "@tributary-so/payments";

const JWT_ISSUER = process.env.JWT_ISSUER || "https://api.tributary.so";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "tributary-checkout";
const JWT_MAX_TTL_DAYS = parseInt(process.env.JWT_MAX_TTL_DAYS || "30", 10);
const JWT_EXPIRY_BUFFER_MINUTES = parseInt(
  process.env.JWT_EXPIRY_BUFFER_MINUTES || "10",
  10
);

export interface TokenIssueRequest {
  walletPublicKey: string;
  tokenMint?: string;
  policyAddress?: string;
  recipient?: string;
  transactionSignature?: string;
}

export interface TokenResponse {
  token: string;
  expiresAt: number;
}

function deriveStatus(
  totalPayments: number,
  maxRenewals: number | null,
  nextPaymentDue: number | null
): "paid" | "overdue" | "completed" {
  if (maxRenewals !== null && totalPayments >= maxRenewals) {
    return "completed";
  }
  if (
    nextPaymentDue !== null &&
    nextPaymentDue < Math.floor(Date.now() / 1000)
  ) {
    return "overdue";
  }
  return "paid";
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
      const n = freq[key];
      return `custom:${n}`;
    }
    return map[key] ?? "monthly";
  }
  return String(freq);
}

function buildSubscriptionClaims(policies: any[]): SubscriptionClaim[] {
  return policies
    .filter((p) => {
      if (!p.policyType) return false;
      // Only subsccriptions allows here (for now)
      if (!("subscription" in p.policyType)) return false;
      return !!p.policyType.subscription;
    })
    .map((p) => {
      const sub = p.policyType.subscription;
      const nextPaymentDue = sub.nextPaymentDue
        ? typeof sub.nextPaymentDue === "number"
          ? sub.nextPaymentDue
          : sub.nextPaymentDue.toNumber?.() ?? null
        : null;
      const maxRenewals = sub.maxRenewals
        ? typeof sub.maxRenewals === "number"
          ? sub.maxRenewals
          : sub.maxRenewals.toNumber?.() ?? null
        : null;
      const totalPayments = typeof p.totalPaid === "number" ? p.totalPaid : 0;
      const amount = sub.amount.toString();
      const createdAt =
        typeof p.createdAt === "number"
          ? p.createdAt
          : p.createdAt?.toNumber?.() ?? 0;

      return {
        policyAddress: p.policyAccount?.toString() ?? "",
        policyId: p.policyId,
        recipient: p.recipient?.toString() ?? "",
        gateway: p.gateway?.toString() ?? "",
        amount,
        paymentFrequency: getFrequencyLabel(sub.paymentFrequency),
        totalPayments,
        nextPaymentDue,
        status: deriveStatus(totalPayments, maxRenewals, nextPaymentDue),
        autoRenew: sub.autoRenew ?? true,
        maxRenewals,
        memo: p.memo,
        createdAt,
      };
    });
}

async function getLastPayments(
  walletPublicKey: string,
  options?: {
    recipient?: string;
    policyAddresses?: string[];
    transactionSignature?: string;
    tokenMint?: string;
    limit?: number;
  }
): Promise<PaymentRecord[]> {
  const db = getDb();
  const conditions = [
    eq(events.eventName, "tributary_PaymentRecord"),
    sql`${events.data}->>'payer' = ${walletPublicKey}`,
  ];

  if (options?.recipient) {
    conditions.push(sql`${events.data}->>'recipient' = ${options.recipient}`);
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
      const data = event.data as any;
      const payer = data.payer;
      return payer === walletPublicKey;
    })
    .map((event) => {
      const data = event.data as any;
      return {
        signature: event.signature,
        slot: event.slot,
        timestamp: Math.floor(new Date(event.timestamp).getTime() / 1000),
        policyAddress:
          data.payment_policy ?? "11111111111111111111111111111111",
        amount: String(data.amount ?? "0"),
        tokenMint:
          options?.tokenMint ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        payer: data.payer ?? walletPublicKey,
        recipient: data.recipient ?? "",
        gateway: data.gateway ?? "",
        memo: data.memo
          ? typeof data.memo === "string"
            ? data.memo
            : decodeMemo(data.memo)
          : "",
        recordId: data.record_id ?? 0,
      };
    });
}

function computeExpiration(subscriptions: SubscriptionClaim[]): number {
  const nowSec = Math.floor(Date.now() / 1000);
  const maxTtl = JWT_MAX_TTL_DAYS * 24 * 60 * 60;

  if (subscriptions.length === 0) {
    return nowSec + 3600;
  }

  const dueDates = subscriptions
    .map((s) => s.nextPaymentDue)
    .filter((d): d is number => d !== null);

  if (dueDates.length === 0) {
    return nowSec + maxTtl;
  }

  const earliest = Math.min(...dueDates);
  const withBuffer = earliest + JWT_EXPIRY_BUFFER_MINUTES * 60;
  return Math.min(withBuffer, nowSec + maxTtl);
}

export async function issueToken(
  request: TokenIssueRequest
): Promise<TokenResponse> {
  const options: PolicyLookupOptions = {
    walletPublicKey: request.walletPublicKey,
  };
  if (request.recipient) {
    options.recipient = request.recipient;
  }
  if (request.tokenMint) {
    options.tokenMint = request.tokenMint;
  }

  let oneTimePayment: Awaited<
    ReturnType<typeof verifyTransactionPayment>
  > | null = null;
  let txPolicyAddress: string | null = null;

  if (request.transactionSignature) {
    oneTimePayment = await verifyTransactionPayment(
      request.transactionSignature,
      request.walletPublicKey
    );
    txPolicyAddress = oneTimePayment.policyAddress ?? null;
  }

  let allPolicies = request.transactionSignature
    ? []
    : await getSubscriptionDetails(options);

  let subscriptions: SubscriptionClaim[] = [];

  if (request.transactionSignature) {
    if (txPolicyAddress && allPolicies.length === 0) {
      allPolicies = await getSubscriptionDetails(options);
    }
    const matching = allPolicies.filter(
      (p: any) => p.policyAccount?.toString() === txPolicyAddress
    );
    subscriptions = buildSubscriptionClaims(matching);
  } else {
    subscriptions = buildSubscriptionClaims(allPolicies);
  }

  let lastPayments: PaymentRecord[] = [];

  if (request.transactionSignature) {
    let dbPayments = await getLastPayments(request.walletPublicKey, {
      transactionSignature: request.transactionSignature,
      tokenMint: request.tokenMint,
    });

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
  } else if (subscriptions.length > 0) {
    const policyAddresses = subscriptions.map((s) => s.policyAddress);
    lastPayments = await getLastPayments(request.walletPublicKey, {
      policyAddresses,
      recipient: request.recipient,
      tokenMint: request.tokenMint,
    });
  }

  if (subscriptions.length === 0 && lastPayments.length === 0) {
    throw new Error("No active subscription policies or payments found");
  }

  const signingKey = await getCurrentSigningKey();
  if (!signingKey) {
    throw new Error("No signing key available");
  }

  const privateKey = await importPrivateKey(signingKey.privateKey);
  const expiresAt = computeExpiration(subscriptions);

  const jwtPayload: Record<string, any> = {
    subscriptions,
    lastPayments,
  };

  const jwt = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "ES256", kid: signingKey.kid, typ: "JWT" })
    .setSubject(request.walletPublicKey)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(privateKey);

  return { token: jwt, expiresAt };
}
