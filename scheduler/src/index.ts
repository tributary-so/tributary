#!/usr/bin/env node

import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as cron from "node-cron";
import * as fs from "fs";
import { getGatewayPda, RecurringPaymentsSDK } from "@tributary-so/sdk";
import { exit } from "process";

interface SchedulerConfig {
  connectionUrl: string;
  gatewayKeypairPath?: string;
  privateKey?: string;
  cronSchedule?: string; // Default: every hour
}

class PaymentScheduler {
  private sdk: RecurringPaymentsSDK;
  private gatewayKeypair: Keypair;
  private config: SchedulerConfig;

  constructor(config: SchedulerConfig) {
    this.config = config;

    // Load gateway keypair
    if (config.gatewayKeypairPath) {
      this.gatewayKeypair = this.loadKeypairFromFile(config.gatewayKeypairPath);
    } else if (config.privateKey) {
      this.gatewayKeypair = this.loadKeypair(config.privateKey);
    } else {
      console.log("Error: need private key!");
      exit(1);
    }

    // Initialize SDK
    const connection = new Connection(config.connectionUrl, "confirmed");
    const wallet = new anchor.Wallet(this.gatewayKeypair);
    this.sdk = new RecurringPaymentsSDK(connection, wallet);
  }

  private loadKeypair(data: string) {
    const secretKeyArray = JSON.parse(data);
    const secretKeyBuffer = new Uint8Array(secretKeyArray);
    return Keypair.fromSecretKey(secretKeyBuffer);
  }

  private loadKeypairFromFile(filePath: string): Keypair {
    try {
      const jsonContent = fs.readFileSync(filePath, "ascii");
      return this.loadKeypair(jsonContent);
    } catch (error) {
      console.error("Error reading keypair:", error);
      throw error;
    }
  }

  private async checkAndExecutePayments(): Promise<void> {
    console.log(
      `[${new Date().toISOString()}] Checking for payments to execute...`
    );

    try {
      // Get all payment policies managed by this gateway
      const { address: gatewayPda } = this.sdk.getGatewayPda(
        this.gatewayKeypair.publicKey
      );
      const paymentPolicies = await this.sdk.getPaymentPoliciesByGateway(
        gatewayPda
      );

      console.log(
        `Found ${paymentPolicies.length} payment policies for this gateway`
      );

      const currentTime = Math.floor(Date.now() / 1000);
      let executedCount = 0;
      let errorCount = 0;

      for (const { publicKey: policyPda, account: policy } of paymentPolicies) {
        try {
          // Check if payment is due and policy is active
          if (this.shouldExecutePayment(policy, currentTime)) {
            console.log(
              `Executing payment for policy: ${policyPda.toString()}`
            );

            await this.executePayment(policyPda);
            executedCount++;

            console.log(
              `✅ Payment executed successfully for ${policyPda.toString()}`
            );

            // Add small delay between payments to avoid overwhelming the RPC
            await this.delay(1000);
          }
        } catch (error) {
          console.error(
            `🚩 Error executing payment for ${policyPda.toString()}`
          );
          errorCount++;
        }
      }

      console.log(
        `Payment execution completed. Executed: ${executedCount}, Errors: ${errorCount}`
      );
    } catch (error) {
      console.error("Error in payment checking process");
    }
  }

  private shouldExecutePayment(policy: any, currentTime: number): boolean {
    // Check if policy is active
    if (!policy.status.active) {
      return false;
    }

    // Check if payment is due
    // For subscription policies, check if we can execute now haven't exceeded max renewals
    if (policy.policyType.subscription) {
      const subscriptionDetails = policy.policyType.subscription;
      const nextPaymentDue = subscriptionDetails.nextPaymentDue.toNumber();
      if (nextPaymentDue > currentTime) {
        return false;
      }

      const maxRenewals = subscriptionDetails.maxRenewals;
      if (maxRenewals !== null && policy.paymentCount >= maxRenewals) {
        console.log(
          `Policy ${policy.policyId} has reached max renewals (${maxRenewals})`
        );
        return false;
      }
    }

    return true;
  }

  private async executePayment(paymentPolicyPda: PublicKey): Promise<void> {
    try {
      const transaction = new anchor.web3.Transaction();
      const instructions = await this.sdk.executePayment(paymentPolicyPda);
      for (const instruction of instructions) {
        transaction.add(instruction);
      }

      const signature = await this.sdk.provider.sendAndConfirm(
        transaction,
        [],
        {
          commitment: "confirmed",
          skipPreflight: false,
        }
      );

      console.log(`Payment executed with signature: ${signature}`);
    } catch (error) {
      console.error(`Failed to execute payment`);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public start(): void {
    const schedule = this.config.cronSchedule || "*/5 * * * *"; // Every 5mins

    console.log(`Starting payment scheduler with schedule: ${schedule}`);
    console.log(`Gateway: ${this.gatewayKeypair.publicKey.toString()}`);
    console.log(`Connection: ${this.config.connectionUrl}`);

    // Run initial check
    this.checkAndExecutePayments().catch(console.error);

    // Schedule recurring checks
    cron.schedule(
      schedule,
      () => {
        this.checkAndExecutePayments().catch(console.error);
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    console.log("Payment scheduler started successfully");
  }

  public stop(): void {
    console.log("Payment scheduler stopped");
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.SOLANA_API) {
    console.error("Environment variable SOLANA_API required");
    process.exit(1);
  }
  if (!process.env.ANCHOR_WALLET && !process.env.PRIVATE_KEY) {
    console.error("Environment variable ANCHOR_WALLET or PRIVATE_KEY required");
    process.exit(1);
  }

  const config: SchedulerConfig = {
    connectionUrl: process.env.SOLANA_API,
    gatewayKeypairPath: process.env.ANCHOR_WALLET,
    privateKey: process.env.PRIVATE_KEY,
    cronSchedule: process.env.CRON_SCHEDULE || "0 * * * *",
  };

  const scheduler = new PaymentScheduler(config);

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT, shutting down gracefully...");
    scheduler.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nReceived SIGTERM, shutting down gracefully...");
    scheduler.stop();
    process.exit(0);
  });

  scheduler.start();
}

export { PaymentScheduler };
