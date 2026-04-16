import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";
import { Tributary, PaymentFrequency, encodeMemo } from "@tributary-so/sdk";

const isAgent = !!process.env.NO_DNA;

interface WalletConfig {
  connectionUrl: string;
  keypath: string;
}

function readKeypairFromFile(filePath: string): Keypair {
  try {
    const resolvedPath = path.resolve(filePath);
    const jsonContent = fs.readFileSync(resolvedPath, "ascii");
    const secretKeyArray = JSON.parse(jsonContent);
    const secretKeyBuffer = new Uint8Array(secretKeyArray);
    return Keypair.fromSecretKey(secretKeyBuffer);
  } catch (error) {
    throw new Error(`Failed to read keypair from ${filePath}: ${error}`);
  }
}

function createSDK(config: WalletConfig): {
  sdk: Tributary;
  wallet: anchor.Wallet;
  connection: Connection;
} {
  const connection = new Connection(config.connectionUrl);
  let keypair: Keypair;
  try {
    keypair = readKeypairFromFile(config.keypath);
  } catch {
    throw new Error(
      `Keypair not found at ${config.keypath}. This command requires a keypair. Run 'tributary wallet create' to generate one.`
    );
  }
  const wallet = new anchor.Wallet(keypair);
  const sdk = new Tributary(connection, wallet);
  return { sdk, wallet, connection };
}

function getDefaultConfig(): WalletConfig {
  return {
    connectionUrl: process.env.SOLANA_API || "https://api.devnet.solana.com",
    keypath: process.env.KEY_PATH || "keypair.json",
  };
}

function parsePublicKey(input: string): PublicKey | null {
  try {
    return new PublicKey(input.trim());
  } catch {
    return null;
  }
}

function formatDate(timestamp: BN | number): string {
  const ts = BN.isBN(timestamp) ? timestamp.toNumber() : timestamp;
  return new Date(ts * 1000).toISOString();
}

function output(data: unknown): void {
  if (isAgent) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

function outputError(message: string, details?: Record<string, unknown>): void {
  if (isAgent) {
    console.error(JSON.stringify({ error: message, ...details }));
  } else {
    console.error(`Error: ${message}`);
  }
}

async function runCliMode(args: string[]): Promise<void> {
  const config = getDefaultConfig();

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "-c" || arg === "--connection-url") {
      config.connectionUrl = args[++i];
    } else if (arg === "-k" || arg === "--keypath") {
      config.keypath = args[++i];
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      return;
    } else {
      break;
    }
    i++;
  }

  const command = args[i];
  const subcommand = args[i + 1];
  const remainingArgs = args.slice(i + 2);
  const { options, positional } = parseOptionsWithPositional(remainingArgs);

  if (command === "wallet") {
    try {
      await handleWalletCommand(subcommand, options, positional, config);
      return;
    } catch (error) {
      outputError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  let sdk: Tributary;
  try {
    const result = createSDK(config);
    sdk = result.sdk;
  } catch (error) {
    outputError("Failed to initialize SDK", {
      details: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }

  try {
    switch (command) {
      case "program":
        await handleProgramCommand(subcommand, options, sdk);
        break;
      case "user":
        await handleUserCommand(subcommand, options, sdk);
        break;
      case "gateway":
        await handleGatewayCommand(subcommand, options, sdk);
        break;
      case "subscription":
        await handleSubscriptionCommand(subcommand, options, sdk);
        break;
      case "payments":
        await handlePaymentsCommand(subcommand, options, sdk);
        break;
      case "referral":
        await handleReferralCommand(subcommand, options, sdk);
        break;
      case "pda":
        await handlePdaCommand(subcommand, options, sdk);
        break;
      default:
        outputError(`Unknown command: ${command}`, {
          command,
          availableCommands: [
            "wallet",
            "program",
            "user",
            "gateway",
            "subscription",
            "payments",
            "referral",
            "pda",
          ],
        });
        if (!isAgent) printHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function parseOptionsWithPositional(args: string[]): {
  options: Record<string, string | boolean>;
  positional: string[];
} {
  const options: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-/g, "");
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        options[key] = args[++i];
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        options[key] = args[++i];
      } else {
        options[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { options, positional };
}

function printHelp(): void {
  const helpData = {
    name: "tributary-cli",
    version: "1.0.0",
    description: "Tributary CLI - Automated recurring payments on Solana",
    globalOptions: {
      "-c, --connection-url": "Solana RPC connection URL",
      "-k, --keypath": "Path to keypair file",
      "-h, --help": "Display help",
    },
    environment: {
      SOLANA_API: "RPC connection URL (default: https://api.devnet.solana.com)",
      KEY_PATH: "Key path (default: keypair.json)",
      NO_DNA: "When set, output JSON and disable interactive features",
    },
    commands: {
      wallet: {
        description: "Wallet management",
        subcommands: {
          create: { args: "[output]", desc: "Generate new keypair" },
          import: { args: "<path>", desc: "Import existing keypair" },
          address: { args: "", desc: "Show public key" },
          balance: { args: "[--token-mint]", desc: "Show balances" },
        },
      },
      program: {
        description: "Protocol configuration",
        subcommands: {
          initialize: {
            args: "[--admin]",
            desc: "Initialize program (admin only)",
          },
          config: { args: "", desc: "Get program config PDA" },
        },
      },
      user: {
        description: "User Payment accounts",
        subcommands: {
          create: {
            args: "[--token-mint]",
            desc: "Create user payment account",
          },
          list: { args: "", desc: "List user payment accounts" },
          show: { args: "[--user-payment]", desc: "Show user payment details" },
        },
      },
      gateway: {
        description: "Payment gateway management",
        subcommands: {
          create: { args: "[options]", desc: "Create payment gateway" },
          delete: { args: "[--authority]", desc: "Delete payment gateway" },
          list: { args: "", desc: "List all payment gateways" },
          show: { args: "[--gateway]", desc: "Show gateway details" },
          signer: { args: "[options]", desc: "Change gateway signer" },
          "fee-recipient": { args: "[options]", desc: "Change fee recipient" },
          "fee-bps": { args: "[options]", desc: "Change gateway fee BPS" },
        },
      },
      subscription: {
        description: "Subscription payment policies",
        subcommands: {
          create: { args: "[options]", desc: "Create subscription policy" },
          list: { args: "[options]", desc: "List payment policies" },
          show: { args: "[policy]", desc: "Show payment policy details" },
          pause: { args: "[options]", desc: "Pause payment policy" },
          resume: { args: "[options]", desc: "Resume payment policy" },
          delete: { args: "[options]", desc: "Delete payment policy" },
        },
      },
      payments: {
        description: "Payment execution",
        subcommands: {
          execute: { args: "[options]", desc: "Execute a payment" },
        },
      },
      referral: {
        description: "Referral system",
        subcommands: {
          create: { args: "[options]", desc: "Create referral account" },
          show: { args: "[options]", desc: "Show referral by code" },
          "show-owner": { args: "[options]", desc: "Show referral by owner" },
          chain: { args: "[options]", desc: "Show referral chain" },
        },
      },
      pda: {
        description: "PDA utilities",
        subcommands: {
          config: { args: "", desc: "Get program config PDA" },
          gateway: { args: "[--authority]", desc: "Get gateway PDA" },
          "user-payment": { args: "[options]", desc: "Get user payment PDA" },
          "payment-policy": {
            args: "[options]",
            desc: "Get payment policy PDA",
          },
          delegate: { args: "", desc: "Get payments delegate PDA" },
        },
      },
    },
  };

  if (isAgent) {
    console.log(JSON.stringify(helpData, null, 2));
    return;
  }

  console.log(`
tributary-cli — Tributary CLI v1.0.0

Global options:
  -c, --connection-url <url>    Solana RPC connection URL
  -k, --keypath <path>          Path to keypair file
  -h, --help                    Display help

Environment:
  SOLANA_API                    RPC connection URL (default: https://api.devnet.solana.com)
  KEY_PATH                      Key path (default: keypair.json)
  NO_DNA                        When set, output JSON and disable interactive features

Commands:
  wallet              Wallet management
    create [output]               Generate new keypair
    import <path>                 Import existing keypair
    address                       Show public key
    balance [--token-mint]        Show balances

  program             Protocol configuration
    initialize [--admin]          Initialize program (admin only)
    config                        Get program config PDA

  user                User Payment accounts
    create [--token-mint]         Create user payment account
    list                          List user payment accounts
    show [--user-payment]         Show user payment details

  gateway             Payment gateway management
    create [options]              Create payment gateway
    delete [--authority]          Delete payment gateway
    list                          List all payment gateways
    show [--gateway]              Show gateway details
    signer [options]              Change gateway signer
    fee-recipient [options]       Change fee recipient
    fee-bps [options]             Change gateway fee BPS

  subscription        Subscription payment policies
    create [options]              Create subscription policy
    list [options]                List payment policies
    show [policy]                 Show payment policy details
    pause [options]               Pause payment policy
    resume [options]              Resume payment policy
    delete [options]              Delete payment policy

  payments            Payment execution
    execute [options]             Execute a payment

  referral            Referral system
    create [options]              Create referral account
    show [options]                Show referral by code
    show-owner [options]          Show referral by owner
    chain [options]               Show referral chain

  pda                 PDA utilities
    config                        Get program config PDA
    gateway [--authority]         Get gateway PDA
    user-payment [options]        Get user payment PDA
    payment-policy [options]      Get payment policy PDA
    delegate                      Get payments delegate PDA
`);
}

async function handleWalletCommand(
  subcommand: string,
  options: Record<string, unknown>,
  positional: string[],
  config: WalletConfig
): Promise<void> {
  switch (subcommand) {
    case "create": {
      const outputPath =
        (options.output as string) || positional[0] || "keypair.json";
      const newKeypair = Keypair.generate();
      fs.writeFileSync(
        outputPath,
        JSON.stringify(Array.from(newKeypair.secretKey))
      );
      output({
        success: true,
        command: "wallet create",
        publicKey: newKeypair.publicKey.toString(),
        path: outputPath,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "import": {
      const importPath = positional[0];
      if (!importPath) throw new Error("Import path required");
      const keypair = readKeypairFromFile(importPath);
      output({
        success: true,
        command: "wallet import",
        publicKey: keypair.publicKey.toString(),
        path: importPath,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "address": {
      const keypair = readKeypairFromFile(config.keypath);
      output({
        success: true,
        command: "wallet address",
        publicKey: keypair.publicKey.toString(),
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "balance": {
      const connection = new Connection(config.connectionUrl);
      const keypair = readKeypairFromFile(config.keypath);
      const balance = await connection.getBalance(keypair.publicKey);
      output({
        success: true,
        command: "wallet balance",
        publicKey: keypair.publicKey.toString(),
        balance: {
          lamports: balance,
          sol: balance / 1e9,
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    default:
      throw new Error(`Unknown wallet subcommand: ${subcommand}`);
  }
}

async function handleProgramCommand(
  subcommand: string,
  options: Record<string, unknown>,
  sdk: Tributary
): Promise<void> {
  switch (subcommand) {
    case "initialize": {
      const adminPubkey = parsePublicKey(
        (options.admin as string) || sdk.provider.publicKey.toString()
      );
      if (!adminPubkey) throw new Error("Invalid admin public key");
      const instruction = await sdk.initialize(adminPubkey);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "program initialize",
        admin: adminPubkey.toString(),
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "config": {
      const pda = sdk.getConfigPda();
      output({
        success: true,
        command: "program config",
        pda: {
          address: pda.address.toString(),
          bump: pda.bump,
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    default:
      throw new Error(`Unknown program subcommand: ${subcommand}`);
  }
}

async function handleUserCommand(
  subcommand: string,
  options: Record<string, unknown>,
  sdk: Tributary
): Promise<void> {
  switch (subcommand) {
    case "create": {
      const tokenMint = parsePublicKey(options.tokenmint as string);
      if (!tokenMint) throw new Error("Invalid token mint");
      const instruction = await sdk.createUserPayment(tokenMint);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "user create",
        tokenMint: tokenMint.toString(),
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "list": {
      const users = await sdk.getAllUserPayments();
      output({
        success: true,
        command: "user list",
        count: users.length,
        users: users.map((u) => ({
          publicKey: u.publicKey.toString(),
          owner: u.account.owner.toString(),
          activePolicies: u.account.activePoliciesCount,
          totalPolicies: u.account.createdPoliciesCount,
        })),
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "show": {
      const userPaymentPubkey = parsePublicKey(options.userpayment as string);
      if (!userPaymentPubkey) throw new Error("Invalid user payment pubkey");
      const userPayment = await sdk.getUserPayment(userPaymentPubkey);
      if (!userPayment) throw new Error("User payment not found");
      output({
        success: true,
        command: "user show",
        userPayment: {
          publicKey: userPaymentPubkey.toString(),
          owner: userPayment.owner.toString(),
          tokenMint: userPayment.tokenMint.toString(),
          tokenAccount: userPayment.tokenAccount.toString(),
          activePolicies: userPayment.activePoliciesCount,
          totalPolicies: userPayment.createdPoliciesCount,
          createdAt: formatDate(userPayment.createdAt),
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    default:
      throw new Error(`Unknown user subcommand: ${subcommand}`);
  }
}

async function handleGatewayCommand(
  subcommand: string,
  options: Record<string, unknown>,
  sdk: Tributary
): Promise<void> {
  switch (subcommand) {
    case "create": {
      const authority = parsePublicKey(options.authority as string);
      const feeBps = parseInt(options.feebps as string);
      const feeRecipient = parsePublicKey(options.feerecipient as string);
      const name = (options.name as string) || "Unnamed Gateway";
      const url = (options.url as string) || "";
      if (!authority || !feeRecipient)
        throw new Error("Invalid authority or fee recipient");
      const instruction = await sdk.createPaymentGateway(
        authority,
        feeBps,
        feeRecipient,
        name,
        url
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "gateway create",
        authority: authority.toString(),
        feeBps,
        feeRecipient: feeRecipient.toString(),
        name,
        url,
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "delete": {
      const authority = parsePublicKey(options.authority as string);
      if (!authority) throw new Error("Invalid authority");
      const instruction = await sdk.deletePaymentGateway(authority);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "gateway delete",
        authority: authority.toString(),
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "list": {
      const gateways = await sdk.getAllPaymentGateway();
      output({
        success: true,
        command: "gateway list",
        count: gateways.length,
        gateways: gateways.map((gw) => ({
          publicKey: gw.publicKey.toString(),
          name: String.fromCharCode(...gw.account.name).replace(/\0/g, ""),
          authority: gw.account.authority.toString(),
          feeBps: gw.account.gatewayFeeBps,
          active: gw.account.isActive,
        })),
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "show": {
      const gatewayPubkey = parsePublicKey(options.gateway as string);
      if (!gatewayPubkey) throw new Error("Invalid gateway pubkey");
      const gateway = await sdk.getPaymentGateway(gatewayPubkey);
      if (!gateway) throw new Error("Gateway not found");
      output({
        success: true,
        command: "gateway show",
        gateway: {
          publicKey: gatewayPubkey.toString(),
          authority: gateway.authority.toString(),
          feeRecipient: gateway.feeRecipient.toString(),
          feeBps: gateway.gatewayFeeBps,
          featureFlags: gateway.featureFlags,
          active: gateway.isActive,
          name: String.fromCharCode(...gateway.name).replace(/\0/g, ""),
          url: String.fromCharCode(...gateway.url).replace(/\0/g, ""),
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "signer": {
      const authority = parsePublicKey(options.authority as string);
      const newSigner = parsePublicKey(options.newsigner as string);
      if (!authority || !newSigner)
        throw new Error("Invalid authority or signer");
      const instruction = await sdk.changeGatewaySigner(authority, newSigner);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "gateway signer",
        authority: authority.toString(),
        newSigner: newSigner.toString(),
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "fee-recipient": {
      const authority = parsePublicKey(options.authority as string);
      const newRecipient = parsePublicKey(options.newrecipient as string);
      if (!authority || !newRecipient)
        throw new Error("Invalid authority or recipient");
      const instruction = await sdk.changeGatewayFeeRecipient(
        authority,
        newRecipient
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "gateway fee-recipient",
        authority: authority.toString(),
        newRecipient: newRecipient.toString(),
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "fee-bps": {
      const authority = parsePublicKey(options.authority as string);
      const feeBps = parseInt(options.feebps as string);
      if (!authority) throw new Error("Invalid authority");
      const instruction = await sdk.changeGatewayFeeBps(authority, feeBps);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "gateway fee-bps",
        authority: authority.toString(),
        feeBps,
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    default:
      throw new Error(`Unknown gateway subcommand: ${subcommand}`);
  }
}

async function handleSubscriptionCommand(
  subcommand: string,
  options: Record<string, unknown>,
  sdk: Tributary
): Promise<void> {
  switch (subcommand) {
    case "create": {
      const tokenMint = parsePublicKey(options.tokenmint as string);
      const recipient = parsePublicKey(options.recipient as string);
      const gateway = parsePublicKey(options.gateway as string);
      const amount = new BN(options.amount as string);
      const frequency = (options.frequency as string) || "monthly";
      const autoRenew = options.autorenew !== "false";
      const maxRenewals = options.maxrenewals
        ? parseInt(options.maxrenewals as string)
        : null;
      const memo = options.memo
        ? encodeMemo(options.memo as string, 64)
        : new Array(64).fill(0);

      if (!tokenMint || !recipient || !gateway)
        throw new Error("Invalid parameters");

      const paymentFrequency: PaymentFrequency = {
        [frequency]: {},
      } as unknown as PaymentFrequency;
      const instructions = await sdk.createSubscription(
        tokenMint,
        recipient,
        gateway,
        amount,
        autoRenew,
        maxRenewals,
        paymentFrequency,
        memo
      );
      const tx = new anchor.web3.Transaction();
      instructions.forEach((ix) => tx.add(ix));
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "subscription create",
        tokenMint: tokenMint.toString(),
        recipient: recipient.toString(),
        gateway: gateway.toString(),
        amount: amount.toString(),
        frequency,
        autoRenew,
        maxRenewals,
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "list": {
      const owner = options.owner
        ? parsePublicKey(options.owner as string)
        : null;
      if (owner) {
        const userPayments = await sdk.getAllUserPaymentsByOwner(owner);
        const results = [];
        for (const up of userPayments) {
          const policies = await sdk.getPaymentPoliciesByUserPayment(
            up.publicKey
          );
          results.push({
            userPayment: up.publicKey.toString(),
            policies: policies.map((p) => ({
              policyId: p.account.policyId,
              status: Object.keys(p.account.status)[0],
            })),
          });
        }
        output({
          success: true,
          command: "subscription list",
          filter: { owner: owner.toString() },
          userPaymentsCount: userPayments.length,
          userPayments: results,
          timestamp: new Date().toISOString(),
        });
      } else {
        const policies = await sdk.getAllPaymentPolicies();
        output({
          success: true,
          command: "subscription list",
          count: policies.length,
          policies: policies.map((p) => ({
            publicKey: p.publicKey.toString(),
            status: Object.keys(p.account.status)[0],
          })),
          timestamp: new Date().toISOString(),
        });
      }
      break;
    }
    case "pause": {
      const tokenMint = parsePublicKey(options.tokenmint as string);
      const policyId = parseInt(options.policyid as string);
      if (!tokenMint) throw new Error("Invalid token mint");
      const instruction = await sdk.changePaymentPolicyStatus(
        tokenMint,
        policyId,
        { paused: {} }
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "subscription pause",
        tokenMint: tokenMint.toString(),
        policyId,
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "resume": {
      const tokenMint = parsePublicKey(options.tokenmint as string);
      const policyId = parseInt(options.policyid as string);
      if (!tokenMint) throw new Error("Invalid token mint");
      const instruction = await sdk.changePaymentPolicyStatus(
        tokenMint,
        policyId,
        { active: {} }
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "subscription resume",
        tokenMint: tokenMint.toString(),
        policyId,
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "delete": {
      const tokenMint = parsePublicKey(options.tokenmint as string);
      const policyId = parseInt(options.policyid as string);
      if (!tokenMint) throw new Error("Invalid token mint");
      const instruction = await sdk.deletePaymentPolicy(tokenMint, policyId);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "subscription delete",
        tokenMint: tokenMint.toString(),
        policyId,
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    default:
      throw new Error(`Unknown subscription subcommand: ${subcommand}`);
  }
}

async function handlePaymentsCommand(
  subcommand: string,
  options: Record<string, unknown>,
  sdk: Tributary
): Promise<void> {
  switch (subcommand) {
    case "execute": {
      const policyPubkey =
        parsePublicKey(options.policy as string) ||
        parsePublicKey(options.userpayment as string);
      if (!policyPubkey)
        throw new Error("Invalid policy or user payment pubkey");
      const instructions = await sdk.executePayment(policyPubkey);
      const tx = new anchor.web3.Transaction();
      instructions.forEach((ix) => tx.add(ix));
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "payments execute",
        policy: policyPubkey.toString(),
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    default:
      throw new Error(`Unknown payments subcommand: ${subcommand}`);
  }
}

async function handleReferralCommand(
  subcommand: string,
  options: Record<string, unknown>,
  sdk: Tributary
): Promise<void> {
  switch (subcommand) {
    case "create": {
      const gateway = parsePublicKey(options.gateway as string);
      const code =
        (options.code as string) ||
        Math.random().toString(36).substring(2, 8).toUpperCase();
      const referrer = options.referrer
        ? parsePublicKey(options.referrer as string) ?? undefined
        : undefined;
      if (!gateway) throw new Error("Invalid gateway");
      const instruction = await sdk.createReferralAccount(
        gateway,
        code,
        referrer
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      output({
        success: true,
        command: "referral create",
        gateway: gateway.toString(),
        code,
        referrer: referrer?.toString(),
        transaction: signature,
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "show": {
      const gateway = parsePublicKey(options.gateway as string);
      const code = options.code as string;
      if (!gateway || !code) throw new Error("Gateway and code required");
      const referral = await sdk.getReferralAccountByCode(gateway, code);
      if (!referral) throw new Error("Referral not found");
      output({
        success: true,
        command: "referral show",
        referral: {
          code: String.fromCharCode(...referral.referralCode),
          owner: referral.owner.toString(),
          gateway: referral.gateway.toString(),
          referrer: referral.referrer.toString(),
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "show-owner": {
      const gateway = parsePublicKey(options.gateway as string);
      const owner = parsePublicKey(options.owner as string);
      if (!gateway || !owner) throw new Error("Gateway and owner required");
      const referral = await sdk.getReferralAccountByOwner(gateway, owner);
      if (!referral) throw new Error("Referral not found");
      output({
        success: true,
        command: "referral show-owner",
        referral: {
          code: String.fromCharCode(...referral.referralCode),
          owner: referral.owner.toString(),
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "chain": {
      const gateway = parsePublicKey(options.gateway as string);
      const owner = parsePublicKey(options.owner as string);
      if (!gateway || !owner) throw new Error("Gateway and owner required");
      const chain = await sdk.getReferralChain(owner, gateway);
      output({
        success: true,
        command: "referral chain",
        owner: owner.toString(),
        chain: {
          L1: chain[0]?.toString() || null,
          L2: chain[1]?.toString() || null,
          L3: chain[2]?.toString() || null,
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    default:
      throw new Error(`Unknown referral subcommand: ${subcommand}`);
  }
}

async function handlePdaCommand(
  subcommand: string,
  options: Record<string, unknown>,
  sdk: Tributary
): Promise<void> {
  switch (subcommand) {
    case "config": {
      const pda = sdk.getConfigPda();
      output({
        success: true,
        command: "pda config",
        pda: {
          type: "config",
          address: pda.address.toString(),
          bump: pda.bump,
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "gateway": {
      const authority = parsePublicKey(options.authority as string);
      if (!authority) throw new Error("Invalid authority");
      const pda = sdk.getGatewayPda(authority);
      output({
        success: true,
        command: "pda gateway",
        pda: {
          type: "gateway",
          address: pda.address.toString(),
          bump: pda.bump,
          authority: authority.toString(),
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "user-payment": {
      const user = parsePublicKey(options.user as string);
      const tokenMint = parsePublicKey(options.tokenmint as string);
      if (!user || !tokenMint) throw new Error("Invalid user or token mint");
      const pda = sdk.getUserPaymentPda(user, tokenMint);
      output({
        success: true,
        command: "pda user-payment",
        pda: {
          type: "user-payment",
          address: pda.address.toString(),
          bump: pda.bump,
          user: user.toString(),
          tokenMint: tokenMint.toString(),
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "payment-policy": {
      const userPayment = parsePublicKey(options.userpayment as string);
      const policyId = parseInt(options.policyid as string);
      if (!userPayment) throw new Error("Invalid user payment");
      const pda = sdk.getPaymentPolicyPda(userPayment, policyId);
      output({
        success: true,
        command: "pda payment-policy",
        pda: {
          type: "payment-policy",
          address: pda.address.toString(),
          bump: pda.bump,
          userPayment: userPayment.toString(),
          policyId,
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    case "delegate": {
      const pda = sdk.getPaymentsDelegatePda();
      output({
        success: true,
        command: "pda delegate",
        pda: {
          type: "delegate",
          address: pda.address.toString(),
          bump: pda.bump,
        },
        timestamp: new Date().toISOString(),
      });
      break;
    }
    default:
      throw new Error(`Unknown pda subcommand: ${subcommand}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  await runCliMode(args);
}

main().catch((err) => {
  outputError("Fatal error", {
    details: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
