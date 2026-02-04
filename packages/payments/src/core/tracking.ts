// Payment status tracking using PaymentPolicy paymentCount

import { PaymentStatus, PaymentTransaction } from "../types/tributary";
import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

export interface SubscriptionStatus {
  subscriptionCreated: boolean;
  initialPaymentExecuted: boolean;
  paymentCount: number;
  nextPaymentDue?: number;
  status: "pending" | "created" | "active" | "failed";
}

export interface PolicyLookupOptions {
  /** User's public key (for user-based lookup) */
  userPublicKey?: string;
  /** Gateway's public key (for gateway-based lookup) */
  gatewayPublicKey?: string;
  /** Token mint (defaults to USDC) */
  tokenMint?: string;
}

export class PaymentTracker {
  private connection: Connection;
  private tributary: Tributary;

  constructor(connection: Connection, tributary: Tributary) {
    this.connection = connection;
    this.tributary = tributary;
  }

  /**
   * Check initial subscription status (creation + first payment)
   * Uses paymentCount from PaymentPolicy for verification
   * @param trackingId The tracking ID from MEMO field
   * @param options Lookup options (user or gateway public key)
   * @returns Subscription status with creation and initial payment verification
   */
  async checkInitialStatus(
    trackingId: string,
    options: PolicyLookupOptions
  ): Promise<SubscriptionStatus> {
    const status: SubscriptionStatus = {
      subscriptionCreated: false,
      initialPaymentExecuted: false,
      paymentCount: 0,
      status: "pending",
    };

    try {
      // Find PaymentPolicy by tracking ID using user or gateway lookup
      const paymentPolicy = await this.findPaymentPolicyByTrackingId(
        trackingId,
        options
      );

      if (paymentPolicy) {
        status.subscriptionCreated = true;
        status.paymentCount = paymentPolicy.paymentCount || 0;
        status.initialPaymentExecuted = status.paymentCount > 0;

        if (status.paymentCount > 0) {
          status.status = "active";

          // Get next payment due date for subscriptions
          if (paymentPolicy.policyType?.subscription) {
            status.nextPaymentDue =
              paymentPolicy.policyType.subscription.nextPaymentDue?.toNumber();
          }
        } else {
          status.status = "created";
        }
      }
    } catch (error) {
      console.error("Error checking subscription status:", error);
      status.status = "failed";
    }

    return status;
  }

  /**
   * Find PaymentPolicy by tracking ID using user or gateway lookup
   * @param trackingId Tracking ID to find
   * @param options Lookup options (user or gateway public key)
   * @returns PaymentPolicy if found, null otherwise
   */
  private async findPaymentPolicyByTrackingId(
    trackingId: string,
    options: PolicyLookupOptions
  ) {
    try {
      let policies: Array<{ publicKey: PublicKey; account: any }> = [];

      // User-based lookup
      if (options.userPublicKey) {
        policies = await this.getPoliciesByUser(
          options.userPublicKey,
          options.tokenMint
        );
      }
      // Gateway-based lookup
      else if (options.gatewayPublicKey) {
        policies = await this.getPoliciesByGateway(options.gatewayPublicKey);
      } else {
        throw new Error(
          "Either userPublicKey or gatewayPublicKey must be provided"
        );
      }

      // Search for policy with matching tracking ID in MEMO
      for (const { account: policy } of policies) {
        if (this.extractTrackingIdFromMemo(policy.memo) === trackingId) {
          return policy;
        }
      }

      return null;
    } catch (error) {
      console.error("Error finding payment policy:", error);
      return null;
    }
  }

  /**
   * Get all payment policies for a user
   * @param userPublicKey The user's public key
   * @param tokenMint The token mint (defaults to USDC)
   * @returns Array of payment policies
   */
  private async getPoliciesByUser(
    userPublicKey: string,
    tokenMint: string = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  ): Promise<Array<{ publicKey: PublicKey; account: any }>> {
    try {
      // Get user payment PDA
      const userPaymentPda = this.tributary.getUserPaymentPda(
        new PublicKey(userPublicKey),
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
   * Get all payment policies for a gateway
   * @param gatewayPublicKey The gateway's public key
   * @returns Array of payment policies
   */
  private async getPoliciesByGateway(
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
   * Extract tracking ID from MEMO field
   * @param memo MEMO field from payment policy (limited to 64 bytes)
   * @returns Tracking ID if found, null otherwise
   */
  private extractTrackingIdFromMemo(memo: number[]): string | null {
    if (!memo || memo.length === 0) return null;

    try {
      const memoString = Buffer.from(memo).toString("utf8").trim();

      // Handle both old and new memo formats for backward compatibility
      const paymentMatch = memoString.match(
        /tributary:payment:([a-zA-Z0-9_-]+)/
      );
      if (paymentMatch) return paymentMatch[1];

      const trackingMatch = memoString.match(
        /tributary:tracking:([a-zA-Z0-9_-]+)/
      );
      if (trackingMatch) return trackingMatch[1];

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract session data from PaymentPolicy memo
   * @param memo MEMO field from payment policy
   * @returns Decoded session data if found, null otherwise
   */
  private extractSessionDataFromMemo(memo: number[]): any {
    if (!memo || memo.length === 0) return null;

    try {
      const memoString = Buffer.from(memo).toString("utf8");

      // Look for Base64URL encoded session data in memo
      // Format: tributary:payment:{trackingId}|{base64url_data}
      const match = memoString.match(
        /tributary:payment:([a-zA-Z0-9_-]+)\|([A-Za-z0-9_-]+)/
      );
      if (match) {
        const trackingId = match[1];
        const encodedData = match[2];

        // Decode Base64URL data
        const base64 = encodedData.replace(/-/g, "+").replace(/_/g, "/");
        const padding = base64.length % 4;
        const standardBase64 =
          base64 + "=".repeat(padding === 0 ? 0 : 4 - padding);
        const jsonString = Buffer.from(standardBase64, "base64").toString(
          "utf8"
        );

        return {
          trackingId,
          ...JSON.parse(jsonString),
        };
      }

      return null;
    } catch (error) {
      console.error("Error extracting session data from memo:", error);
      return null;
    }
  }

  /**
   * Get subscription by tracking ID with full session data
   * @param trackingId The tracking ID
   * @param options Lookup options (user or gateway public key)
   * @returns Subscription with decoded session data or null
   */
  async getSubscriptionByTrackingId(
    trackingId: string,
    options: PolicyLookupOptions
  ): Promise<{
    policy: any;
    sessionData?: any;
    status: SubscriptionStatus;
  } | null> {
    try {
      const paymentPolicy = await this.findPaymentPolicyByTrackingId(
        trackingId,
        options
      );

      if (!paymentPolicy) return null;

      const status = await this.checkInitialStatus(trackingId, options);
      const sessionData = this.extractSessionDataFromMemo(paymentPolicy.memo);

      return {
        policy: paymentPolicy,
        sessionData,
        status,
      };
    } catch (error) {
      console.error("Error getting subscription by tracking ID:", error);
      return null;
    }
  }

  /**
   * Quick status check - has the subscription been created and had at least one payment?
   * @param trackingId The tracking ID from the payment
   * @param options Lookup options (user or gateway public key)
   * @returns Promise<boolean> true if subscription is active with at least one payment
   */
  async isSubscriptionActive(
    trackingId: string,
    options: PolicyLookupOptions
  ): Promise<boolean> {
    const status = await this.checkInitialStatus(trackingId, options);
    return status.status === "active";
  }

  /**
   * Get subscription details by tracking ID
   * @param trackingId The tracking ID from the payment
   * @param options Lookup options (user or gateway public key)
   * @returns Promise<SubscriptionStatus | null> Subscription details or null if not found
   */
  async getSubscriptionDetails(
    trackingId: string,
    options: PolicyLookupOptions
  ): Promise<SubscriptionStatus | null> {
    try {
      return await this.checkInitialStatus(trackingId, options);
    } catch (error) {
      return null;
    }
  }

  /**
   * Legacy method: Check payment status by searching transactions
   * This is more expensive but useful for historical payment verification
   * @param trackingId The tracking ID
   * @param recipient The recipient public key
   * @returns Payment status with transaction history
   */
  async checkPaymentStatus(
    trackingId: string,
    recipient: string
  ): Promise<PaymentStatus> {
    try {
      const transactions = await this.findTransactionsByTrackingId(
        trackingId,
        recipient
      );

      return {
        status: transactions.length > 0 ? "paid" : "pending",
        transactions: transactions,
      };
    } catch (error) {
      console.error("Error checking payment status:", error);
      return {
        status: "failed",
        transactions: [],
      };
    }
  }

  /**
   * Get all payments for a tracking ID (legacy method)
   * @param trackingId The tracking ID
   * @param recipient The recipient public key
   * @returns Array of payment transactions
   */
  async getPaymentHistory(
    trackingId: string,
    recipient: string
  ): Promise<PaymentTransaction[]> {
    try {
      return await this.findTransactionsByTrackingId(trackingId, recipient);
    } catch (error) {
      console.error("Error getting payment history:", error);
      return [];
    }
  }

  /**
   * Find transactions by tracking ID in MEMO field (legacy method)
   * This is expensive and should only be used for historical verification
   * @param trackingId The tracking ID
   * @param recipient The recipient public key
   * @returns Array of payment transactions
   */
  private async findTransactionsByTrackingId(
    trackingId: string,
    recipient: string
  ): Promise<PaymentTransaction[]> {
    try {
      const recipientPubkey = new PublicKey(recipient);

      // Get signatures for transactions involving the recipient
      const signatures = await this.connection.getSignaturesForAddress(
        recipientPubkey,
        { limit: 100 } // Limit to prevent excessive queries
      );

      const transactions: PaymentTransaction[] = [];

      // Process each transaction to find those with the tracking ID
      for (const sig of signatures) {
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            commitment: "confirmed",
          });

          if (tx && this.containsTrackingId(tx, trackingId)) {
            const paymentTx = this.extractPaymentTransaction(
              tx,
              recipient,
              trackingId,
              sig.signature
            );
            if (paymentTx) {
              transactions.push(paymentTx);
            }
          }
        } catch (error) {
          // Skip transactions that can't be parsed
          console.warn(`Failed to parse transaction ${sig.signature}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error finding transactions:", error);
      return [];
    }
  }

  /**
   * Check if transaction contains the tracking ID in MEMO field
   * @param tx The parsed transaction
   * @param trackingId The tracking ID to find
   * @returns True if transaction contains the tracking ID
   */
  private containsTrackingId(
    tx: ParsedTransactionWithMeta,
    trackingId: string
  ): boolean {
    if (!tx.meta || !tx.transaction.message) {
      return false;
    }

    // Look for MEMO instruction
    const message = tx.transaction.message;
    for (const instruction of message.instructions) {
      if (this.isMemoInstruction(instruction)) {
        const memo = this.extractMemoFromInstruction(instruction);
        if (memo && memo.includes(`tributary:payment:${trackingId}`)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if instruction is a MEMO instruction
   * @param instruction The instruction to check
   * @returns True if it's a MEMO instruction
   */
  private isMemoInstruction(instruction: any): boolean {
    // MEMO program ID: Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFJNo
    const memoProgramId = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFJNo";
    return instruction.programId?.toString() === memoProgramId;
  }

  /**
   * Extract MEMO text from instruction
   * @param instruction The MEMO instruction
   * @returns The MEMO text or null
   */
  private extractMemoFromInstruction(instruction: any): string | null {
    if (!instruction.data || !instruction.data.length) {
      return null;
    }

    try {
      // MEMO instruction data is typically UTF-8 encoded text
      const memoBytes = instruction.data;
      const memoText = Buffer.from(memoBytes).toString("utf8");
      return memoText;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract payment transaction details
   * @param tx The parsed transaction
   * @param recipient The recipient public key
   * @param trackingId The tracking ID
   * @param signature The transaction signature
   * @returns Payment transaction details or null
   */
  private extractPaymentTransaction(
    tx: ParsedTransactionWithMeta,
    recipient: string,
    trackingId: string,
    signature: string
  ): PaymentTransaction | null {
    if (!tx.blockTime) {
      return null;
    }

    // Extract MEMO from transaction
    let memo = "";
    const message = tx.transaction.message;
    if (message && message.instructions) {
      for (const instruction of message.instructions) {
        if (this.isMemoInstruction(instruction)) {
          const extractedMemo = this.extractMemoFromInstruction(instruction);
          if (extractedMemo) {
            memo = extractedMemo;
            break;
          }
        }
      }
    }

    // Extract amount from token transfer (simplified)
    const amount = this.extractTokenAmount(tx, recipient);

    return {
      signature: signature,
      timestamp: tx.blockTime * 1000, // Convert to milliseconds
      amount: amount,
      recipient: recipient,
      memo: memo,
      trackingId: trackingId,
    };
  }

  /**
   * Extract token amount from transaction (simplified implementation)
   * @param tx The parsed transaction
   * @param recipient The recipient public key
   * @returns The token amount
   */
  private extractTokenAmount(
    tx: ParsedTransactionWithMeta,
    recipient: string
  ): number {
    if (!tx.meta || !tx.meta.postTokenBalances) {
      return 0;
    }

    // This is a simplified implementation
    // In reality, you'd need to parse the token transfer instructions properly
    try {
      const recipientPubkey = new PublicKey(recipient);

      // Look for balance changes for the recipient
      for (const balance of tx.meta.postTokenBalances) {
        if (
          balance.owner &&
          balance.owner.toString() === recipientPubkey.toString()
        ) {
          // For now, return a placeholder amount
          // In production, you'd calculate the actual transfer amount
          return 1000000; // Placeholder: 1 USDC
        }
      }
    } catch (error) {
      console.warn("Error extracting token amount:", error);
    }

    return 0;
  }
}

// Utility functions for status checking

/**
 * Quick status check - has the subscription been created and had at least one payment?
 * @param trackingId The tracking ID from the payment
 * @param connection Solana connection
 * @param tributary Tributary SDK instance
 * @param options Lookup options (user or gateway public key)
 * @returns Promise<boolean> true if subscription is active with at least one payment
 */
export async function isSubscriptionActive(
  trackingId: string,
  connection: Connection,
  tributary: Tributary,
  options: PolicyLookupOptions
): Promise<boolean> {
  const tracker = new PaymentTracker(connection, tributary);
  const status = await tracker.checkInitialStatus(trackingId, options);
  return status.status === "active";
}

/**
 * Get subscription details by tracking ID
 * @param trackingId The tracking ID from the payment
 * @param connection Solana connection
 * @param tributary Tributary SDK instance
 * @param options Lookup options (user or gateway public key)
 * @returns Promise<SubscriptionStatus | null> Subscription details or null if not found
 */
export async function getSubscriptionDetails(
  trackingId: string,
  connection: Connection,
  tributary: Tributary,
  options: PolicyLookupOptions
): Promise<SubscriptionStatus | null> {
  const tracker = new PaymentTracker(connection, tributary);
  try {
    return await tracker.checkInitialStatus(trackingId, options);
  } catch (error) {
    return null;
  }
}

/**
 * Get full subscription with session data
 * @param trackingId The tracking ID from the payment
 * @param connection Solana connection
 * @param tributary Tributary SDK instance
 * @param options Lookup options (user or gateway public key)
 * @returns Promise with subscription data or null
 */
export async function getSubscriptionByTrackingId(
  trackingId: string,
  connection: Connection,
  tributary: Tributary,
  options: PolicyLookupOptions
) {
  const tracker = new PaymentTracker(connection, tributary);
  return await tracker.getSubscriptionByTrackingId(trackingId, options);
}
