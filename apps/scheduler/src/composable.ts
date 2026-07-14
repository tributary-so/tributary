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
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import DLMM from "@meteora-ag/dlmm";
import {
  Tributary as TributarySDK,
  PaymentGateway,
  ComposablePolicy,
  getPreValidationPda,
  getPostValidationPda,
  getGatewayPda,
  parseValidationPda,
  type ValidationPdaAccount,
} from "@tributary-so/sdk";
import { exit } from "process";
import {
  parseAssertionFamily,
  evaluateAssertion,
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
  forwardContext: ForwardContext | null;
  gateway: PaymentGateway;
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
  ctx: ForwardContext | null,
  amount: BN,
  connection: Connection
): Promise<BuiltForward> {
  if (ctx) {
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
  } else {
    return {
      ixData: Buffer.alloc(0),
      forwardAccounts: [],
      forwardAmount: amount,
    };
  }
}

class ComposableScheduler {
  private sdk: TributarySDK;
  private gatewayKeypairs: Keypair[];
  private config: SchedulerConfig;
  private watched: Map<string, WatchedPolicy[]> = new Map();
  private cooldowns: Map<string, CooldownEntry> = new Map();
  private pollTimer?: ReturnType<typeof setInterval>;
  private rescanTimer?: ReturnType<typeof setInterval>;
  private paymentGateways: Map<string, PaymentGateway> = new Map();

  constructor(config: SchedulerConfig) {
    this.config = config;
    this.gatewayKeypairs = [];

    const connection = new Connection(config.connectionUrl, "confirmed");
    this.sdk = new TributarySDK(connection, this.gatewayKeypairs[0]);

    if (config.gatewayKeypairPath) {
      this.gatewayKeypairs.push(
        this.loadKeypairFromFile(config.gatewayKeypairPath)
      );
    } else if (config.privateKeys && config.privateKeys.length > 0) {
      for (const privateKey of config.privateKeys) {
        if (privateKey.trim()) {
          const keyPair = this.loadKeypair(privateKey.trim());
          this.gatewayKeypairs.push(keyPair);
        }
      }
    }

    if (this.gatewayKeypairs.length === 0) {
      console.log("Error: need at least one private key!");
      exit(1);
    }
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

    for (const keypair of this.gatewayKeypairs) {
      const { address: gatewayPda } = getGatewayPda(
        keypair.publicKey,
        this.sdk.programId
      );
      const gateway = await this.sdk.getPaymentGateway(gatewayPda);
      if (gateway) {
        this.paymentGateways.set(keypair.publicKey.toString(), gateway); // also mapped from authority!
        this.paymentGateways.set(gatewayPda.toString(), gateway);
      } else {
        console.error(`No gateway found for ${keypair.publicKey}`);
      }
    }

    await this.rescanAll();
    await this.tick();

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
          const gateway = this.paymentGateways.get(gatewayPda.toString());
          if (gateway) {
            watched.push({ publicKey, account, forwardContext: ctx, gateway });
          }
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
    return !!(policy.preValidation as any).programCall;
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
      (p) => isScheduleReady(p.account, currentTime, p.gateway).ready
    );

    // ponytail: two-phase batch fetch.
    //  Phase 1: ValidationPDAs for validated policies — needed to read the
    //           owner-pinned Lighthouse target accounts (ADR-0016).
    //  Phase 2: those pinned targets themselves, batched.
    // Previously this hardcoded recipient + recipient_ata, which only
    // worked by accident for the v1 assertion families and produced false
    // negatives for anything else.
    const validated = scheduleReady.filter((p) =>
      this.hasValidation(p.account)
    );
    const noValidation = scheduleReady.filter(
      (p) => !this.hasValidation(p.account)
    );

    if (validated.length === 0) {
      return noValidation;
    }

    const valPdaEntries = validated.map((p) => ({
      policy: p,
      valPda: getPreValidationPda(p.publicKey, this.sdk.programId).address,
    }));
    const valPdaAccounts = await this.sdk.connection.getMultipleAccountsInfo(
      valPdaEntries.map((e) => e.valPda)
    );

    // Collect pinned targets (deduped) + remember per-policy meta.
    const fetchKeys: PublicKey[] = [];
    const keySet = new Set<string>();
    const pushKey = (k: PublicKey) => {
      const s = k.toBase58();
      if (!keySet.has(s)) {
        keySet.add(s);
        fetchKeys.push(k);
      }
    };

    interface ValMeta {
      policy: WatchedPolicy;
      parsed: ValidationPdaAccount | null;
      family: ReturnType<typeof parseAssertionFamily>;
      targets: PublicKey[];
    }
    const metas: ValMeta[] = [];
    for (let i = 0; i < valPdaEntries.length; i++) {
      const { policy } = valPdaEntries[i];
      const acct = valPdaAccounts[i];
      if (!acct?.data) {
        // ponytail: ValidationPda missing/unreadable — let fire path try
        // rather than silently filtering out. The on-chain pin-check will
        // reject it loudly if truly broken.
        metas.push({
          policy,
          parsed: null,
          family: "unknown",
          targets: [],
        });
        continue;
      }
      const parsed = parseValidationPda(acct.data);
      const targets = parsed.pinnedAccounts.slice(0, parsed.numPinnedAccounts);
      targets.forEach(pushKey);
      metas.push({
        policy,
        parsed,
        family: parseAssertionFamily(parsed.data),
        targets,
      });
    }

    const targetAccounts =
      fetchKeys.length > 0
        ? await this.sdk.connection.getMultipleAccountsInfo(fetchKeys)
        : [];
    const byKey = new Map<string, AccountInfo<Buffer> | null>();
    fetchKeys.forEach((k, i) =>
      byKey.set(k.toBase58(), targetAccounts[i] ?? null)
    );

    const fireable: WatchedPolicy[] = [...noValidation];
    for (const m of metas) {
      if (m.family === "unknown" || m.targets.length === 0) {
        // ponytail: can't pre-evaluate (multi-account assertion or unknown
        // family) — defer to fire path; on-chain CPI is authoritative.
        fireable.push(m.policy);
        continue;
      }
      // ponytail: evaluator only handles single-account families
      // (accountInfo, tokenAccount). Evaluate against pinned[0].
      const targetAcct = byKey.get(m.targets[0].toBase58()) ?? null;
      if (evaluateAssertion(m.family, m.parsed!.data, targetAcct)) {
        fireable.push(m.policy);
      } else {
        console.log(
          `[${new Date().toISOString()}] ${m.policy.publicKey.toString()} validation prefilter: assertion not satisfied`
        );
      }
    }
    return fireable;
  }

  private async fire(policy: WatchedPolicy, gateway: Keypair): Promise<void> {
    await this.sdk.updateWallet(new anchor.Wallet(gateway));

    try {
      const amount =
        isScheduleReady(
          policy.account,
          Math.floor(Date.now() / 1000),
          policy.gateway
        ).amount ?? new BN(0);

      const built = await buildForwardIx(
        policy.account,
        policy.publicKey,
        policy.forwardContext,
        amount,
        this.sdk.connection
      );

      // ── remaining_accounts (ADR-0016, no ValidationPda in slice) ────
      // Program contract (execute_composable.rs run_validation_cpi):
      //   [...preLighthouseTargets, ...forwardAccounts, ...postLighthouseTargets, (scheduler_ata?)]
      // The ValidationPda itself is a dedicated Anchor account
      // (pre_validation_pda / post_validation_pda), NOT in remaining_accounts.
      // remaining[0..num_pinned] is pin-checked against
      // validation_pda.pinned_accounts — exactly the owner-declared targets
      // read here. Post-validation targets occupy the trailing slice.
      const [preTargets, postTargets] = await Promise.all([
        this.resolveValidationTargets(
          policy.account.preValidation,
          getPreValidationPda(policy.publicKey, this.sdk.programId).address
        ),
        this.resolveValidationTargets(
          policy.account.postValidation,
          getPostValidationPda(policy.publicKey, this.sdk.programId).address
        ),
      ]);

      const remainingAccounts = [
        ...preTargets.map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
        ...(built.forwardAccounts ?? []),
        ...postTargets.map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
      ];

      const ixs = await this.sdk.executeComposable(
        policy.publicKey,
        built.ixData,
        built.forwardAmount,
        remainingAccounts
      );

      const transaction = new Transaction().add(...ixs);
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

  private async resolveValidationTargets(
    spec: ComposablePolicy["preValidation"],
    valPda: PublicKey
  ): Promise<PublicKey[]> {
    // Disabled spec → no target accounts in remaining_accounts. The program
    // still expects the matching post/pre slice length to be 0.
    if (!("programCall" in spec)) return [];

    const acct = await this.sdk.connection.getAccountInfo(valPda);
    if (!acct?.data) {
      // ponytail: ValidationPda missing — return empty and let the on-chain
      // pin-check / typed deserialise reject loudly. (Pre-filter already
      // pushed the policy through; this only fires if state changed between
      // pre-filter and fire.)
      return [];
    }
    const parsed = parseValidationPda(acct.data);
    return parsed.pinnedAccounts.slice(0, parsed.numPinnedAccounts);
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

export { ComposableScheduler };
