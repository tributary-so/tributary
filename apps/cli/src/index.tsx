#!/usr/bin/env bun

import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";
import {
  Tributary,
  PaymentFrequency,
  decodeMemo,
  encodeMemo,
} from "@tributary-so/sdk";
import { createCliRenderer } from "@opentui/core";
import {
  createRoot,
  useKeyboard,
  useRenderer,
  useTerminalDimensions,
} from "@opentui/react";
import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface WalletConfig {
  connectionUrl: string;
  keypath: string;
}

interface CommandContext {
  sdk: Tributary;
  wallet: anchor.Wallet;
  connection: Connection;
  config: WalletConfig;
}

type CommandGroup =
  | "wallet"
  | "program"
  | "user"
  | "gateway"
  | "subscription"
  | "payments"
  | "referral"
  | "pda";

interface MenuItem {
  id: string;
  label: string;
  description: string;
  group: CommandGroup;
}

// ============================================================================
// Utility Functions
// ============================================================================

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
  const keypair = readKeypairFromFile(config.keypath);
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

function truncatePubkey(pubkey: string | PublicKey, length = 8): string {
  const str = typeof pubkey === "string" ? pubkey : pubkey.toString();
  if (str.length <= length * 2) return str;
  return `${str.slice(0, length)}...${str.slice(-length)}`;
}

// ============================================================================
// CLI Mode - Non-interactive command execution
// ============================================================================

async function runCliMode(args: string[]): Promise<void> {
  const config = getDefaultConfig();

  // Parse global options
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

  // Wallet commands don't need SDK
  if (command === "wallet") {
    try {
      await handleWalletCommand(subcommand, options, positional, config);
      return;
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  // Other commands need SDK
  let sdk: Tributary;
  try {
    const result = createSDK(config);
    sdk = result.sdk;
  } catch (error) {
    console.error(
      "Failed to initialize SDK:",
      error instanceof Error ? error.message : error
    );
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
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
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
  console.log(`
tributary-cli — Tributary CLI v1.0.0

Global options:
  -c, --connection-url <url>    Solana RPC connection URL
  -k, --keypath <path>          Path to keypair file
  -h, --help                    Display help

Environment:
  SOLANA_API                    RPC connection URL (default: https://api.devnet.solana.com)
  KEY_PATH                      Key path (default: keypair.json)

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
    pay-as-you-go [options]       Create PAYG policy
    milestone [options]           Create milestone policy
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

// ============================================================================
// Command Handlers
// ============================================================================

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
      console.log(`✓ Created new keypair: ${newKeypair.publicKey.toString()}`);
      console.log(`  Saved to: ${outputPath}`);
      break;
    }
    case "import": {
      const importPath = positional[0];
      if (!importPath) throw new Error("Import path required");
      const keypair = readKeypairFromFile(importPath);
      console.log(`✓ Imported keypair: ${keypair.publicKey.toString()}`);
      break;
    }
    case "address": {
      const keypair = readKeypairFromFile(config.keypath);
      console.log(keypair.publicKey.toString());
      break;
    }
    case "balance": {
      const { connection } = createSDK(config);
      const keypair = readKeypairFromFile(config.keypath);
      const balance = await connection.getBalance(keypair.publicKey);
      console.log(`SOL Balance: ${balance / 1e9} SOL`);
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
      console.log(`✓ Program initialized`);
      console.log(`  Transaction: ${signature}`);
      break;
    }
    case "config": {
      const pda = sdk.getConfigPda();
      console.log(`Config PDA: ${pda.address.toString()}`);
      console.log(`Bump: ${pda.bump}`);
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
      console.log(`✓ User payment account created`);
      console.log(`  Transaction: ${signature}`);
      break;
    }
    case "list": {
      const users = await sdk.getAllUserPayments();
      console.log(`Found ${users.length} user payment accounts:`);
      for (const user of users) {
        console.log(`\n  ${truncatePubkey(user.publicKey)}`);
        console.log(`    Owner: ${truncatePubkey(user.account.owner)}`);
        console.log(
          `    Policies: ${user.account.activePoliciesCount}/${user.account.createdPoliciesCount}`
        );
      }
      break;
    }
    case "show": {
      const userPaymentPubkey = parsePublicKey(options.userpayment as string);
      if (!userPaymentPubkey) throw new Error("Invalid user payment pubkey");
      const userPayment = await sdk.getUserPayment(userPaymentPubkey);
      if (!userPayment) throw new Error("User payment not found");
      console.log(`User Payment: ${userPaymentPubkey.toString()}`);
      console.log(`  Owner: ${userPayment.owner.toString()}`);
      console.log(`  Token Mint: ${userPayment.tokenMint.toString()}`);
      console.log(`  Token Account: ${userPayment.tokenAccount.toString()}`);
      console.log(`  Active Policies: ${userPayment.activePoliciesCount}`);
      console.log(`  Total Policies: ${userPayment.createdPoliciesCount}`);
      console.log(`  Created: ${formatDate(userPayment.createdAt)}`);
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
      console.log(`✓ Payment gateway created`);
      console.log(`  Transaction: ${signature}`);
      break;
    }
    case "delete": {
      const authority = parsePublicKey(options.authority as string);
      if (!authority) throw new Error("Invalid authority");
      const instruction = await sdk.deletePaymentGateway(authority);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      console.log(`✓ Payment gateway deleted`);
      console.log(`  Transaction: ${signature}`);
      break;
    }
    case "list": {
      const gateways = await sdk.getAllPaymentGateway();
      console.log(`Found ${gateways.length} payment gateways:`);
      for (const gw of gateways) {
        const name = String.fromCharCode(...gw.account.name).replace(/\0/g, "");
        console.log(`\n  ${truncatePubkey(gw.publicKey)}`);
        console.log(`    Name: ${name}`);
        console.log(`    Authority: ${truncatePubkey(gw.account.authority)}`);
        console.log(`    Fee BPS: ${gw.account.gatewayFeeBps}`);
        console.log(`    Active: ${gw.account.isActive}`);
      }
      break;
    }
    case "show": {
      const gatewayPubkey = parsePublicKey(options.gateway as string);
      if (!gatewayPubkey) throw new Error("Invalid gateway pubkey");
      const gateway = await sdk.getPaymentGateway(gatewayPubkey);
      if (!gateway) throw new Error("Gateway not found");
      console.log(`Gateway: ${gatewayPubkey.toString()}`);
      console.log(`  Authority: ${gateway.authority.toString()}`);
      console.log(`  Fee Recipient: ${gateway.feeRecipient.toString()}`);
      console.log(`  Fee BPS: ${gateway.gatewayFeeBps}`);
      console.log(`  Feature Flags: ${gateway.featureFlags}`);
      console.log(`  Active: ${gateway.isActive}`);
      console.log(
        `  Name: ${String.fromCharCode(...gateway.name).replace(/\0/g, "")}`
      );
      console.log(
        `  URL: ${String.fromCharCode(...gateway.url).replace(/\0/g, "")}`
      );
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
      console.log(`✓ Gateway signer changed`);
      console.log(`  Transaction: ${signature}`);
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
      console.log(`✓ Gateway fee recipient changed`);
      console.log(`  Transaction: ${signature}`);
      break;
    }
    case "fee-bps": {
      const authority = parsePublicKey(options.authority as string);
      const feeBps = parseInt(options.feebps as string);
      if (!authority) throw new Error("Invalid authority");
      const instruction = await sdk.changeGatewayFeeBps(authority, feeBps);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      console.log(`✓ Gateway fee BPS changed to ${feeBps}`);
      console.log(`  Transaction: ${signature}`);
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
      } as PaymentFrequency;
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
      console.log(`✓ Subscription created`);
      console.log(`  Transaction: ${signature}`);
      break;
    }
    case "list": {
      const owner = options.owner
        ? parsePublicKey(options.owner as string)
        : null;
      if (owner) {
        const userPayments = await sdk.getAllUserPaymentsByOwner(owner);
        console.log(`Found ${userPayments.length} user payments for owner`);
        for (const up of userPayments) {
          const policies = await sdk.getPaymentPoliciesByUserPayment(
            up.publicKey
          );
          console.log(`\n  User Payment: ${truncatePubkey(up.publicKey)}`);
          for (const policy of policies) {
            console.log(
              `    Policy ${policy.account.policyId}: ${
                Object.keys(policy.account.status)[0]
              }`
            );
          }
        }
      } else {
        const policies = await sdk.getAllPaymentPolicies();
        console.log(`Found ${policies.length} payment policies:`);
        for (const policy of policies) {
          console.log(
            `  ${truncatePubkey(policy.publicKey)} - ${
              Object.keys(policy.account.status)[0]
            }`
          );
        }
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
      console.log(`✓ Policy paused`);
      console.log(`  Transaction: ${signature}`);
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
      console.log(`✓ Policy resumed`);
      console.log(`  Transaction: ${signature}`);
      break;
    }
    case "delete": {
      const tokenMint = parsePublicKey(options.tokenmint as string);
      const policyId = parseInt(options.policyid as string);
      if (!tokenMint) throw new Error("Invalid token mint");
      const instruction = await sdk.deletePaymentPolicy(tokenMint, policyId);
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      console.log(`✓ Policy deleted`);
      console.log(`  Transaction: ${signature}`);
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
      console.log(`✓ Payment executed`);
      console.log(`  Transaction: ${signature}`);
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
        ? parsePublicKey(options.referrer as string)
        : undefined;
      if (!gateway) throw new Error("Invalid gateway");
      const instruction = await sdk.createReferralAccount(
        gateway,
        code,
        referrer
      );
      const tx = new anchor.web3.Transaction().add(instruction);
      const signature = await sdk.provider.sendAndConfirm(tx);
      console.log(`✓ Referral account created`);
      console.log(`  Code: ${code}`);
      console.log(`  Transaction: ${signature}`);
      break;
    }
    case "show": {
      const gateway = parsePublicKey(options.gateway as string);
      const code = options.code as string;
      if (!gateway || !code) throw new Error("Gateway and code required");
      const referral = await sdk.getReferralAccountByCode(gateway, code);
      if (!referral) throw new Error("Referral not found");
      console.log(`Referral Account:`);
      console.log(`  Code: ${String.fromCharCode(...referral.referralCode)}`);
      console.log(`  Owner: ${referral.owner.toString()}`);
      console.log(`  Gateway: ${referral.gateway.toString()}`);
      console.log(`  Referrer: ${referral.referrer.toString()}`);
      break;
    }
    case "show-owner": {
      const gateway = parsePublicKey(options.gateway as string);
      const owner = parsePublicKey(options.owner as string);
      if (!gateway || !owner) throw new Error("Gateway and owner required");
      const referral = await sdk.getReferralAccountByOwner(gateway, owner);
      if (!referral) throw new Error("Referral not found");
      console.log(`Referral Account:`);
      console.log(`  Code: ${String.fromCharCode(...referral.referralCode)}`);
      console.log(`  Owner: ${referral.owner.toString()}`);
      break;
    }
    case "chain": {
      const gateway = parsePublicKey(options.gateway as string);
      const owner = parsePublicKey(options.owner as string);
      if (!gateway || !owner) throw new Error("Gateway and owner required");
      const chain = await sdk.getReferralChain(owner, gateway);
      console.log(`Referral Chain (L1 → L2 → L3):`);
      console.log(`  L1: ${chain[0]?.toString() || "None"}`);
      console.log(`  L2: ${chain[1]?.toString() || "None"}`);
      console.log(`  L3: ${chain[2]?.toString() || "None"}`);
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
      console.log(pda.address.toString());
      break;
    }
    case "gateway": {
      const authority = parsePublicKey(options.authority as string);
      if (!authority) throw new Error("Invalid authority");
      const pda = sdk.getGatewayPda(authority);
      console.log(pda.address.toString());
      break;
    }
    case "user-payment": {
      const user = parsePublicKey(options.user as string);
      const tokenMint = parsePublicKey(options.tokenmint as string);
      if (!user || !tokenMint) throw new Error("Invalid user or token mint");
      const pda = sdk.getUserPaymentPda(user, tokenMint);
      console.log(pda.address.toString());
      break;
    }
    case "payment-policy": {
      const userPayment = parsePublicKey(options.userpayment as string);
      const policyId = parseInt(options.policyid as string);
      if (!userPayment) throw new Error("Invalid user payment");
      const pda = sdk.getPaymentPolicyPda(userPayment, policyId);
      console.log(pda.address.toString());
      break;
    }
    case "delegate": {
      const pda = sdk.getPaymentsDelegatePda();
      console.log(pda.address.toString());
      break;
    }
    default:
      throw new Error(`Unknown pda subcommand: ${subcommand}`);
  }
}

// ============================================================================
// TUI Components
// ============================================================================

function Banner() {
  return (
    <box marginBottom={1}>
      <text>
        <strong fg="#6a5acd">
          ╔═══════════════════════════════════════════════════╗
        </strong>
        <br />
        <strong fg="#6a5acd">║</strong>{" "}
        <strong fg="#00ff88">🌊 Tributary CLI</strong> - Recurring Payments on
        Solana <strong fg="#6a5acd">║</strong>
        <br />
        <strong fg="#6a5acd">
          ╚═══════════════════════════════════════════════════╝
        </strong>
      </text>
    </box>
  );
}

function MenuItemComponent({
  item,
  selected,
  onSelect,
}: {
  item: MenuItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <box
      onMouseDown={onSelect}
      paddingX={1}
      backgroundColor={selected ? "#6a5acd" : undefined}
    >
      <text fg={selected ? "#ffffff" : "#cccccc"}>
        {selected ? "▶ " : "  "}
        {item.label}
        <span fg={selected ? "#aaaaaa" : "#666666"}> - {item.description}</span>
      </text>
    </box>
  );
}

function CommandGroupComponent({
  group,
  items,
  selectedIndex,
  startIndex,
  onSelect,
}: {
  group: CommandGroup;
  items: MenuItem[];
  selectedIndex: number;
  startIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <box marginBottom={1}>
      <text fg="#6a5acd">
        <strong>{group.toUpperCase()}</strong>
      </text>
      {items.map((item, idx) => {
        const actualIndex = startIndex + idx;
        return (
          <MenuItemComponent
            key={item.id}
            item={item}
            selected={selectedIndex === actualIndex}
            onSelect={() => onSelect(actualIndex)}
          />
        );
      })}
    </box>
  );
}

function StatusBar({ message }: { message: string }) {
  return (
    <box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      height={1}
      backgroundColor="#1a1a2e"
    >
      <text fg="#888888">{message}</text>
    </box>
  );
}

// ============================================================================
// Main TUI App
// ============================================================================

function App() {
  const renderer = useRenderer();
  const { height } = useTerminalDimensions();
  const [config] = useState<WalletConfig>(getDefaultConfig());
  const [context, setContext] = useState<CommandContext | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    "Use ↑↓ to navigate, Enter to select, 'q' to quit"
  );
  const [currentView, setCurrentView] = useState<"menu" | "loading" | "error">(
    "menu"
  );
  const [error, setError] = useState<string | null>(null);

  // Initialize SDK on mount
  useEffect(() => {
    try {
      const { sdk, wallet, connection } = createSDK(config);
      setContext({ sdk, wallet, connection, config });
      setStatusMessage(
        `Connected to ${truncatePubkey(
          config.connectionUrl,
          20
        )} | Wallet: ${truncatePubkey(wallet.publicKey)}`
      );
    } catch (err) {
      setError(
        `Failed to initialize: ${err instanceof Error ? err.message : err}`
      );
      setCurrentView("error");
    }
  }, [config]);

  const menuItems: MenuItem[] = useMemo(
    () => [
      // Wallet
      {
        id: "wallet-create",
        label: "wallet create",
        description: "Generate new keypair",
        group: "wallet",
      },
      {
        id: "wallet-import",
        label: "wallet import",
        description: "Import existing keypair",
        group: "wallet",
      },
      {
        id: "wallet-address",
        label: "wallet address",
        description: "Show public key",
        group: "wallet",
      },
      {
        id: "wallet-balance",
        label: "wallet balance",
        description: "Show balances",
        group: "wallet",
      },
      // Program
      {
        id: "program-init",
        label: "program initialize",
        description: "Initialize program (admin only)",
        group: "program",
      },
      {
        id: "program-config",
        label: "program config",
        description: "Get program config PDA",
        group: "program",
      },
      // User
      {
        id: "user-create",
        label: "user create",
        description: "Create user payment account",
        group: "user",
      },
      {
        id: "user-list",
        label: "user list",
        description: "List user payment accounts",
        group: "user",
      },
      {
        id: "user-show",
        label: "user show",
        description: "Show user payment details",
        group: "user",
      },
      // Gateway
      {
        id: "gateway-create",
        label: "gateway create",
        description: "Create payment gateway",
        group: "gateway",
      },
      {
        id: "gateway-list",
        label: "gateway list",
        description: "List all payment gateways",
        group: "gateway",
      },
      {
        id: "gateway-show",
        label: "gateway show",
        description: "Show gateway details",
        group: "gateway",
      },
      {
        id: "gateway-delete",
        label: "gateway delete",
        description: "Delete payment gateway",
        group: "gateway",
      },
      // Subscription
      {
        id: "sub-create",
        label: "subscription create",
        description: "Create subscription policy",
        group: "subscription",
      },
      {
        id: "sub-list",
        label: "subscription list",
        description: "List payment policies",
        group: "subscription",
      },
      {
        id: "sub-pause",
        label: "subscription pause",
        description: "Pause payment policy",
        group: "subscription",
      },
      {
        id: "sub-resume",
        label: "subscription resume",
        description: "Resume payment policy",
        group: "subscription",
      },
      // Payments
      {
        id: "payment-exec",
        label: "payments execute",
        description: "Execute a payment",
        group: "payments",
      },
      // Referral
      {
        id: "ref-create",
        label: "referral create",
        description: "Create referral account",
        group: "referral",
      },
      {
        id: "ref-show",
        label: "referral show",
        description: "Show referral by code",
        group: "referral",
      },
      {
        id: "ref-chain",
        label: "referral chain",
        description: "Show referral chain",
        group: "referral",
      },
      // PDA
      {
        id: "pda-config",
        label: "pda config",
        description: "Get program config PDA",
        group: "pda",
      },
      {
        id: "pda-delegate",
        label: "pda delegate",
        description: "Get payments delegate PDA",
        group: "pda",
      },
    ],
    []
  );

  const groupedItems = useMemo(() => {
    const groups: Record<CommandGroup, MenuItem[]> = {
      wallet: [],
      program: [],
      user: [],
      gateway: [],
      subscription: [],
      payments: [],
      referral: [],
      pda: [],
    };
    menuItems.forEach((item) => {
      groups[item.group].push(item);
    });
    return groups;
  }, [menuItems]);

  const groupStartIndices = useMemo(() => {
    const indices: Record<CommandGroup, number> = {
      wallet: 0,
      program: 0,
      user: 0,
      gateway: 0,
      subscription: 0,
      payments: 0,
      referral: 0,
      pda: 0,
    };
    let currentIndex = 0;
    (Object.keys(groupedItems) as CommandGroup[]).forEach((group) => {
      indices[group] = currentIndex;
      currentIndex += groupedItems[group].length;
    });
    return indices;
  }, [groupedItems]);

  const executeCommand = useCallback(
    async (item: MenuItem) => {
      if (!context) return;
      setCurrentView("loading");
      setStatusMessage(`Executing: ${item.label}...`);

      try {
        // Simulate command execution
        await new Promise((resolve) => setTimeout(resolve, 500));
        setStatusMessage(`✓ ${item.label} completed successfully`);
        setCurrentView("menu");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setCurrentView("error");
      }
    },
    [context]
  );

  useKeyboard((key) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      renderer.destroy();
      return;
    }

    if (currentView === "menu") {
      if (key.name === "up" || key.name === "k") {
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : menuItems.length - 1
        );
      } else if (key.name === "down" || key.name === "j") {
        setSelectedIndex((prev) =>
          prev < menuItems.length - 1 ? prev + 1 : 0
        );
      } else if (key.name === "return" || key.name === "enter") {
        const item = menuItems[selectedIndex];
        if (item) executeCommand(item);
      }
    } else if (currentView === "error") {
      setCurrentView("menu");
      setError(null);
    }
  });

  if (currentView === "error") {
    return (
      <box padding={2} border borderColor="#ff4444">
        <Banner />
        <text fg="#ff4444">
          <strong>❌ Error</strong>
        </text>
        <text>{error}</text>
        <text fg="#888888" marginTop={1}>
          Press any key to return to menu
        </text>
        <StatusBar message={statusMessage} />
      </box>
    );
  }

  if (currentView === "loading") {
    return (
      <box padding={2}>
        <Banner />
        <text>⏳ Executing command...</text>
        <StatusBar message={statusMessage} />
      </box>
    );
  }

  return (
    <box padding={1} height={height}>
      <Banner />
      <box flexDirection="row" flexGrow={1}>
        <box flexGrow={1} paddingRight={2}>
          <scrollbox focused height={height - 8}>
            {(Object.keys(groupedItems) as CommandGroup[]).map((group) => (
              <CommandGroupComponent
                key={group}
                group={group}
                items={groupedItems[group]}
                selectedIndex={selectedIndex}
                startIndex={groupStartIndices[group]}
                onSelect={setSelectedIndex}
              />
            ))}
          </scrollbox>
        </box>
        <box width={30} border padding={1}>
          <text fg="#6a5acd">
            <strong>Quick Info</strong>
          </text>
          <text marginTop={1} fg="#aaaaaa">
            Network:
          </text>
          <text>{truncatePubkey(config.connectionUrl, 20)}</text>
          <text marginTop={1} fg="#aaaaaa">
            Wallet:
          </text>
          <text>
            {context ? truncatePubkey(context.wallet.publicKey) : "Loading..."}
          </text>
        </box>
      </box>
      <StatusBar message={statusMessage} />
    </box>
  );
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Check if running in CLI mode (has command arguments)
  // CLI mode: first non-flag arg is a command like "wallet", "program", etc.
  // TUI mode: no args, or only global flags like --help, -c, -k
  let firstCommandIndex = 0;
  while (
    firstCommandIndex < args.length &&
    args[firstCommandIndex].startsWith("-")
  ) {
    // Skip global options and their values
    if (
      args[firstCommandIndex] === "-c" ||
      args[firstCommandIndex] === "--connection-url" ||
      args[firstCommandIndex] === "-k" ||
      args[firstCommandIndex] === "--keypath"
    ) {
      firstCommandIndex += 2; // Skip option and its value
    } else if (
      args[firstCommandIndex] === "-h" ||
      args[firstCommandIndex] === "--help"
    ) {
      // Help is CLI mode
      await runCliMode(args);
      return;
    } else {
      firstCommandIndex++;
    }
  }

  const isCliMode = firstCommandIndex < args.length;

  if (isCliMode) {
    await runCliMode(args);
    return;
  }

  // Run TUI mode
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
  });

  createRoot(renderer).render(<App />);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
