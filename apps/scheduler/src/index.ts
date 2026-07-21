#!/usr/bin/env node

import { ComposableScheduler } from "./composable.js";
import { PaymentScheduler, SchedulerConfig } from "./payments.js";
import { logger } from "./logger.js";

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.SOLANA_API) {
    logger.error("Environment variable SOLANA_API required");
    process.exit(1);
  }
  if (!process.env.ANCHOR_WALLET && !process.env.PRIVATE_KEY) {
    logger.error("Environment variable ANCHOR_WALLET or PRIVATE_KEY required");
    process.exit(1);
  }

  let privateKeys: string[] | undefined;
  if (process.env.PRIVATE_KEY) {
    privateKeys = process.env.PRIVATE_KEY.split(";").filter((k) => k.trim());
  }

  let relayerPrivateKeys: string[] | undefined;
  if (process.env.RELAYER_PRIVATE_KEY) {
    relayerPrivateKeys = process.env.RELAYER_PRIVATE_KEY.split(";").filter(
      (k) => k.trim()
    );
  }

  const dryRun = process.argv.includes("--dry-run");

  const config: SchedulerConfig = {
    connectionUrl: process.env.SOLANA_API,
    gatewayKeypairPath: process.env.ANCHOR_WALLET,
    privateKeys: privateKeys,
    relayerKeypairPath: process.env.RELAYER_WALLET,
    relayerPrivateKeys: relayerPrivateKeys,
    cronSchedule: process.env.CRON_SCHEDULE || "0 * * * *",
    dryRun,
  };

  if (dryRun) {
    logger.info("=== DRY-RUN MODE — no transactions will be sent ===");
  }

  const paymentsEnabled =
    process.env.ENABLE_PAYMENTS === "true" ||
    process.env.ENABLE_PAYMENTS === "1";

  let scheduler: PaymentScheduler | null = null;
  if (paymentsEnabled) {
    scheduler = new PaymentScheduler(config);
  }

  const composableEnabled =
    process.env.ENABLE_COMPOSABLE === "true" ||
    process.env.ENABLE_COMPOSABLE === "1";

  let composableScheduler: ComposableScheduler | null = null;
  if (composableEnabled) {
    composableScheduler = new ComposableScheduler({
      connectionUrl: config.connectionUrl,
      gatewayKeypairPath: config.gatewayKeypairPath,
      privateKeys: config.privateKeys,
      relayerKeypairPath: config.relayerKeypairPath,
      relayerPrivateKeys: config.relayerPrivateKeys,
      dryRun,
    });
  }

  process.on("SIGINT", () => {
    logger.info("Received SIGINT, shutting down gracefully...");
    scheduler?.stop();
    composableScheduler?.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, shutting down gracefully...");
    scheduler?.stop();
    composableScheduler?.stop();
    process.exit(0);
  });

  if (scheduler) {
    scheduler.start();
  }
  if (composableScheduler) {
    composableScheduler.start().catch((e) => {
      logger.error("Composable scheduler failed to start:", e);
    });
  }
}

export { PaymentScheduler, ComposableScheduler };
