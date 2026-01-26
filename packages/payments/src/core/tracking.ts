// MEMO-based payment tracking

import { PaymentStatus, PaymentTransaction } from "../types/stripe";
import { MemoUtils } from "../utils/memo";
import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";

export class PaymentTracker {
  private connection: Connection;

  constructor() {
    // Use Solana mainnet cluster
    this.connection = new Connection(
      "https://api.mainnet-beta.solana.com",
      "confirmed"
    );
  }

  // Check payment status by tracking ID
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

  // Get all payments for a tracking ID
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

  // Find transactions by tracking ID in MEMO field
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

  // Check if transaction contains the tracking ID in MEMO field
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
        if (memo && memo.includes(`tributary:tracking:${trackingId}`)) {
          return true;
        }
      }
    }

    return false;
  }

  // Check if instruction is a MEMO instruction
  private isMemoInstruction(instruction: any): boolean {
    // MEMO program ID: Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFJNo
    const memoProgramId = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFJNo";
    return instruction.programId?.toString() === memoProgramId;
  }

  // Extract MEMO text from instruction
  private extractMemoFromInstruction(instruction: any): string | null {
    if (!instruction.data || !instruction.data.length) {
      return null;
    }

    try {
      // MEMO instruction data is typically UTF-8 encoded text
      const memoBytes = instruction.data;
      const memoText = Buffer.from(memoBytes).toString("utf-8");
      return memoText;
    } catch (error) {
      return null;
    }
  }

  // Extract payment transaction details
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

  // Extract token amount from transaction (simplified implementation)
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
