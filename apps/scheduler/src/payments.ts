import {
  Connection,
  PublicKey,
  Keypair,
  SendTransactionError,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as cron from "node-cron";
import * as fs from "fs";
import { TributarySDK } from "@tributary-so/sdk";
import { exit } from "process";

interface SchedulerConfig {
  connectionUrl: string;
  gatewayKeypairPath?: string;
  privateKeys?: string[];
  relayerKeypairPath?: string;
  relayerPrivateKeys?: string[];
  cronSchedule?: string;
  dryRun?: boolean;
}

class PaymentScheduler {
  private sdk: TributarySDK;
  private gatewayKeypairs: Keypair[];
  private config: SchedulerConfig;

  constructor(config: SchedulerConfig) {
    this.config = config;
    this.gatewayKeypairs = [];

    if (config.gatewayKeypairPath) {
      this.gatewayKeypairs.push(
        this.loadKeypairFromFile(config.gatewayKeypairPath)
      );
    } else if (config.privateKeys && config.privateKeys.length > 0) {
      for (const privateKey of config.privateKeys) {
        if (privateKey.trim()) {
          this.gatewayKeypairs.push(this.loadKeypair(privateKey.trim()));
        }
      }
    }

    if (this.gatewayKeypairs.length === 0) {
      console.log("Error: need at least one private key!");
      exit(1);
    }

    const connection = new Connection(config.connectionUrl, "confirmed");
    this.sdk = new TributarySDK(connection, this.gatewayKeypairs[0]);
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

    let totalExecutedCount = 0;
    let totalErrorCount = 0;

    for (let i = 0; i < this.gatewayKeypairs.length; i++) {
      const keypair = this.gatewayKeypairs[i];
      const wallet = new anchor.Wallet(keypair);
      await this.sdk.updateWallet(wallet);

      console.log(
        `[${new Date().toISOString()}] Processing gateways for signer: ${keypair.publicKey.toString()}`
      );

      // Discover all gateways where this keypair is the signer (not just the
      // authority). A single signer can manage multiple gateways.
      const gateways = await this.sdk.getPaymentGatewaysBySigner(
        keypair.publicKey
      );

      if (gateways.length === 0) {
        console.log(
          `[${new Date().toISOString()}] No gateways found for signer ${keypair.publicKey.toString()}`
        );
      }

      for (const { publicKey: gatewayPda, account: gateway } of gateways) {
        console.log(
          `[${new Date().toISOString()}] Gateway ${gatewayPda.toString()} (authority: ${gateway.authority.toString()})`
        );

        try {
          const paymentPolicies = await this.sdk.getPaymentPoliciesByGateway(
            gatewayPda
          );

          console.log(
            `Found ${
              paymentPolicies.length
            } payment policies for gateway ${gatewayPda.toString()}`
          );

          const currentTime = Math.floor(Date.now() / 1000);
          let executedCount = 0;
          let errorCount = 0;

          for (const {
            publicKey: policyPda,
            account: policy,
          } of paymentPolicies) {
            try {
              if (this.shouldExecutePayment(policy, currentTime)) {
                let milestoneInfo = "";
                if (policy.policyType.milestone) {
                  const m = policy.policyType.milestone;
                  milestoneInfo = ` (milestone ${m.currentMilestone + 1}/${
                    m.totalMilestones
                  })`;
                }

                console.log(
                  `Executing payment for policy: ${policyPda.toString()}${milestoneInfo}`
                );

                await this.executePayment(policyPda);
                executedCount++;

                console.log(
                  `✅ Payment executed successfully for ${policyPda.toString()}${milestoneInfo}`
                );

                await this.delay(1000);
              }
            } catch (error) {
              console.error(
                `🚩 Error executing payment for ${policyPda.toString()}`
              );
              if (error instanceof SendTransactionError) {
                console.error(error.message);
                console.error(error.logs);
              }
              errorCount++;
            }
          }

          console.log(
            `Gateway ${gatewayPda.toString()} completed. Executed: ${executedCount}, Errors: ${errorCount}`
          );

          totalExecutedCount += executedCount;
          totalErrorCount += errorCount;
        } catch (error) {
          console.error(
            `Error processing gateway ${gatewayPda.toString()}:`,
            error
          );
        }
      }
    }

    console.log(
      `Payment execution completed. Total Executed: ${totalExecutedCount}, Total Errors: ${totalErrorCount}`
    );
  }

  private shouldExecutePayment(policy: any, currentTime: number): boolean {
    // Check if policy is active
    if (!policy.status.active) {
      return false;
    }

    // Check subscription payments
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

      return true;
    }

    // Check milestone payments (time-based only)
    if (policy.policyType.milestone) {
      const milestoneDetails = policy.policyType.milestone;

      // Only execute time-based milestones (releaseCondition === 0)
      if (milestoneDetails.releaseCondition !== 0) {
        return false;
      }

      // Check if there are more milestones to release
      const currentMilestone = milestoneDetails.currentMilestone;
      const totalMilestones = milestoneDetails.totalMilestones;

      if (currentMilestone >= totalMilestones) {
        console.log(
          `Policy ${policy.policyId} has completed all ${totalMilestones} milestones`
        );
        return false;
      }

      // Check if current milestone timestamp has passed
      const milestoneTimestamp =
        milestoneDetails.milestoneTimestamps[currentMilestone].toNumber();
      if (milestoneTimestamp > currentTime) {
        return false;
      }

      return true;
    }

    return false;
  }

  private async executePayment(paymentPolicyPda: PublicKey): Promise<void> {
    if (this.config.dryRun) {
      console.log(
        `[DRY-RUN] Would execute payment for ${paymentPolicyPda.toString()}`
      );
      return;
    }
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
    const schedule = this.config.cronSchedule || "*/5 * * * *";

    console.log(`Starting payment scheduler with schedule: ${schedule}`);
    console.log(
      `Gateways: ${this.gatewayKeypairs
        .map((k) => k.publicKey.toString())
        .join(", ")}`
    );
    console.log(`Connection: ${this.config.connectionUrl}`);
    if (this.config.dryRun) {
      console.log("Mode: DRY-RUN (no transactions will be sent)");
    }

    this.checkAndExecutePayments().catch(console.error);

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

export { PaymentScheduler, SchedulerConfig };
