import { jwtVerify, createRemoteJWKSet } from "jose";

const DEFAULT_BASE_URL = "https://api.tributary.so";
const DEFAULT_ISSUER = "https://api.tributary.so";
const DEFAULT_AUDIENCE = "tributary-checkout";

export interface TributaryVerificationConfig {
  baseUrl?: string;
  issuer?: string;
  audience?: string;
}

export interface VerifyPaymentOptions {
  recipient: string;
  wallet: string;
  memo: string;
}

export interface VerifySubscriptionOptions {
  recipient: string;
  wallet: string;
  memo: string;
}

export interface SubscriptionClaim {
  policyAddress: string;
  policyId: number;
  recipient: string;
  gateway: string;
  amount: string;
  paymentFrequency: string;
  totalPayments: number;
  nextPaymentDue: number | null;
  status: string;
  autoRenew: boolean;
  maxRenewals: number | null;
  createdAt: number;
}

export interface PaymentRecord {
  signature: string;
  slot: number;
  timestamp: number;
  policyAddress: string;
  amount: string;
  tokenMint: string;
  payer: string;
  recipient: string;
  gateway: string;
  memo: string;
  recordId: number;
}

export interface TributaryJWTPayload {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  kid: string;
  subscriptions: SubscriptionClaim[];
  lastPayments: PaymentRecord[];
}

export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationError";
  }
}

export class PaymentVerificationError extends VerificationError {
  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

export class SubscriptionVerificationError extends VerificationError {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionVerificationError";
  }
}

export class TributaryVerifier {
  private baseUrl: string;
  private issuer: string;
  private audience: string;
  private jwksUrl: URL;
  private jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config?: TributaryVerificationConfig) {
    this.baseUrl =
      config?.baseUrl ?? process.env.TRIBUTARY_BASE_URL ?? DEFAULT_BASE_URL;
    this.issuer =
      config?.issuer ?? process.env.TRIBUTARY_ISSUER ?? DEFAULT_ISSUER;
    this.audience =
      config?.audience ?? process.env.TRIBUTARY_AUDIENCE ?? DEFAULT_AUDIENCE;
    this.jwksUrl = new URL(`${this.baseUrl}/.well-known/jwks.json`);
    this.jwks = createRemoteJWKSet(this.jwksUrl);
  }

  async verify(token: string): Promise<TributaryJWTPayload> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience,
    });
    return payload as unknown as TributaryJWTPayload;
  }

  async verifyPayment(
    token: string,
    options: VerifyPaymentOptions
  ): Promise<PaymentRecord> {
    const payload = await this.verify(token);

    if (payload.sub !== options.wallet) {
      throw new PaymentVerificationError(
        `Wallet mismatch: token issued for ${payload.sub}, expected ${options.wallet}`
      );
    }

    const payments = payload.lastPayments || [];
    const match = payments.find(
      (p) =>
        p.recipient === options.recipient &&
        p.payer === options.wallet &&
        (p.memo === options.memo || p.memo.includes(options.memo))
    );

    if (!match) {
      throw new PaymentVerificationError(
        `No payment found matching recipient=${options.recipient}, wallet=${options.wallet}, memo=${options.memo}`
      );
    }

    return match;
  }

  async verifySubscription(
    token: string,
    options: VerifySubscriptionOptions
  ): Promise<SubscriptionClaim> {
    const payload = await this.verify(token);

    if (payload.sub !== options.wallet) {
      throw new SubscriptionVerificationError(
        `Wallet mismatch: token issued for ${payload.sub}, expected ${options.wallet}`
      );
    }

    const subscriptions = payload.subscriptions || [];
    const match = subscriptions.find(
      (s) => s.recipient === options.recipient && s.status === "paid"
    );

    if (!match) {
      const paidSubs = subscriptions.filter(
        (s) => s.recipient === options.recipient
      );
      if (paidSubs.length > 0) {
        const statuses = paidSubs.map((s) => s.status).join(", ");
        throw new SubscriptionVerificationError(
          `Subscription found but not paid (status: ${statuses})`
        );
      }
      throw new SubscriptionVerificationError(
        `No active subscription found for recipient=${options.recipient}, wallet=${options.wallet}`
      );
    }

    const payments = payload.lastPayments || [];
    const paymentMatch = payments.find(
      (p) =>
        p.recipient === options.recipient &&
        p.payer === options.wallet &&
        (p.memo === options.memo || p.memo.includes(options.memo))
    );

    if (!paymentMatch && options.memo) {
      throw new SubscriptionVerificationError(
        `Subscription is paid but no payment found with memo="${options.memo}"`
      );
    }

    return match;
  }
}
