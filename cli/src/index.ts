#!/usr/bin/env node

import { Command } from "commander";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import {
  RecurringPaymentsSDK,
  type PolicyType,
  type PaymentFrequency,
  createMemoBuffer,
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

function createSDK(
  connectionUrl: string,
  keypath: string
): RecurringPaymentsSDK {
  const connection = new Connection(connectionUrl);
  const keypair = readKeypairFromFile(keypath);
  const wallet = new anchor.Wallet(keypair);
  return new RecurringPaymentsSDK(connection, wallet);
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

      const sdk = new RecurringPaymentsSDK(
        connection,
        new anchor.Wallet(adminKeypair)
      );

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

// Create Payment Policy command
program
  .command("create-policy")
  .description("Create a payment policy")
  .requiredOption("-t, --token-mint <pubkey>", "Token mint public key")
  .requiredOption("-r, --recipient <pubkey>", "Payment recipient public key")
  .requiredOption("-g, --gateway <pubkey>", "Payment gateway public key")
  .requiredOption(
    "-a, --amount <number>",
    "Payment amount (in token base units)"
  )
  .requiredOption("-i, --interval <number>", "Payment interval in seconds")
  .option("-m, --memo <string>", "Payment memo", "")
  .option("--auto-renew", "Enable auto-renewal", true)
  .option("--max-renewals <number>", "Maximum number of renewals")
  .option(
    "-f, --frequency <string>",
    "Payment frequency (daily|weekly|monthly|quarterly|semiAnnually|annually)",
    "daily"
  )
  .action(async (options) => {
    try {
      const sdk = createSDK(
        program.opts().connectionUrl,
        program.opts().keypath
      );
      const tokenMint = new PublicKey(options.tokenMint);
      const recipient = new PublicKey(options.recipient);
      const gateway = new PublicKey(options.gateway);

      // Create policy type
      const policyType: PolicyType = {
        subscription: {
          amount: new anchor.BN(options.amount),
          intervalSeconds: new anchor.BN(options.interval),
          autoRenew: options.autoRenew,
          maxRenewals: options.maxRenewals
            ? parseInt(options.maxRenewals)
            : null,
          padding: Array(8).fill(new anchor.BN(0)),
        },
      };

      // Create payment frequency
      const paymentFrequency: PaymentFrequency = {
        [options.frequency]: {},
      } as PaymentFrequency;

      // Create memo
      const memo = createMemoBuffer(options.memo);

      const instruction = await sdk.createPaymentPolicy(
        tokenMint,
        recipient,
        gateway,
        policyType,
        paymentFrequency,
        memo
      );

      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);

      console.log("Payment policy created successfully!");
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Error creating payment policy:", error);
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
        console.log(
          `Fee Recipient: ${gateway.account.feeRecipient.toString()}`
        );
        console.log(`Fee BPS: ${gateway.account.gatewayFeeBps}`);
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
        console.log(`Total Processed: ${gateway.account.totalProcessed}`);
        console.log(
          `Created At: ${new Date(
            gateway.account.createdAt * 1000
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
      for (const userPayment of userPayments) {
        const policies = await sdk.getPaymentPoliciesByUser(
          userPayment.publicKey
        );

        // Group by userPayment
        const grouped: Record<
          string,
          Array<{ publicKey: PublicKey; account: any }>
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
          for (const policy of grouped[userPaymentStr]) {
            console.log(
              `  Policy ${policy.account.policyId}: Status ${
                Object.keys(policy.account.status)[0]
              }, Recipient ${policy.account.recipient.toString()}`
            );
          }
        }
      }
    } catch (error) {
      console.error("Error listing policies:", error);
      process.exit(1);
    }
  });

program.parse();
