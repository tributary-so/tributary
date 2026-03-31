import { SignJWT, jwtVerify, importJWK, errors } from "jose";
import {
  getCurrentSigningKey,
  getSigningKeyByKid,
  importPrivateKey,
} from "./jwks";
import { getSubscriptionDetails } from "./subscription";

const JWT_ISSUER = process.env.JWT_ISSUER || "https://api.tributary.so";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "tributary-checkout";
const JWT_MAX_TTL_DAYS = parseInt(process.env.JWT_MAX_TTL_DAYS || "30", 10);
const JWT_REFRESH_GRACE_DAYS = parseInt(
  process.env.JWT_REFRESH_GRACE_DAYS || "7",
  10
);
const JWT_EXPIRY_BUFFER_MINUTES = parseInt(
  process.env.JWT_EXPIRY_BUFFER_MINUTES || "10",
  10
);

export interface SubscriptionClaim {
  policyAddress: string;
  recipient: string;
  gateway: string;
  amount: string;
  tokenMint: string;
  paymentFrequency: string;
  lastExecuted: number | null;
  totalPayments: number;
  nextPaymentDue: number | null;
  status: "paid" | "overdue" | "completed";
  autoRenew: boolean;
  maxRenewals: number | null;
  createdAt: number;
}

export interface TokenIssueRequest {
  walletPublicKey: string;
  tokenMint?: string;
  policyAddress?: string;
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
  const nowSec = Math.floor(Date.now() / 1000);

  return policies
    .filter((p) => {
      if (!p.policyType) return false;
      if (!("subscription" in p.policyType)) return false;
      const sub = p.policyType.subscription;
      if (!sub) return false;
      return true;
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
      const amount =
        typeof sub.amount === "number"
          ? (sub.amount / 1_000_000).toFixed(2)
          : "0.00";
      const createdAt =
        typeof p.createdAt === "number"
          ? p.createdAt
          : p.createdAt?.toNumber?.() ?? 0;

      let lastExecuted: number | null = null;
      if (totalPayments > 0) {
        const freqSec = getFrequencySeconds(sub.paymentFrequency);
        lastExecuted = createdAt + (totalPayments - 1) * freqSec;
      }

      return {
        policyAddress: p.publicKey ?? p.policyAddress ?? "",
        recipient: p.recipient ?? "",
        gateway: p.gateway ?? "",
        amount,
        tokenMint: p.tokenMint ?? "",
        paymentFrequency: getFrequencyLabel(sub.paymentFrequency),
        lastExecuted,
        totalPayments,
        nextPaymentDue,
        status: deriveStatus(totalPayments, maxRenewals, nextPaymentDue),
        autoRenew: sub.autoRenew ?? true,
        maxRenewals,
        createdAt,
      };
    });
}

function getFrequencySeconds(freq: any): number {
  if (!freq) return 30 * 24 * 60 * 60;
  if (typeof freq === "object") {
    const key = Object.keys(freq)[0];
    const map: Record<string, number> = {
      Daily: 86400,
      Weekly: 7 * 86400,
      Biweekly: 14 * 86400,
      Monthly: 30 * 86400,
      Quarterly: 90 * 86400,
      Yearly: 365 * 86400,
      Custom: 86400,
    };
    return map[key] ?? 30 * 86400;
  }
  return 30 * 24 * 60 * 60;
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
  const options: Record<string, string> = {
    walletPublicKey: request.walletPublicKey,
  };
  if (request.tokenMint) {
    options.tokenMint = request.tokenMint;
  } else {
    options.tokenMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  }

  const policies = await getSubscriptionDetails(options as any);
  const subscriptions = buildSubscriptionClaims(policies);

  if (subscriptions.length === 0) {
    throw new Error("No active subscription policies found");
  }

  const signingKey = await getCurrentSigningKey();
  if (!signingKey) {
    throw new Error("No signing key available");
  }

  const privateKey = await importPrivateKey(signingKey.privateKey);
  const expiresAt = computeExpiration(subscriptions);

  const jwt = await new SignJWT({
    subscriptions,
  })
    .setProtectedHeader({ alg: "ES256", kid: signingKey.kid, typ: "JWT" })
    .setSubject(request.walletPublicKey)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(privateKey);

  return { token: jwt, expiresAt };
}

export async function refreshToken(
  expiredToken: string
): Promise<TokenResponse> {
  const headerB64 = expiredToken.split(".")[0];
  const header = JSON.parse(
    Buffer.from(headerB64, "base64url").toString("utf-8")
  );
  const kid = header.kid;

  const signingKey = await getSigningKeyByKid(kid);
  if (!signingKey) {
    throw new Error("Signing key not found");
  }
  if (signingKey.expiresAt && new Date() > signingKey.expiresAt) {
    throw new Error("Signing key has been rotated out");
  }

  const publicKey = await importJWK(signingKey.publicJwk as any, "ES256");

  let payload: any;
  try {
    const result = await jwtVerify(expiredToken, publicKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    payload = result.payload;
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      const payloadB64 = expiredToken.split(".")[1];
      payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf-8")
      );

      const graceSec = JWT_REFRESH_GRACE_DAYS * 24 * 60 * 60;
      if (
        payload.exp &&
        Math.floor(Date.now() / 1000) > payload.exp + graceSec
      ) {
        throw new Error("Token expired beyond grace period");
      }

      if (payload.aud !== JWT_AUDIENCE) {
        throw new Error("Invalid token audience");
      }
    } else {
      throw err;
    }
  }

  const walletPublicKey = payload.sub;
  if (!walletPublicKey) {
    throw new Error("Missing subject in token");
  }

  return issueToken({ walletPublicKey });
}
