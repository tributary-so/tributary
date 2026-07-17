// Payment status tracking using PaymentPolicy paymentCount
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  Connection,
  PublicKey,
  Keypair,
  GetProgramAccountsFilter,
} from "@solana/web3.js";
import {
  Tributary,
  PaymentPolicy,
  ComposablePolicy,
  encodeMemo,
  decodeMemo,
} from "@tributary-so/sdk";

export interface SubscriptionStatus {
  subscriptionCreated: boolean;
  initialPaymentExecuted: boolean;
  paymentCount: number;
  nextPaymentDue?: number;
  status: "pending" | "created" | "active" | "failed";
}

export interface PolicyLookupOptions {
  /** Owner wallet pub key */
  walletPublicKey?: string;
  /** Token mint (defaults to USDC) */
  tokenMint?: string;

  /** User Payment public key (a pda, not a wallet public key!) */
  userPublicKey?: string;
  /** Gateway's public key (for gateway-based lookup) */
  gatewayPublicKey?: string;
  /** recipient */
  recipient?: string;
  /** trackingId */
  trackingId?: string;
}

export class PaymentTracker {
  private _tributary: Tributary;

  constructor(_connection: Connection, tributary?: Tributary) {
    this._tributary =
      tributary ?? new Tributary(_connection, Keypair.generate());
  }

  /**
   * Get all payment policies for a gateway
   * @param gatewayPublicKey The gateway's public key
   * @returns Array of payment policies
   */
  async getPoliciesByGateway(
    gatewayPublicKey: string,
  ): Promise<Array<{ publicKey: PublicKey; account: any }>> {
    try {
      // Get all payment policies for this gateway
      return await this._tributary.getPaymentPoliciesByGateway(
        new PublicKey(gatewayPublicKey),
      );
    } catch (error) {
      console.error("Error getting policies by gateway:", error);
      return [];
    }
  }

  /**
   * Get all payment policies for a user
   * @param userPublicKey The user's public key
   * @param tokenMint The token mint (defaults to USDC)
   * @returns Array of payment policies
   */
  async getPoliciesByOwner(
    walletPublicKey: string,
    tokenMint: string = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  ): Promise<Array<{ publicKey: PublicKey; account: any }>> {
    try {
      // Get user payment PDA
      const userPaymentPda = this._tributary.getUserPaymentPda(
        new PublicKey(walletPublicKey),
        new PublicKey(tokenMint),
      ).address;

      // Get all payment policies for this user payment account
      return await this._tributary.getPaymentPoliciesByUserPayment(
        userPaymentPda,
      );
    } catch (error) {
      console.error("Error getting policies by user:", error);
      return [];
    }
  }

  /**
   * Retrieves all payment policies belonging to the specified user payment account.
   * @param userPayment - Public key of the user payment PDA
   * @returns Array of payment policies for the user payment account
   */
  async getPaymentPoliciesForOptions(
    options: PolicyLookupOptions,
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    let filters: GetProgramAccountsFilter[] = [];
    if (options.walletPublicKey && options.tokenMint) {
      const userPayment = this._tributary.getUserPaymentPda(
        new PublicKey(options.walletPublicKey),
        new PublicKey(options.tokenMint),
      ).address;
      filters.push({
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: userPayment.toBase58(),
        },
      });
    }
    if (options.recipient) {
      filters.push({
        memcmp: {
          offset: 8 + 32, // Skip discriminator + user_payment
          bytes: options.recipient,
        },
      });
    }
    if (options.gatewayPublicKey) {
      filters.push({
        memcmp: {
          offset: 8 + 32 + 32, // Skip discriminator + user_payment + recipient
          bytes: options.gatewayPublicKey,
        },
      });
    }
    if (options.trackingId) {
      filters.push({
        memcmp: {
          offset: 8 + 32 + 32 + 32 + 118,
          bytes: bs58.encode(encodeMemo(options.trackingId, 64)),
        },
      });
    }
    return await this._tributary.program.account.paymentPolicy.all(filters);
  }
}

/**
 * Normalized view of a ComposablePolicy account for API responses.
 *
 * BN running totals/timestamps are flattened to `number`; the 32-byte memo
 * is decoded to a string; internal bookkeeping fields (`bump`, `padding`)
 * are nulled out; the account's public key is surfaced as `policyAccount`.
 */
export type ComposablePolicyDetails = Omit<
  ComposablePolicy,
  | "padding"
  | "bump"
  | "memo"
  | "totalInput"
  | "totalOutput"
  | "createdAt"
  | "updatedAt"
> & {
  padding: undefined;
  bump: undefined;
  memo: string;
  totalInput: number;
  totalOutput: number;
  createdAt: number;
  updatedAt: number;
  policyAccount: PublicKey;
};

/**
 * ComposablePolicyTracker — mirrors {@link PaymentTracker} for the
 * ComposablePolicy family. Delegates combined-filter lookups to
 * {@link Tributary.getComposablePolicies} (SDK owns the memcmp offsets) and
 * normalizes the raw accounts for downstream JSON consumers.
 */
export class ComposablePolicyTracker {
  private _tributary: Tributary;

  constructor(_connection: Connection, tributary?: Tributary) {
    this._tributary =
      tributary ?? new Tributary(_connection, Keypair.generate());
  }

  /**
   * Resolve {@link PolicyLookupOptions} into the SDK's combined-filter shape.
   *
   * `walletPublicKey` + `tokenMint` are paired into a derived user-payment PDA
   * (mirrors {@link PaymentTracker.getPaymentPoliciesForOptions}). The SDK
   * then translates each present field into the correct ComposablePolicy
   * memcmp offset (user_payment=9, gateway=41, memo=506, recipient=538).
   */
  private buildComposableFilters(options: PolicyLookupOptions): {
    userPayment?: PublicKey;
    gateway?: PublicKey;
    recipient?: PublicKey;
    trackingId?: string;
  } {
    const filters: {
      userPayment?: PublicKey;
      gateway?: PublicKey;
      recipient?: PublicKey;
      trackingId?: string;
    } = {};
    if (options.walletPublicKey && options.tokenMint) {
      filters.userPayment = this._tributary.getUserPaymentPda(
        new PublicKey(options.walletPublicKey),
        new PublicKey(options.tokenMint),
      ).address;
    }
    if (options.gatewayPublicKey) {
      filters.gateway = new PublicKey(options.gatewayPublicKey);
    }
    if (options.recipient) {
      filters.recipient = new PublicKey(options.recipient);
    }
    if (options.trackingId) {
      filters.trackingId = options.trackingId;
    }
    return filters;
  }

  /**
   * Normalize a raw fetched account into the API-facing shape.
   * BN→number for totals/timestamps; 32-byte memo→string; strip bookkeeping
   * fields; carry the account public key as `policyAccount`.
   */
  private normalizeComposable(
    account: ComposablePolicy,
    publicKey: PublicKey,
  ): ComposablePolicyDetails {
    return {
      ...account,
      memo: decodeMemo(account.memo),
      padding: undefined,
      bump: undefined,
      totalInput: account.totalInput.toNumber(),
      totalOutput: account.totalOutput.toNumber(),
      createdAt: account.createdAt.toNumber(),
      updatedAt: account.updatedAt.toNumber(),
      policyAccount: publicKey,
    };
  }

  /**
   * Fetch every ComposablePolicy matching the supplied lookup options.
   * Delegates to {@link Tributary.getComposablePolicies} and returns
   * normalized details (one entry per on-chain account).
   */
  async getComposablePoliciesForOptions(
    options: PolicyLookupOptions,
  ): Promise<ComposablePolicyDetails[]> {
    const filters = this.buildComposableFilters(options);
    const raw = await this._tributary.getComposablePolicies(filters);
    return raw.map(({ publicKey, account }) =>
      this.normalizeComposable(account, publicKey),
    );
  }
}
