#!/usr/bin/env node

import { Command } from "commander";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import {
  TributarySDK,
  type PaymentFrequency,
  type PaymentPolicy,
  UserPayment,
} from "@tributary-so/sdk";

function readKeypairFromFile(filePath: string): anchor.web3.Keypair {
  try {
    // Read the file as a Uint8Array
    const jsonContent = fs.readFileSync(filePath, "ascii");
    const secretKeyArray = JSON.parse(jsonContent);

    // Convert parsed JSON to Uint8Array if needed
    const secretKeyBuffer = new Uint8Array(secretKeyArray);

    // Convert Uint8Array to Keypair
    return anchor.web3.Keypair.fromSecretKey(secretKeyBuffer);
  } catch (error) {
    console.error("Error reading keypair:", error);
    throw error;
  }
}

async function dumpUserPayments(
  sdk: TributarySDK,
  userPayments: {
    publicKey: PublicKey;
    account: UserPayment;
  }[]
) {
  for (const userPayment of userPayments) {
    const policies = await sdk.getPaymentPoliciesByUser(userPayment.publicKey);

    // Group by userPayment
    const grouped: Record<
      string,
      Array<{ publicKey: PublicKey; account: PaymentPolicy }>
    > = {};
    for (const policy of policies) {
      const userPaymentStr = policy.account.userPayment.toString();
      if (!grouped[userPaymentStr]) {
        grouped[userPaymentStr] = [];
      }
      grouped[userPaymentStr].push(policy);
    }

    // Sort user payments
    const sortedUserPayments = Object.keys(grouped).sort();

    for (const userPaymentStr of sortedUserPayments) {
      console.log(`User Payment: ${userPaymentStr}`);
      console.log(` Created at ${userPayment.account.createdAt.toString()}`);
      console.log(
        ` Policies ${userPayment.account.activePoliciesCount.toString()}/${userPayment.account.createdPoliciesCount.toString()}`
      );
      for (const policy of grouped[userPaymentStr]) {
        console.log(
          `  Policy ${policy.account.policyId}: Status ${
            Object.keys(policy.account.status)[0]
          }, Recipient ${policy.account.recipient.toString()}, Gateway ${policy.account.gateway.toString()}`
        );
      }
    }
  }
}

function createSDK(connectionUrl: string, keypath: string): TributarySDK {
  const connection = new Connection(connectionUrl);
  const keypair = readKeypairFromFile(keypath);
  const wallet = new anchor.Wallet(keypair);
  return new TributarySDK(connection, wallet);
}

const program = new Command();

program
  .name("tributary-cli")
  .description("CLI for Tributary Recurring Payments")
  .version("1.0.0")
  .requiredOption("-c, --connection-url <url>", "Solana RPC connection URL")
  .requiredOption("-k, --keypath <path>", "Path to keypair file");

// Initialize command
program
  .command("initialize")
  .description("Initialize the recurring payments program")
  .requiredOption("-a, --admin <pubkey>", "Admin public key")
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const adminPubkey = new PublicKey(options.admin);

      const instruction = await sdk.initialize(adminPubkey);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("Program initialized successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error initializing program:", error);
      process.exit(1);
    }
  });

// Create User Payment command
program
  .command("create-user-payment")
  .description("Create a user payment account")
  .requiredOption("-t, --token-mint <pubkey>", "Token mint public key")
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const tokenMint = new PublicKey(options.tokenMint);

      const instruction = await sdk.createUserPayment(tokenMint);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("User payment account created successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error creating user payment:", error);
      process.exit(1);
    }
  });

// Create Payment Gateway command
program
  .command("create-gateway")
  .description("Create a payment gateway")
  .requiredOption("-a, --authority <pubkey>", "Gateway authority public key")
  .requiredOption("-f, --fee-bps <number>", "Gateway fee in basis points")
  .requiredOption("-r, --fee-recipient <pubkey>", "Fee recipient public key")
  .requiredOption("-n, --name <string>", "Gateway name")
  .requiredOption("-u, --url <string>", "Gateway URL")
  .option(
    "--admin-keypath <path>",
    "Path to admin keypair file (defaults to main keypath)"
  )
  .action(async (options) => {
    try {
      const connection = new Connection(program.opts().connectionUrl);
      const authority = new PublicKey(options.authority);
      const feeBps = parseInt(options.feeBps);
      const feeRecipient = new PublicKey(options.feeRecipient);
      const name = options.name;
      const url = options.url;

      let adminKeypair = readKeypairFromFile(program.opts().keypath);
      if (options.adminKeypath) {
        adminKeypair = readKeypairFromFile(options.adminKeypath);
      }

      const sdk = new TributarySDK(connection, new anchor.Wallet(adminKeypair));

      const instruction = await sdk.createPaymentGateway(
        authority,
        feeBps,
        feeRecipient,
        name,
        url
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await connection.sendTransaction(tx, [adminKeypair]);

      console.log("Payment gateway created successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error creating payment gateway:", error);
      process.exit(1);
    }
  });

// Delete Payment Gateway command
program
  .command("delete-gateway")
  .description("Delete a payment gateway")
  .requiredOption("-a, --authority <pubkey>", "Gateway authority public key")
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const authority = new PublicKey(options.authority);

      const instruction = await sdk.deletePaymentGateway(authority);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("Payment gateway deleted successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error deleting payment gateway:", error);
      process.exit(1);
    }
  });

// Create Subscription command
program
  .command("create-subscription")
  .description("Create a subscription payment policy")
  .requiredOption("-t, --token-mint <pubkey>", "Token mint public key")
  .requiredOption("-r, --recipient <pubkey>", "Payment recipient public key")
  .requiredOption("-g, --gateway <pubkey>", "Payment gateway public key")
  .requiredOption(
    "-a, --amount <number>",
    "Payment amount (in token base units)"
  )
  .option("-m, --memo <string>", "Payment memo", "")
  .option("--auto-renew", "Enable auto-renewal", true)
  .option("--max-renewals <number>", "Maximum number of renewals")
  .option(
    "-f, --frequency <string>",
    "Payment frequency (daily|weekly|monthly|quarterly|semiAnnually|annually)",
    "monthly"
  )
  .option("--start-time <number>", "Start time as Unix timestamp")
  .option("--execute-immediately", "Execute first payment immediately")
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const tokenMint = new PublicKey(options.tokenMint);
      const recipient = new PublicKey(options.recipient);
      const gateway = new PublicKey(options.gateway);
      const amount = new anchor.BN(options.amount);
      const autoRenew = options.autoRenew;
      const maxRenewals = options.maxRenewals
        ? parseInt(options.maxRenewals)
        : null;
      const startTime = options.startTime
        ? new anchor.BN(options.startTime)
        : null;
      const executeImmediately = options.executeImmediately || false;

      // Create payment frequency
      const paymentFrequency: PaymentFrequency = {
        [options.frequency]: {},
      } as PaymentFrequency;

      // Create memo buffer
      const memo = [];
      for (let i = 0; i < Math.min(options.memo.length, 64); i++) {
        memo.push(options.memo.charCodeAt(i));
      }
      while (memo.length < 64) {
        memo.push(0);
      }

      const instructions = await sdk.createSubscription(
        tokenMint,
        recipient,
        gateway,
        amount,
        autoRenew,
        maxRenewals,
        paymentFrequency,
        memo,
        startTime,
        undefined, // approvalAmount
        executeImmediately
      );

      const tx = new anchor.web3.Transaction();
      instructions.forEach((ix) => tx.add(ix));
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("Subscription created successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error creating subscription:", error);
      process.exit(1);
    }
  });

// Execute Payment command
program
  .command("execute-payment")
  .description("Execute a payment")
  .requiredOption(
    "-u, --user-payment <pubkey>",
    "User payment account public key"
  )
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const userPaymentPda = new PublicKey(options.userPayment);

      const instructions = await sdk.executePayment(userPaymentPda);
      const tx = new anchor.web3.Transaction();
      instructions.map((instruction) => tx.add(instruction));
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("Payment executed successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error executing payment:", error);
      process.exit(1);
    }
  });

// PDA utility commands
program
  .command("get-config-pda")
  .description("Get the program config PDA")
  .action(() => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const pda = sdk.getConfigPda();
      console.log("Config PDA:", pda.address.toString());
      console.log("Bump:", pda.bump);
    } catch (error) {
      console.error("Error getting config PDA:", error);
      process.exit(1);
    }
  });

program
  .command("get-gateway-pda")
  .description("Get a gateway PDA")
  .requiredOption("-a, --authority <pubkey>", "Gateway authority public key")
  .action((options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const authority = new PublicKey(options.authority);
      const pda = sdk.getGatewayPda(authority);
      console.log("Gateway PDA:", pda.address.toString());
      console.log("Bump:", pda.bump);
    } catch (error) {
      console.error("Error getting gateway PDA:", error);
      process.exit(1);
    }
  });

program
  .command("get-user-payment-pda")
  .description("Get a user payment PDA")
  .requiredOption("-u, --user <pubkey>", "User public key")
  .requiredOption("-t, --token-mint <pubkey>", "Token mint public key")
  .action((options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const user = new PublicKey(options.user);
      const tokenMint = new PublicKey(options.tokenMint);
      const pda = sdk.getUserPaymentPda(user, tokenMint);
      console.log("User Payment PDA:", pda.address.toString());
      console.log("Bump:", pda.bump);
    } catch (error) {
      console.error("Error getting user payment PDA:", error);
      process.exit(1);
    }
  });

program
  .command("get-payment-policy-pda")
  .description("Get a payment policy PDA")
  .requiredOption(
    "-u, --user-payment <pubkey>",
    "User payment account public key"
  )
  .requiredOption("-p, --policy-id <number>", "Policy ID")
  .action((options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const userPayment = new PublicKey(options.userPayment);
      const policyId = parseInt(options.policyId);
      const pda = sdk.getPaymentPolicyPda(userPayment, policyId);
      console.log("Payment Policy PDA:", pda.address.toString());
      console.log("Bump:", pda.bump);
    } catch (error) {
      console.error("Error getting payment policy PDA:", error);
      process.exit(1);
    }
  });

program
  .command("get-payments-delegate-pda")
  .description("Get the payments delegate PDA")
  .action(() => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const pda = sdk.getPaymentsDelegatePda();
      console.log("Payments Delegate PDA:", pda.address.toString());
      console.log("Bump:", pda.bump);
    } catch (error) {
      console.error("Error getting payments delegate PDA:", error);
      process.exit(1);
    }
  });

program
  .command("list-user-payments")
  .description("List all user payment")
  .action(async () => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const users = await sdk.getAllUserPayments();
      for (const user of users) {
        console.log(`User Payment: ${user.publicKey.toString()}`);
        console.log(`Owner ${user.account.owner.toString()}`);
        console.log(
          `Policies ${user.account.activePoliciesCount.toString()}/${user.account.createdPoliciesCount.toString()}`
        );
        console.log(`Created at ${user.account.createdAt.toString()}`);
      }
    } catch (error) {
      console.error("Error listing policies:", error);
      process.exit(1);
    }
  });

program
  .command("list-gateways")
  .description("List all payment gateways")
  .action(async () => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const gateways = await sdk.getAllPaymentGateway();
      for (const gateway of gateways) {
        console.log(`Gateway: ${gateway.publicKey.toString()}`);
        console.log(`Authority: ${gateway.account.authority.toString()}`);
        console.log(`Feature Flag: ${gateway.account.featureFlags}`);
        console.log(
          `Fee Recipient: ${gateway.account.feeRecipient.toString()}`
        );
        console.log(`Fee BPS: ${gateway.account.gatewayFeeBps}`);
        console.log(
          `Custom protocol Fee BPS: ${gateway.account.customProtocolFeeBps}`
        );
        console.log(
          `Name: ${String.fromCharCode(...gateway.account.name).replace(
            /\0/g,
            ""
          )}`
        );
        console.log(
          `URL: ${String.fromCharCode(...gateway.account.url).replace(
            /\0/g,
            ""
          )}`
        );
        console.log(`Active: ${gateway.account.isActive}`);
        console.log(
          `Created At: ${new Date(
            gateway.account.createdAt.toNumber() * 1000
          ).toISOString()}`
        );
        console.log("---");
      }
    } catch (error) {
      console.error("Error listing gateways:", error);
      process.exit(1);
    }
  });

// List Policies by Owner command
program
  .command("list-policies-by-owner")
  .description(
    "List all payment policies for a given owner, ordered by user payment"
  )
  .requiredOption("-o, --owner <pubkey>", "Owner public key")
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );

      const owner = new PublicKey(options.owner);
      const userPayments = await sdk.getAllUserPaymentsByOwner(owner);
      await dumpUserPayments(sdk, userPayments);
    } catch (error) {
      console.error("Error listing policies:", error);
      process.exit(1);
    }
  });

program
  .command("list-payment-policies")
  .description("List all payment policies, ordered by user payment")
  .action(async (_options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );

      const userPayments = await sdk.getAllUserPayments();
      await dumpUserPayments(sdk, userPayments);
    } catch (error) {
      console.error("Error listing policies:", error);
      process.exit(1);
    }
  });

program
  .command("change-gateway-signer")
  .description("Change the signer for a payment gateway")
  .requiredOption("-a, --authority <pubkey>", "Gateway authority public key")
  .requiredOption("-s, --new-signer <pubkey>", "New signer public key")
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const authority = new PublicKey(options.authority);
      const newSigner = new PublicKey(options.newSigner);

      const instruction = await sdk.changeGatewaySigner(authority, newSigner);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("Gateway signer changed successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error changing gateway signer:", error);
      process.exit(1);
    }
  });

program
  .command("change-gateway-fee-recipient")
  .description("Change the fee recipient for a payment gateway")
  .requiredOption("-a, --authority <pubkey>", "Gateway authority public key")
  .requiredOption(
    "-r, --new-fee-recipient <pubkey>",
    "New fee recipient public key"
  )
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const authority = new PublicKey(options.authority);
      const newFeeRecipient = new PublicKey(options.newFeeRecipient);

      const instruction = await sdk.changeGatewayFeeRecipient(
        authority,
        newFeeRecipient
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("Gateway fee recipient changed successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error changing gateway fee recipient:", error);
      process.exit(1);
    }
  });

// Change Gateway Fee BPS command
program
  .command("change-gateway-fee-bps")
  .description("Change the gateway fee in basis points")
  .requiredOption("-a, --authority <pubkey>", "Gateway authority public key")
  .requiredOption(
    "-f, --fee-bps <number>",
    "New gateway fee in basis points (0-10000)"
  )
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const authority = new PublicKey(options.authority);
      const newFeeBps = parseInt(options.feeBps);

      if (newFeeBps > 10000) {
        throw new Error("Gateway fee cannot exceed 10000 bps (100%)");
      }

      const instruction = await sdk.changeGatewayFeeBps(authority, newFeeBps);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("Gateway fee BPS changed successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error changing gateway fee BPS:", error);
      process.exit(1);
    }
  });

// Update Gateway Referral Settings command
program
  .command("update-gateway-referral-settings")
  .description("Update referral settings for a payment gateway")
  .requiredOption("-a, --authority <pubkey>", "Gateway authority public key")
  .requiredOption(
    "-f, --feature-flags <number>",
    "Feature flags (bit 0 = referral enabled)"
  )
  .requiredOption(
    "-l, --referral-allocation-bps <number>",
    "Referral allocation in basis points (0-2500)"
  )
  .requiredOption(
    "-t, --referral-tiers-bps <string>",
    "Referral tiers BPS as comma-separated values (L1,L2,L3)"
  )
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const authority = new PublicKey(options.authority);
      const featureFlags = parseInt(options.featureFlags);
      const referralAllocationBps = parseInt(options.referralAllocationBps);
      const referralTiersBps = options.referralTiersBps
        .split(",")
        .map((s: string) => parseInt(s.trim()));

      if (referralTiersBps.length !== 3) {
        throw new Error("Referral tiers must be exactly 3 values (L1,L2,L3)");
      }

      const instruction = await sdk.updateGatewayReferralSettings(
        authority,
        featureFlags,
        referralAllocationBps,
        [referralTiersBps[0], referralTiersBps[1], referralTiersBps[2]]
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("Gateway referral settings updated successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error updating gateway referral settings:", error);
      process.exit(1);
    }
  });

// Update Gateway Protocol Fee command
program
  .command("update-gateway-protocol-fee")
  .description("Update custom protocol fee settings for a payment gateway")
  .requiredOption("-a, --authority <pubkey>", "Gateway authority public key")
  .requiredOption(
    "-u, --use-custom <boolean>",
    "Use custom protocol fee (true/false)"
  )
  .requiredOption(
    "-f, --custom-fee-bps <number>",
    "Custom protocol fee in basis points (0-10000)"
  )
  .option(
    "--admin-keypath <path>",
    "Path to admin keypair file (required for protocol fee updates)"
  )
  .action(async (options) => {
    try {
      const connection = new Connection(program.opts().connectionUrl);
      const authority = new PublicKey(options.authority);
      const useCustomProtocolFee = options.useCustom.toLowerCase() === "true";
      const customProtocolFeeBps = parseInt(options.customFeeBps);

      if (!options.adminKeypath) {
        throw new Error("Admin keypair is required for protocol fee updates");
      }

      const adminKeypair = readKeypairFromFile(options.adminKeypath);
      const sdk = new TributarySDK(connection, new anchor.Wallet(adminKeypair));

      const instruction = await sdk.updateGatewayProtocolFee(
        authority,
        useCustomProtocolFee,
        customProtocolFeeBps
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await connection.sendTransaction(tx, [adminKeypair]);

      console.log("Gateway protocol fee settings updated successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error updating gateway protocol fee:", error);
      process.exit(1);
    }
  });

program.parse();
