#!/usr/bin/env node

import * as fs from "fs";
import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SendTransactionError,
  type AccountInfo,
} from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import { createMeteoraDlmmForward } from "@tributary-so/forward-builders";
import {
  Tributary as TributarySDK,
  PaymentGateway,
  ComposablePolicy,
  getPreValidationPda,
  parseValidationPda,
  isForwardEnabled,
  resolveValidationTargets,
  assembleComposableRemainingAccounts,
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
  relayerKeypairPath?: string;
  relayerPrivateKeys?: string[];
  dryRun?: boolean;
}

const FORWARD_CONTEXT: Record<string, ForwardContext> = {
  [`${USDC_MINT.toBase58()}:${NATIVE_MINT.toBase58()}`]: {
    pool: METEORA_DLMM_SOL_USDC_POOL,
    slippageBps: 100,
    applyHostFeeInFix: true,
  },
};

class ComposableScheduler {
  private sdk: TributarySDK;
  private gatewayKeypairs: Keypair[];
  private relayerKeypairs: Keypair[];
  private config: SchedulerConfig;
  private watched: Map<string, WatchedPolicy[]> = new Map();
  private cooldowns: Map<string, CooldownEntry> = new Map();
  private pollTimer?: ReturnType<typeof setInterval>;
  private rescanTimer?: ReturnType<typeof setInterval>;
  private paymentGateways: Map<string, PaymentGateway> = new Map();
  // Maps a signer pubkey → list of gateway PDAs that signer manages.
  // A single signer can manage multiple gateways (different authorities).
  private signerToGatewayPdas: Map<string, PublicKey[]> = new Map();

  constructor(config: SchedulerConfig) {
    this.config = config;
    this.gatewayKeypairs = [];
    this.relayerKeypairs = [];

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

    // ── Cold-relayer keypairs (ADR-0016 amended) ─────────────────────
    // Optional: when provided, fire() signs with the relayer instead of
    // the gateway signer. This makes execution permissionless
    // (is_permissionless = true on-chain), which triggers the
    // scheduler_ATA fee-routing path.
    if (config.relayerKeypairPath) {
      this.relayerKeypairs.push(
        this.loadKeypairFromFile(config.relayerKeypairPath)
      );
    } else if (
      config.relayerPrivateKeys &&
      config.relayerPrivateKeys.length > 0
    ) {
      for (const privateKey of config.relayerPrivateKeys) {
        if (privateKey.trim()) {
          this.relayerKeypairs.push(this.loadKeypair(privateKey.trim()));
        }
      }
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
    if (this.relayerKeypairs.length > 0) {
      console.log(
        `Relayers (cold-relayer path): ${this.relayerKeypairs
          .map((k) => k.publicKey.toString())
          .join(", ")}`
      );
    } else {
      console.log(
        "Relayers: none — signing with gateway keypairs (trusted-signer path)"
      );
    }
    console.log(`Connection: ${this.config.connectionUrl}`);
    if (this.config.dryRun) {
      console.log("Mode: DRY-RUN (no transactions will be sent)");
    }

    for (const keypair of this.gatewayKeypairs) {
      // Discover ALL gateways where this keypair is the signer — not just the
      // one where keypair == authority. A signer can manage multiple gateways.
      const gateways = await this.sdk.getPaymentGatewaysBySigner(
        keypair.publicKey
      );
      const pdaList: PublicKey[] = [];
      for (const { publicKey: gatewayPda, account: gateway } of gateways) {
        this.paymentGateways.set(gatewayPda.toString(), gateway);
        pdaList.push(gatewayPda);
      }
      this.signerToGatewayPdas.set(keypair.publicKey.toBase58(), pdaList);
      if (pdaList.length === 0) {
        console.error(`No gateway found for signer ${keypair.publicKey}`);
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
      const gatewayPdas =
        this.signerToGatewayPdas.get(keypair.publicKey.toBase58()) ?? [];

      for (const gatewayPda of gatewayPdas) {
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
              watched.push({
                publicKey,
                account,
                forwardContext: ctx,
                gateway,
              });
            }
          }

          // Aggregate policies across all gateways this signer manages
          const existing = this.watched.get(keypair.publicKey.toBase58()) ?? [];
          this.watched.set(keypair.publicKey.toBase58(), [
            ...existing,
            ...watched,
          ]);
          console.log(
            `Gateway ${gatewayPda.toString()}: ${
              watched.length
            } composable policies (signer ${keypair.publicKey.toString()})`
          );
        } catch (error) {
          console.error(
            `Rescan failed for gateway ${gatewayPda.toString()}:`,
            error
          );
        }
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

      // ponytail: single relayer for all gateways. Round-robin / per-gateway
      // relayer assignment adds config complexity for no current use case.
      const signer = this.relayerKeypairs[0] ?? keypair;

      await Promise.all(
        fireable.map((p) =>
          this.fire(p, signer).catch((e) =>
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

  private async fire(policy: WatchedPolicy, signer: Keypair): Promise<void> {
    if (this.config.dryRun) {
      const amount =
        isScheduleReady(
          policy.account,
          Math.floor(Date.now() / 1000),
          policy.gateway
        ).amount ?? new BN(0);
      console.log(
        `[${new Date().toISOString()}] [DRY-RUN] Would fire composable ${policy.publicKey.toString()} (amount: ${amount.toString()}, signer: ${signer.publicKey.toString()})`
      );
      return;
    }

    await this.sdk.updateWallet(new anchor.Wallet(signer));

    try {
      const amount =
        isScheduleReady(
          policy.account,
          Math.floor(Date.now() / 1000),
          policy.gateway
        ).amount ?? new BN(0);

      const forwardPayload =
        isForwardEnabled(policy.account) && policy.forwardContext
          ? await createMeteoraDlmmForward({
              pool: policy.forwardContext.pool,
              slippageBps: policy.forwardContext.slippageBps,
              applyHostFeeInFix: policy.forwardContext.applyHostFeeInFix,
            }).build({
              connection: this.sdk.connection,
              policy: policy.account,
              composablePolicyPda: policy.publicKey,
              face: amount,
            })
          : { instructionData: Buffer.alloc(0), forwardAccounts: [] };

      // ── remaining_accounts (ADR-0016, no ValidationPda in slice) ────
      // Program contract (execute_composable.rs run_validation_cpi):
      //   [...preLighthouseTargets, ...forwardAccounts, ...postLighthouseTargets, (scheduler_ata?)]
      // The scheduler_ata (permissionless path) is appended by the SDK
      // facade (sdk.executeComposable) via deriveSchedulerAta — the
      // scheduler does NOT include it here.
      const [preTargets, postTargets] = await Promise.all([
        resolveValidationTargets(
          this.sdk.connection,
          policy.publicKey,
          policy.account.preValidation,
          this.sdk.programId,
          "pre"
        ),
        resolveValidationTargets(
          this.sdk.connection,
          policy.publicKey,
          policy.account.postValidation,
          this.sdk.programId,
          "post"
        ),
      ]);

      const remainingAccounts = assembleComposableRemainingAccounts({
        preTargets,
        forwardAccounts: forwardPayload.forwardAccounts,
        postTargets,
      });

      const ixs = await this.sdk.executeComposable(
        policy.publicKey,
        forwardPayload.instructionData,
        amount,
        remainingAccounts
      );

      const transaction = new Transaction().add(...ixs);
      transaction.feePayer = signer.publicKey;
      const { blockhash } = await this.sdk.connection.getLatestBlockhash(
        "confirmed"
      );
      transaction.recentBlockhash = blockhash;

      const sim = await this.sdk.connection.simulateTransaction(transaction, [
        signer,
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
