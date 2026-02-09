# Lando Subscription Skill

This skill sets up a one-time subscription payment for Lando services. **Important**: This should only be called once per subscription.

## What You're Subscribing To

${itemsDescription}

### Payment Configuration

| Parameter             | Value                   |
| --------------------- | ----------------------- |
| **Token Mint**        | `${tokenMint}`          |
| **Token Decimals**    | ${decimals}             |
| **Amount**            | ${displayAmount} tokens |
| **Amount (Integer)**  | ${amount}               |
| **Payment Frequency** | ${frequencyDisplay}     |
| **Auto-Renew**        | ${autoRenew}            |
| **Max Renewals**      | ${maxRenewals}          |
| **Tracking ID**       | `${trackingId}`         |

## How to Pay (Tributary SDK)

## Implementation Guide

### Prerequisites

1. **Install Dependencies**

```bash
pnpm add @tributary-so/sdk @solana/web3.js bn.js
```

2. **Funded Solana Account**
   - Option A: Use operator-provided private key (formatted as `[num,num,num,...]`)
   - Option B: Create and fund a new wallet

## Complete Implementation File

Save the following code as `lando-subscription.ts`:

```typescript
import { Tributary, encodeMemo } from "@tributary-so/sdk";
import { Connection, Keypair, PublicKey, Commitment } from "@solana/web3.js";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";

// ==================== WALLET UTILITIES ====================

export interface WalletConfig {
  publicKey: string;
  secretKey: number[];
  createdAt?: string;
}

/**
 * Generates a new Solana wallet and saves it to a JSON file
 */
export function generateAndSaveWallet(directory: string = "./"): Keypair {
  const keypair = Keypair.generate();
  const walletData: WalletConfig = {
    publicKey: keypair.publicKey.toString(),
    secretKey: Array.from(keypair.secretKey),
    createdAt: new Date().toISOString(),
  };

  const filePath = path.join(directory, "wallet.json");
  fs.writeFileSync(filePath, JSON.stringify(walletData, null, 2));

  console.log(`✅ Wallet created successfully!`);
  console.log(`📁 Saved to: ${filePath}`);
  console.log(`📍 Address: ${keypair.publicKey.toString()}`);
  console.log(
    `⚠️  Keep this file secure and share only the address with your operator`,
  );

  return keypair;
}

/**
 * Loads a wallet from a JSON file
 */
export function loadWalletFromFile(filePath: string): Keypair {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const config: WalletConfig = JSON.parse(data);

    if (!config.secretKey || !Array.isArray(config.secretKey)) {
      throw new Error("Invalid wallet format: secretKey must be an array");
    }

    return Keypair.fromSecretKey(Uint8Array.from(config.secretKey));
  } catch (error) {
    throw new Error(
      `Failed to load wallet: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ==================== SUBSCRIPTION SERVICE ====================

export interface SubscriptionConfig {
  tokenMint: PublicKey;
  recipient: PublicKey;
  amount: BN;
  memo: string;
  frequency: "monthly" | "weekly" | "daily";
  autoRenew: boolean;
  maxRenewals?: number;
  trackingId: string;
}

export const DEFAULT_SUBSCRIPTION_CONFIG: Partial<SubscriptionConfig> = {
  frequency: "monthly",
  autoRenew: true,
};

/**
 * Main service for creating Lando subscriptions
 */
export class LandoSubscriptionService {
  private connection: Connection;
  private wallet: Keypair;
  private tributary: Tributary;

  constructor(
    rpcEndpoint: string = "https://api.mainnet-beta.solana.com",
    wallet: Keypair,
  ) {
    this.connection = new Connection(rpcEndpoint);
    this.wallet = wallet;
    this.tributary = new Tributary(this.connection, wallet);
  }

  /**
   * Creates a Lando subscription payment
   */
  async createLandoSubscription(
    config: Partial<SubscriptionConfig>,
  ): Promise<string> {
    try {
      console.log("🚀 Starting Lando subscription process...");

      // Validate required parameters
      this.validateConfig(config);

      // Prepare full configuration
      const fullConfig: SubscriptionConfig = {
        ...DEFAULT_SUBSCRIPTION_CONFIG,
        ...config,
        memo: encodeMemo(config.trackingId!, 64),
      } as SubscriptionConfig;

      console.log(`📊 Configuration validated`);
      console.log(`💰 Amount: ${fullConfig.amount.toNumber() / 1000000} USDC`);
      console.log(`📝 Tracking ID: ${fullConfig.trackingId}`);

      // Create subscription
      const subscription = await this.tributary.createSubscription({
        tokenMint: fullConfig.tokenMint,
        recipient: fullConfig.recipient,
        amount: fullConfig.amount,
        memo: fullConfig.memo,
        frequency: fullConfig.frequency,
        autoRenew: fullConfig.autoRenew,
        maxRenewals: fullConfig.maxRenewals,
      });

      console.log(`📡 Sending transaction...`);

      // Send transaction
      const signature = await this.connection.sendTransaction(
        subscription.transaction,
        [this.wallet],
        { skipPreflight: false, preflightCommitment: "confirmed" },
      );

      console.log(`⏳ Transaction sent, confirming: ${signature}`);

      // Confirm transaction
      await this.confirmTransaction(signature);

      console.log(`✅ Transaction confirmed!`);
      return signature;
    } catch (error) {
      console.error("❌ Failed to create subscription:");
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validates the subscription configuration
   */
  private validateConfig(config: Partial<SubscriptionConfig>): void {
    const required = ["tokenMint", "recipient", "amount", "trackingId"];
    const missing = required.filter(
      (field) => !config[field as keyof SubscriptionConfig],
    );

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(", ")}`);
    }
  }

  /**
   * Confirms a transaction with retry logic
   */
  private async confirmTransaction(
    signature: string,
    maxRetries: number = 30,
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const confirmation = await this.connection.getSignatureStatus(
          signature,
          { searchTransactionHistory: true },
        );

        if (confirmation?.value?.confirmationStatus === "confirmed") {
          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }
          return;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(
            `Transaction confirmation timeout after ${maxRetries} seconds`,
          );
        }
      }
    }
  }
}

// ==================== MAIN EXECUTION ====================

/**
 * Main function to execute the Lando subscription
 */
async function runLandoSubscription() {
  try {
    console.log("🎬 Starting Lando Subscription Process");
    console.log("=".repeat(50));

    // 1. Load or create wallet
    const walletPath = "./wallet.json";
    let wallet: Keypair;

    if (fs.existsSync(walletPath)) {
      console.log(`📂 Loading existing wallet from ${walletPath}`);
      wallet = loadWalletFromFile(walletPath);
    } else {
      console.log(`🆕 Creating new wallet...`);
      wallet = generateAndSaveWallet();
      console.log(
        `💡 Please fund this wallet with at least 10 USDC + SOL for gas fees`,
      );
      console.log(`   Address: ${wallet.publicKey.toString()}`);
      console.log(`\n⚠️  After funding, run this script again to continue.`);
      return;
    }

    console.log(`✅ Using wallet: ${wallet.publicKey.toString()}`);

    // 2. Initialize service
    const subscriptionService = new LandoSubscriptionService(
      "https://api.mainnet-beta.solana.com",
      wallet,
    );

    // 3. Configure Lando subscription
    const landoConfig: Partial<SubscriptionConfig> = {
      tokenMint: new PublicKey("${tokenMint}"), // USDC
      recipient: new PublicKey("${recipient}"), // Lando recipient
      amount: new BN(${amount}), // 10 USDC (6 decimals)
      trackingId: "${trackingId}",
      frequency: "${frequencyDisplay}",
      autoRenew: ${autoRenew},
    };

    console.log("\n📋 Subscription Details:");
    console.log("-".repeat(30));
    console.log(`Amount: ${displayAmount} token`);
    console.log(`Tracking ID: %{trackingId}`);

    // 5. Create subscription
    console.log("\n⏳ Processing payment...");
    const signature = await subscriptionService.createLandoSubscription(
      landoConfig,
    );

    // 6. Success output
    console.log("\n" + "=".repeat(50));
    console.log("🎉 LANDO SUBSCRIPTION ACTIVATED!");
    console.log("=".repeat(50));
    console.log(`Transaction Signature: ${signature}`);
    console.log(`Explorer Link: https://explorer.solana.com/tx/${signature}`);
    console.log(`Tracking ID: ${trackingId}`);
    console.log(`Service Start: Immediate`);
    console.log("\n✅ Process completed successfully!");
  } catch (error) {
    console.error("\n" + "❌".repeat(20));
    console.error("SUBSCRIPTION PROCESS FAILED");
    console.error("❌".repeat(20));
    console.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    console.error("\n💡 Troubleshooting Tips:");
    console.error("1. Check your wallet has at least 10 USDC + 0.01 SOL");
    console.error("2. Verify your internet connection");
    console.error("3. Ensure you're using the correct wallet file");
    console.error("4. Try again in a few minutes if network is busy");
    process.exit(1);
  }
}

## Next Steps

1. Ensure you have sufficient token balance (${tokenMint})
2. Execute the above Tributary SDK commands
3. Save the transaction signature for proof of payment
4. Access your subscription service immediately after payment confirms

---

Powered by Tributary | Agent Commerce on Solana
```
