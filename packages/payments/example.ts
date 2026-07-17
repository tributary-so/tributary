/**
 * Example usage of @tributary-so/payments package
 *
 * This example demonstrates how to integrate client-compatible payments
 * with Tributary's USDC subscription system on Solana.
 */

import { Tributary } from "@tributary-so/sdk";
import { PaymentsClient, PaymentPolicyTracker } from "./src/index";
import { CheckoutSessionManager, CheckoutParams } from "./src/core/session";
import { Connection, Keypair } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";

const SOLANA_API =
  process.env.SOLANA_API ?? "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_API);
const tributary = new Tributary(connection, new Wallet(Keypair.generate()));

async function example() {
  // 1. Initialize the client (no API key required!). Pass a PaymentPolicyTracker to
  //    enable .policies queries; checkout / one-time tracking need no tracker.
  const client = new PaymentsClient(
    new PaymentPolicyTracker(connection, tributary)
  );

  // 2. Create a checkout session
  try {
    const session = await client.checkout.sessions.create({
      payment_method_types: ["tributary"],
      line_items: [
        {
          description: "Monthly premium access to all features",
          unitPrice: 20.0, // $20.00
          quantity: 1,
        },
      ],
      paymentFrequency: "monthly",
      mode: "subscription",
      success_url:
        "https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://yourapp.com/cancel",
      tributaryConfig: {
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on mainnet
        gateway: "CwNybLVQ3sVmcZ3Q1veS6x99gUZcAF2duNDe3qbcEMGr", // Your gateway public key
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", // Your recipient public key
        trackingId: "user_123_monthly_premium", // Your unique tracking identifier
        autoRenew: true,
        memo: "Monthly premium subscription payment",
      },
    });

    console.log("Checkout session created:", session.id);
    console.log("Checkout URL:", session.url);

    // 3. Redirect user to checkout (in a real app)
    // window.location.href = session.url;

    // Clean up interval when done
    // clearInterval(pollInterval);
  } catch (error) {
    console.error("Error creating checkout session:", error.message);
  }
}

/**
 * Encode -> decode round-trip for every PaymentPolicy variant plus the direct
 * transfer. Demonstrates the v2 discriminated-union encoding (ADR-0023).
 */
function encodingVariants(): void {
  const manager = new CheckoutSessionManager();
  const PK = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
  const tm = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC

  const samples: { name: string; params: CheckoutParams }[] = [
    {
      name: "subscription",
      params: {
        mode: "subscription",
        tokenMint: tm,
        recipient: PK,
        gateway: PK,
        amount: 1_000_000,
        autoRenew: true,
        maxRenewals: null,
        paymentFrequency: "monthly",
        startTime: null,
        trackingId: "sub_demo",
        lineItems: [],
        cluster: "mainnet",
      },
    },
    {
      name: "milestone",
      params: {
        mode: "milestone",
        tokenMint: tm,
        recipient: PK,
        gateway: PK,
        milestoneAmounts: [500, 500],
        milestoneTimestamps: [1_700_000_000, 1_710_000_000],
        releaseCondition: 0b0001,
        totalMilestones: 2,
        trackingId: "milestone_demo",
        cluster: "mainnet",
      },
    },
    {
      name: "payAsYouGo",
      params: {
        mode: "payAsYouGo",
        tokenMint: tm,
        recipient: PK,
        gateway: PK,
        maxAmountPerPeriod: 10_000,
        maxChunkAmount: 1_000,
        periodLengthSeconds: 86_400,
        trackingId: "payg_demo",
        cluster: "mainnet",
      },
    },
    {
      name: "oneTime",
      params: {
        mode: "oneTime",
        tokenMint: tm,
        recipient: PK,
        gateway: PK,
        amount: 2_500,
        trackingId: "onetime_demo",
        cluster: "mainnet",
      },
    },
    {
      name: "upTo",
      params: {
        mode: "upTo",
        tokenMint: tm,
        recipient: PK,
        gateway: PK,
        maxAmount: 5_000,
        deadline: 1_800_000_000,
        trackingId: "upto_demo",
        cluster: "mainnet",
      },
    },
    {
      name: "payment (direct transfer)",
      params: {
        mode: "payment",
        tokenMint: tm,
        recipient: PK,
        amount: 750,
        trackingId: "pay_demo",
        cluster: "mainnet",
      },
    },
  ];

  for (const { name, params } of samples) {
    const url = manager.encodeUrl(params);
    const blob = url.split("/").pop() as string;
    const decoded = manager.decodeUrl(blob);
    const ok = JSON.stringify(decoded) === JSON.stringify(params);
    console.log(
      `  ${ok ? "OK" : "FAIL"}  ${name.padEnd(24)} -> ${url.slice(-24)}…`
    );
  }
}

// Run examples
if (require.main === module) {
  console.log("=== Tributary Payments SDK Example ===\n");

  console.log("1. Basic checkout session creation:");
  example().catch(console.error);

  console.log("\n2. All 6 encoding variants (encode -> decode round-trip):");
  encodingVariants();
}

export { example, encodingVariants };
