// Payment status tracking using PaymentPolicy paymentCount
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  Connection,
  PublicKey,
  Keypair,
  GetProgramAccountsFilter,
} from "@solana/web3.js";
import { Tributary, PaymentPolicy, encodeMemo } from "@tributary-so/sdk";

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
  private connection: Connection;
  private tributary: Tributary;

  constructor(connection: Connection, tributary?: Tributary) {
    this.connection = connection;
    this.tributary = tributary ?? new Tributary(connection, Keypair.generate());
  }

  /**
   * Get all payment policies for a gateway
   * @param gatewayPublicKey The gateway's public key
   * @returns Array of payment policies
   */
  async getPoliciesByGateway(
    gatewayPublicKey: string
  ): Promise<Array<{ publicKey: PublicKey; account: any }>> {
    try {
      // Get all payment policies for this gateway
      return await this.tributary.getPaymentPoliciesByGateway(
        new PublicKey(gatewayPublicKey)
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
    tokenMint: string = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  ): Promise<Array<{ publicKey: PublicKey; account: any }>> {
    try {
      // Get user payment PDA
      const userPaymentPda = this.tributary.getUserPaymentPda(
        new PublicKey(walletPublicKey),
        new PublicKey(tokenMint)
      ).address;

      // Get all payment policies for this user payment account
      return await this.tributary.getPaymentPoliciesByUserPayment(
        userPaymentPda
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
    options: PolicyLookupOptions
  ): Promise<Array<{ publicKey: PublicKey; account: PaymentPolicy }>> {
    let filters: GetProgramAccountsFilter[] = [
      {
        dataSize: 586,
      },
    ];
    if (options.walletPublicKey && options.tokenMint) {
      const userPayment = this.tributary.getUserPaymentPda(
        new PublicKey(options.walletPublicKey),
        new PublicKey(options.tokenMint)
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
          offset: 8 + 32 + 32 + 32 + 129 + 1, // Skip discriminator + user_payment + recipient + policyType + status
          // NOTE: this is prefixed based filtering, if needed exact, one might use
          // bs58.encode(encodeMemo(options.trackingId, 64)) instead but i didn't get it to work so far
          bytes: bs58.encode(Buffer.from(options.trackingId)),
        },
      });
    }
    return await this.tributary.program.account.paymentPolicy.all(filters);
  }
}
