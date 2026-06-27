#!/usr/bin/env node

import * as fs from "fs";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  SendTransactionError,
  type AccountInfo,
} from "@solana/web3.js";
import { NATIVE_MINT, getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import DLMM from "@meteora-ag/dlmm";
import {
  Tributary as TributarySDK,
  ComposablePolicy,
  getValidationPda,
  getGatewayPda,
  parseValidationPda,
} from "@tributary-so/sdk";
import { exit } from "process";
import {
  parseAssertionFamily,
  evaluateAssertion,
  deriveValidationTarget,
  isScheduleReady,
} from "./evaluator.js";

const POLL_INTERVAL_MS = 30_000;
const RESCAN_INTERVAL_MS = 10 * 60_000;
const MAX_FAILURES = 3;
const COOLDOWN_MS = 5 * 60_000;

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);
const METEORA_DLMM_SOL_USDC_POOL = new PublicKey(
  "BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y"
);

interface ForwardContext {
  pool: PublicKey;
  slippageBps: number;
  applyHostFeeInFix: boolean;
}

interface CooldownEntry {
  consecutiveFailures: number;
  cooldownUntil: number;
}

interface WatchedPolicy {
  publicKey: PublicKey;
  account: ComposablePolicy;
  forwardContext: ForwardContext;
}

interface SchedulerConfig {
  connectionUrl: string;
  gatewayKeypairPath?: string;
  privateKeys?: string[];
}

const FORWARD_CONTEXT: Record<string, ForwardContext> = {
  [`${USDC_MINT.toBase58()}:${NATIVE_MINT.toBase58()}`]: {
    pool: METEORA_DLMM_SOL_USDC_POOL,
    slippageBps: 100,
    applyHostFeeInFix: true,
  },
};

interface BuiltForward {
  ixData: Buffer;
  forwardAccounts: {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }[];
  forwardAmount: BN;
}

async function buildForwardIx(
  policy: ComposablePolicy,
  composablePolicyPda: PublicKey,
  ctx: ForwardContext,
  amount: BN,
  connection: Connection
): Promise<BuiltForward> {
  const pool = await DLMM.create(connection, ctx.pool, {
    cluster: "mainnet-beta",
    skipSolWrappingOperation: true,
  });
  const inputMint = policy.forwardConfig.inputMint;
  const outputMint = policy.forwardConfig.outputMint;
  const swapForY = inputMint.equals(pool.tokenX.publicKey);
  const binArrays = await pool.getBinArrayForSwap(swapForY);
  const quote = pool.swapQuote(
    amount,
    swapForY,
    new BN(ctx.slippageBps),
    binArrays
  );

  const swapTx = await pool.swap({
    lbPair: ctx.pool,
    inToken: inputMint,
    outToken: outputMint,
    inAmount: amount,
    minOutAmount: quote.minOutAmount,
    user: composablePolicyPda,
    binArraysPubkey: quote.binArraysPubkey as PublicKey[],
  });
  const swapIx = swapTx.instructions.find((i) =>
    i.programId.equals(METEORA_DLMM_PUBKEY)
  );
  if (!swapIx) {
    throw new Error("DLMM swap instruction not found in pool.swap() output");
  }

  let keys = swapIx.keys;
  if (ctx.applyHostFeeInFix) {
    keys = keys.map((k) =>
      k.pubkey.equals(SystemProgram.programId)
        ? {
            pubkey: METEORA_DLMM_PUBKEY,
            isSigner: k.isSigner,
            isWritable: k.isWritable,
          }
        : k
    );
  }

  return {
    ixData: Buffer.from(swapIx.data),
    forwardAccounts: keys.map((k) => ({
      pubkey: k.pubkey,
      isSigner: false,
      isWritable: true,
    })),
    forwardAmount: amount,
  };
}

class ComposableScheduler {
  private sdk: TributarySDK;
  private gatewayKeypairs: Keypair[];
  private config: SchedulerConfig;
  private watched: Map<string, WatchedPolicy[]> = new Map();
  private cooldowns: Map<string, CooldownEntry> = new Map();
  private pollTimer?: ReturnType<typeof setInterval>;
  private rescanTimer?: ReturnType<typeof setInterval>;

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

  private loadKeypair(data: string): Keypair {
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(data)));
  }

  private loadKeypairFromFile(filePath: string): Keypair {
    try {
      return this.loadKeypair(fs.readFileSync(filePath, "ascii"));
    } catch (error) {
      console.error("Error reading keypair:", error);
      throw error;
    }
  }

  async start(): Promise<void> {
    console.log(
      `[${new Date().toISOString()}] Starting composable scheduler. Gateways: ${this.gatewayKeypairs
        .map((k) => k.publicKey.toString())
        .join(", ")}`
    );
    console.log(`Connection: ${this.config.connectionUrl}`);

    await this.rescanAll();

    this.pollTimer = setInterval(
      () => this.tick().catch((e) => console.error("tick error:", e)),
      POLL_INTERVAL_MS
    );
    this.rescanTimer = setInterval(
      () => this.rescanAll().catch((e) => console.error("rescan error:", e)),
      RESCAN_INTERVAL_MS
    );

    console.log("Composable scheduler started successfully");
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.rescanTimer) clearInterval(this.rescanTimer);
    console.log("Composable scheduler stopped");
  }

  private async rescanAll(): Promise<void> {
    console.log(
      `[${new Date().toISOString()}] Rescanning composable policies...`
    );
    this.cooldowns.clear();

    for (const keypair of this.gatewayKeypairs) {
      const { address: gatewayPda } = getGatewayPda(
        keypair.publicKey,
        this.sdk.programId
      );
      try {
        const policies = await this.sdk.program.account.composablePolicy.all([
          {
            // ponytail: ComposablePolicy Borsh layout —
            // disc(8) + bump(1) + user_payment(32) → gateway @ offset 41
            memcmp: { offset: 41, bytes: gatewayPda.toBase58() },
          },
        ]);

        const watched: WatchedPolicy[] = [];
        for (const { publicKey, account } of policies) {
          const ctx = this.lookupForwardContext(account);
          if (!ctx) {
            console.log(
              `No forward context for ${publicKey.toString()} ` +
                `(${account.forwardConfig.inputMint.toBase58()}:${account.forwardConfig.outputMint.toBase58()}) — skipping`
            );
            continue;
          }
          watched.push({ publicKey, account, forwardContext: ctx });
        }

        this.watched.set(keypair.publicKey.toBase58(), watched);
        console.log(
          `Gateway ${keypair.publicKey.toString()}: ${
            watched.length
          } composable policies`
        );
      } catch (error) {
        console.error(
          `Rescan failed for gateway ${keypair.publicKey.toString()}:`,
          error
        );
      }
    }
  }

  private lookupForwardContext(
    account: ComposablePolicy
  ): ForwardContext | null {
    const key = `${account.forwardConfig.inputMint.toBase58()}:${account.forwardConfig.outputMint.toBase58()}`;
    return FORWARD_CONTEXT[key] ?? null;
  }

  private hasValidation(policy: ComposablePolicy): boolean {
    const prog = policy.validationConfig?.validationProgram;
    return (
      !!prog &&
      !prog.equals(PublicKey.default) &&
      !prog.equals(SystemProgram.programId)
    );
  }

  private async tick(): Promise<void> {
    const currentTime = Math.floor(Date.now() / 1000);

    for (const keypair of this.gatewayKeypairs) {
      const gatewayKey = keypair.publicKey.toBase58();
      const policies = this.watched.get(gatewayKey) ?? [];
      if (policies.length === 0) continue;

      const fireable = await this.prefilter(policies, currentTime);
      if (fireable.length === 0) continue;

      console.log(
        `[${new Date().toISOString()}] Gateway ${keypair.publicKey.toString()}: ${
          fireable.length
        }/${policies.length} fireable`
      );

      await Promise.all(
        fireable.map((p) =>
          this.fire(p, keypair).catch((e) =>
            console.error(`fire error for ${p.publicKey.toString()}:`, e)
          )
        )
      );
    }
  }

  private async prefilter(
    policies: WatchedPolicy[],
    currentTime: number
  ): Promise<WatchedPolicy[]> {
    const now = Date.now();
    const notOnCooldown = policies.filter((p) => {
      const cd = this.cooldowns.get(p.publicKey.toBase58());
      if (cd && cd.cooldownUntil > now) {
        console.log(
          `[${new Date().toISOString()}] ${p.publicKey.toString()} on cooldown — skipping`
        );
        return false;
      }
      return true;
    });

    const scheduleReady = notOnCooldown.filter(
      (p) => isScheduleReady(p.account, currentTime).ready
    );

    // ponytail: one batch fetch for validation PDAs + both candidate target
    // accounts (recipient + recipient output-ATA) per validated policy.
    const fetchKeys: PublicKey[] = [];
    const keySet = new Set<string>();
    const pushKey = (k: PublicKey) => {
      const s = k.toBase58();
      if (!keySet.has(s)) {
        keySet.add(s);
        fetchKeys.push(k);
      }
    };

    for (const p of scheduleReady) {
      if (!this.hasValidation(p.account)) continue;
      const { address: valPda } = getValidationPda(
        p.publicKey,
        this.sdk.programId
      );
      pushKey(valPda);
      pushKey(p.account.recipient);
      pushKey(
        getAssociatedTokenAddressSync(
          p.account.forwardConfig.outputMint,
          p.account.recipient,
          true
        )
      );
    }

    const accounts =
      fetchKeys.length > 0
        ? await this.sdk.connection.getMultipleAccountsInfo(fetchKeys)
        : [];
    const byKey = new Map<string, AccountInfo<Buffer> | null>();
    fetchKeys.forEach((k, i) => byKey.set(k.toBase58(), accounts[i] ?? null));

    const fireable: WatchedPolicy[] = [];
    for (const p of scheduleReady) {
      if (!this.hasValidation(p.account)) {
        fireable.push(p);
        continue;
      }
      const { address: valPda } = getValidationPda(
        p.publicKey,
        this.sdk.programId
      );
      const valAcct = byKey.get(valPda.toBase58()) ?? null;
      if (!valAcct?.data) {
        fireable.push(p);
        continue;
      }
      const valData = parseValidationPda(valAcct.data).data;
      const family = parseAssertionFamily(valData);
      const target = deriveValidationTarget(family, p.account);
      if (!target) {
        // ponytail: can't assemble remaining_accounts without knowing the
        // validation target — sim would always fail. Skip, not defer.
        console.log(
          `[${new Date().toISOString()}] ${p.publicKey.toString()} validation prefilter: unhandled assertion family "${family}" — skipping`
        );
        continue;
      }
      const targetAcct = byKey.get(target.toBase58()) ?? null;
      if (evaluateAssertion(family, valData, targetAcct)) {
        fireable.push(p);
      } else {
        console.log(
          `[${new Date().toISOString()}] ${p.publicKey.toString()} validation prefilter: assertion not satisfied`
        );
      }
    }
    return fireable;
  }

  private async fire(policy: WatchedPolicy, gateway: Keypair): Promise<void> {
    await this.sdk.updateWallet(new anchor.Wallet(gateway));

    try {
      const amount =
        isScheduleReady(policy.account, Math.floor(Date.now() / 1000)).amount ??
        new BN(0);

      const built = await buildForwardIx(
        policy.account,
        policy.publicKey,
        policy.forwardContext,
        amount,
        this.sdk.connection
      );

      const validationTargets = await this.resolveFireValidationTargets(
        policy.account,
        policy.publicKey
      );

      const remainingAccounts = [
        ...validationTargets.map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
        ...built.forwardAccounts,
      ];

      const ix = await this.sdk.executeComposable(
        policy.publicKey,
        built.ixData,
        built.forwardAmount,
        remainingAccounts
      );

      const transaction = new Transaction().add(ix);
      transaction.feePayer = gateway.publicKey;
      const { blockhash } = await this.sdk.connection.getLatestBlockhash(
        "confirmed"
      );
      transaction.recentBlockhash = blockhash;

      const sim = await this.sdk.connection.simulateTransaction(transaction, [
        gateway,
      ]);
      if (sim.value.err) {
        throw new Error(
          `simulation failed: ${JSON.stringify(sim.value.err)}\nlogs: ${(
            sim.value.logs ?? []
          ).join("\n")}`
        );
      }

      const signature = await this.sdk.provider.sendAndConfirm(
        transaction,
        [],
        {
          commitment: "confirmed",
          skipPreflight: false,
        }
      );

      console.log(
        `[${new Date().toISOString()}] ✅ Composable executed: ${policy.publicKey.toString()} → ${signature}`
      );
      this.cooldowns.delete(policy.publicKey.toBase58());
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] 🚩 Composable failed: ${policy.publicKey.toString()}`
      );
      if (error instanceof SendTransactionError) {
        console.error(error.message);
        console.error(error.logs);
      } else {
        console.error(error);
      }
      this.recordFailure(policy.publicKey);
    }
  }

  private async resolveFireValidationTargets(
    policy: ComposablePolicy,
    composablePolicyPda: PublicKey
  ): Promise<PublicKey[]> {
    if (!this.hasValidation(policy)) return [];

    const { address: valPda } = getValidationPda(
      composablePolicyPda,
      this.sdk.programId
    );
    const acct = await this.sdk.connection.getAccountInfo(valPda);
    if (!acct?.data) return [valPda];
    const valData = parseValidationPda(acct.data).data;
    const target = deriveValidationTarget(
      parseAssertionFamily(valData),
      policy
    );
    // ponytail: remaining_accounts[0] MUST be the ValidationPDA (program
    // verifies derived address at index 0), then the validation target(s).
    return target ? [valPda, target] : [valPda];
  }

  private recordFailure(policyPda: PublicKey): void {
    const key = policyPda.toBase58();
    const entry = this.cooldowns.get(key) ?? {
      consecutiveFailures: 0,
      cooldownUntil: 0,
    };
    entry.consecutiveFailures += 1;
    if (entry.consecutiveFailures >= MAX_FAILURES) {
      entry.cooldownUntil = Date.now() + COOLDOWN_MS;
      console.log(
        `[${new Date().toISOString()}] ${key} hit ${MAX_FAILURES} strikes — cooldown ${
          COOLDOWN_MS / 1000
        }s`
      );
    }
    this.cooldowns.set(key, entry);
  }
}

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
  };

  const scheduler = new ComposableScheduler(config);

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

  scheduler.start().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  });
}

export { ComposableScheduler };
