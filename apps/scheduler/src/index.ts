#!/usr/bin/env node

import { ComposableScheduler } from "./composable.js";
import { PaymentScheduler, SchedulerConfig } from "./payments.js"


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

  let privateKeys: string[] | undefined;
  if (process.env.PRIVATE_KEY) {
    privateKeys = process.env.PRIVATE_KEY.split(";").filter((k) => k.trim());
  }

  const config: SchedulerConfig = {
    connectionUrl: process.env.SOLANA_API,
    gatewayKeypairPath: process.env.ANCHOR_WALLET,
    privateKeys: privateKeys,
    cronSchedule: process.env.CRON_SCHEDULE || "0 * * * *",
  };

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
    });
  }

  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT, shutting down gracefully...");
    scheduler?.stop();
    composableScheduler?.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nReceived SIGTERM, shutting down gracefully...");
    scheduler?.stop();
    composableScheduler?.stop();
    process.exit(0);
  });

  if (scheduler) {
    scheduler.start();
  }
  if (composableScheduler) {
    composableScheduler.start().catch((e) => {
      console.error("Composable scheduler failed to start:", e);
    });
  }
}

export { PaymentScheduler, ComposableScheduler };
