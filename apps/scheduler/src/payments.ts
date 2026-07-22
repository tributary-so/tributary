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
import { logger } from "./logger.js";

const MAX_FAILURES = 3;
const COOLDOWN_MS = 5 * 60_000;
const COOLDOWN_MAX_MS = 30 * 60_000;

interface CooldownEntry {
  consecutiveFailures: number;
  cooldownUntil: number;
}

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
  private cooldowns: Map<string, CooldownEntry> = new Map();

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
      logger.error("Need at least one private key");
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
      logger.error(`Error reading keypair ${filePath}:`, error);
      throw error;
    }
  }

  private async checkAndExecutePayments(): Promise<void> {
    logger.info("Checking for payments to execute...");

    let totalExecutedCount = 0;
    let totalErrorCount = 0;

    for (let i = 0; i < this.gatewayKeypairs.length; i++) {
      const keypair = this.gatewayKeypairs[i];
      const wallet = new anchor.Wallet(keypair);
      await this.sdk.updateWallet(wallet);

      logger.debug(
        `Processing gateways for signer: ${keypair.publicKey.toString()}`
      );

      // Discover all gateways where this keypair is the signer (not just the
      // authority). A single signer can manage multiple gateways.
      const gateways = await this.sdk.getPaymentGatewaysBySigner(
        keypair.publicKey
      );

      if (gateways.length === 0) {
        logger.debug(
          `No gateways found for signer ${keypair.publicKey.toString()}`
        );
      }

      for (const { publicKey: gatewayPda, account: gateway } of gateways) {
        logger.debug(
          `Gateway ${gatewayPda.toString()} (authority: ${gateway.authority.toString()})`
        );

        try {
          const paymentPolicies = await this.sdk.getPaymentPoliciesByGateway(
            gatewayPda
          );

          logger.debug(
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
              const cooldown = this.cooldowns.get(policyPda.toBase58());
              if (cooldown && cooldown.cooldownUntil > Date.now()) {
                logger.debug(`${policyPda.toString()} on cooldown — skipping`);
                continue;
              }

              if (this.shouldExecutePayment(policy, currentTime)) {
                let milestoneInfo = "";
                if (policy.policyType.milestone) {
                  const m = policy.policyType.milestone;
                  milestoneInfo = ` (milestone ${m.currentMilestone + 1}/${
                    m.totalMilestones
                  })`;
                }

                logger.debug(
                  `Executing payment for policy: ${policyPda.toString()}${milestoneInfo}`
                );

                await this.executePayment(policyPda);
                executedCount++;
                this.cooldowns.delete(policyPda.toBase58());

                logger.debug(
                  `✅ Payment executed successfully for ${policyPda.toString()}${milestoneInfo}`
                );

                await this.delay(1000);
              }
            } catch (error) {
              logger.error(
                `🚩 Error executing payment for ${policyPda.toString()}`
              );
              if (error instanceof SendTransactionError) {
                logger.error(error.message);
                logger.error(error.logs);
              }
              this.recordFailure(policyPda);
              errorCount++;
            }
          }

          logger.info(
            `Gateway ${gatewayPda.toString()} completed. Executed: ${executedCount}, Errors: ${errorCount}`
          );

          totalExecutedCount += executedCount;
          totalErrorCount += errorCount;
        } catch (error) {
          logger.error(
            `Error processing gateway ${gatewayPda.toString()}:`,
            error
          );
        }
      }
    }

    logger.info(
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
        logger.debug(
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
        logger.debug(
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
      logger.debug(
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

      logger.debug(`Payment executed with signature: ${signature}`);
    } catch (error) {
      logger.error(`Failed to execute payment`);
      throw error;
    }
  }

  private recordFailure(policyPda: PublicKey): void {
    const key = policyPda.toBase58();
    const entry = this.cooldowns.get(key) ?? {
      consecutiveFailures: 0,
      cooldownUntil: 0,
    };
    entry.consecutiveFailures += 1;
    if (entry.consecutiveFailures >= MAX_FAILURES) {
      const backoffExp = Math.min(
        Math.floor((entry.consecutiveFailures - MAX_FAILURES) / MAX_FAILURES),
        6
      );
      const multiplier = Math.pow(2, backoffExp);
      const cooldownMs = Math.min(COOLDOWN_MS * multiplier, COOLDOWN_MAX_MS);
      entry.cooldownUntil = Date.now() + cooldownMs;
      logger.warn(
        `${key} hit ${entry.consecutiveFailures} strikes — cooldown ${
          cooldownMs / 1000
        }s (backoff 2^${backoffExp})`
      );
    }
    this.cooldowns.set(key, entry);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public start(): void {
    const schedule = this.config.cronSchedule || "*/5 * * * *";

    logger.info(`Starting payment scheduler with schedule: ${schedule}`);
    logger.info(
      `Gateways: ${this.gatewayKeypairs
        .map((k) => k.publicKey.toString())
        .join(", ")}`
    );
    logger.info(`Connection: ${this.config.connectionUrl}`);
    if (this.config.dryRun) {
      logger.info("Mode: DRY-RUN (no transactions will be sent)");
    }

    this.checkAndExecutePayments().catch((e) => logger.error("tick error:", e));

    cron.schedule(
      schedule,
      () => {
        this.checkAndExecutePayments().catch((e) =>
          logger.error("tick error:", e)
        );
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    logger.info("Payment scheduler started successfully");
  }

  public stop(): void {
    logger.info("Payment scheduler stopped");
  }
}

export { PaymentScheduler, SchedulerConfig };
