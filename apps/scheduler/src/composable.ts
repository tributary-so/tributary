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
import BN from "bn.js";
import { getForwardBuilderFor } from "@tributary-so/forward-builders";
import {
  Tributary as TributarySDK,
  PaymentGateway,
  ComposablePolicy,
  getPreValidationPda,
  parseValidationPda,
  isForwardEnabled,
  buildComposableExecutionPayload,
  type ValidationPdaAccount,
} from "@tributary-so/sdk";
import { exit } from "process";
import {
  parseAssertionFamily,
  evaluateAssertion,
  isScheduleReady,
} from "./evaluator.js";
import { logger, parseErrorFromLogs } from "./logger.js";
import {
  wrapConnectionWithMetrics,
  recordTx,
  recordTxFail,
  setWatchedCount,
  setCooldownCount,
  observeTick,
  observeTxConfirm,
} from "./metrics.js";

const POLL_INTERVAL_MS = 30_000;
const RESCAN_INTERVAL_MS = 10 * 60_000;
const MAX_FAILURES = 3;
const COOLDOWN_MS = 5 * 60_000;
const COOLDOWN_MAX_MS = 30 * 60_000;

// ponytail: pool is pinned on the policy (pinnedAccounts[0], ADR-0030);
// slippage + host-fee-fix are scheduler-side tuning knobs with no per-pair
// need yet. Promote to config when a pair actually diverges.
const FORWARD_SLIPPAGE_BPS = 100;
const FORWARD_APPLY_HOST_FEE_IN_FIX = true;

interface CooldownEntry {
  consecutiveFailures: number;
  cooldownUntil: number;
}

interface WatchedPolicy {
  publicKey: PublicKey;
  account: ComposablePolicy;
  gateway: PaymentGateway;
  signerKeypair: Keypair;
}

interface SchedulerConfig {
  connectionUrl: string;
  gatewayKeypairPath?: string;
  privateKeys?: string[];
  relayerKeypairPath?: string;
  relayerPrivateKeys?: string[];
  dryRun?: boolean;
}

class ComposableScheduler {
  private sdk: TributarySDK;
  private gatewayKeypairs: Keypair[];
  private relayerKeypairs: Keypair[];
  private config: SchedulerConfig;
  private watched: Map<string, WatchedPolicy> = new Map();
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
    // Wrap once: every RPC call (SDK-internal too) bumps rpc_calls_total.
    // Would have surfaced the y0g1 runaway within one tick.
    const instrumented = wrapConnectionWithMetrics(connection);
    this.sdk = new TributarySDK(instrumented, this.gatewayKeypairs[0]);

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
      logger.error("Need at least one private key");
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
      logger.error(`Error reading keypair ${filePath}:`, error);
      throw error;
    }
  }

  async start(): Promise<void> {
    logger.info(
      `Starting composable scheduler. Gateways: ${this.gatewayKeypairs
        .map((k) => k.publicKey.toString())
        .join(", ")}`
    );
    if (this.relayerKeypairs.length > 0) {
      logger.info(
        `Relayers (cold-relayer path): ${this.relayerKeypairs
          .map((k) => k.publicKey.toString())
          .join(", ")}`
      );
    } else {
      logger.info(
        "Relayers: none — signing with gateway keypairs (trusted-signer path)"
      );
    }
    logger.info(`Connection: ${this.config.connectionUrl}`);
    if (this.config.dryRun) {
      logger.info("Mode: DRY-RUN (no transactions will be sent)");
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
        logger.warn(`No gateway found for signer ${keypair.publicKey}`);
      }
    }

    await this.rescanAll();
    await this.tick();

    this.pollTimer = setInterval(
      () => this.tick().catch((e) => logger.error("tick error:", e)),
      POLL_INTERVAL_MS
    );
    this.rescanTimer = setInterval(
      () => this.rescanAll().catch((e) => logger.error("rescan error:", e)),
      RESCAN_INTERVAL_MS
    );

    logger.info("Composable scheduler started successfully");
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.rescanTimer) clearInterval(this.rescanTimer);
    logger.info("Composable scheduler stopped");
  }

  private async rescanAll(): Promise<void> {
    logger.info("Rescanning composable policies...");

    // Build fresh map keyed by policy pubkey — replaces previous entries,
    // dedupes automatically. Policy pubkeys are globally unique.
    const fresh = new Map<string, WatchedPolicy>();

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

          for (const { publicKey, account } of policies) {
            const gateway = this.paymentGateways.get(gatewayPda.toString());
            if (gateway) {
              fresh.set(publicKey.toBase58(), {
                publicKey,
                account,
                gateway,
                signerKeypair: keypair,
              });
            }
          }

          logger.info(
            `Gateway ${gatewayPda.toString()}: ${
              policies.length
            } composable policies (signer ${keypair.publicKey.toString()})`
          );
        } catch (error) {
          logger.error(
            `Rescan failed for gateway ${gatewayPda.toString()}:`,
            error
          );
        }
      }
    }

    this.watched = fresh;
    setWatchedCount("composable", fresh.size);

    // Prune orphaned cooldown entries (policies deleted/closed on-chain)
    for (const key of [...this.cooldowns.keys()]) {
      if (!this.watched.has(key)) this.cooldowns.delete(key);
    }
  }

  private hasValidation(policy: ComposablePolicy): boolean {
    return !!(policy.preValidation as any).programCall;
  }

  private async tick(): Promise<void> {
    const tickStart = Date.now();
    const currentTime = Math.floor(Date.now() / 1000);

    let totalWatched = 0;
    let totalFireable = 0;
    let totalFired = 0;
    let totalErrors = 0;

    for (const keypair of this.gatewayKeypairs) {
      const signerKey = keypair.publicKey.toBase58();
      const policies = [...this.watched.values()].filter(
        (p) => p.signerKeypair.publicKey.toBase58() === signerKey
      );
      if (policies.length === 0) continue;

      totalWatched += policies.length;

      const fireable = await this.prefilter(policies, currentTime);
      totalFireable += fireable.length;
      if (fireable.length === 0) continue;

      logger.info(
        `Gateway ${keypair.publicKey.toString()}: ${fireable.length}/${
          policies.length
        } fireable`
      );

      // ponytail: single relayer for all gateways. Round-robin / per-gateway
      // relayer assignment adds config complexity for no current use case.
      const signer = this.relayerKeypairs[0] ?? keypair;

      await Promise.all(
        fireable.map((p) =>
          this.fire(p, signer)
            .then(() => totalFired++)
            .catch((e) => {
              totalErrors++;
              logger.error(`fire error for ${p.publicKey.toString()}:`, e);
            })
        )
      );
    }

    logger.info(
      `Composable tick: watched=${totalWatched} fireable=${totalFireable} fired=${totalFired} errors=${totalErrors} cooldowns=${
        this.cooldowns.size
      } duration=${Date.now() - tickStart}ms`
    );
    observeTick("composable", (Date.now() - tickStart) / 1000);
    setCooldownCount("composable", this.cooldowns.size);
  }

  private async prefilter(
    policies: WatchedPolicy[],
    currentTime: number
  ): Promise<WatchedPolicy[]> {
    const now = Date.now();
    const notOnCooldown = policies.filter((p) => {
      const cd = this.cooldowns.get(p.publicKey.toBase58());
      if (cd && cd.cooldownUntil > now) {
        logger.debug(`${p.publicKey.toString()} on cooldown — skipping`);
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
        logger.debug(
          `${m.policy.publicKey.toString()} validation prefilter: assertion not satisfied`
        );
      }
    }
    return fireable;
  }

  private async fire(policy: WatchedPolicy, signer: Keypair): Promise<void> {
    if (this.config.dryRun) {
      const face =
        isScheduleReady(
          policy.account,
          Math.floor(Date.now() / 1000),
          policy.gateway
        ).amount ?? new BN(0);
      logger.debug(
        `[DRY-RUN] Would fire composable ${policy.publicKey.toString()} (face: ${face.toString()}, signer: ${signer.publicKey.toString()})`
      );
      recordTx("composable", "dry_run");
      return;
    }

    await this.sdk.updateWallet(new anchor.Wallet(signer));

    try {
      const readiness = isScheduleReady(
        policy.account,
        Math.floor(Date.now() / 1000),
        policy.gateway
      );
      const face = readiness.amount ?? new BN(0);

      // Only PayAsYouGo accepts a caller-supplied amount to execute_composable.
      // All other variants resolve the amount on-chain from the schedule;
      // passing Some(amt) for them returns InvalidAmount (execute_composable.rs).
      const isPayAsYouGo = !!(policy.account.policyType as any).payAsYouGo;
      const forwardAmount = isPayAsYouGo ? face : null;

      const forwardBuilder = isForwardEnabled(policy.account)
        ? getForwardBuilderFor(policy.account, {
            slippageBps: FORWARD_SLIPPAGE_BPS,
            applyHostFeeInFix: FORWARD_APPLY_HOST_FEE_IN_FIX,
          })
        : undefined;

      // ── payload construction (ADR-0030 orchestrator) ───────────────
      // buildComposableExecutionPayload owns forward-build + validation
      // resolution + remaining_accounts assembly in ADR-0016 order
      // ([...preTargets, ...forwardAccounts, ...postTargets]). The
      // scheduler_ata (permissionless path) is appended by the SDK facade
      // (sdk.executeComposable) via deriveSchedulerAta.
      const { instructionData, remainingAccounts } =
        await buildComposableExecutionPayload({
          connection: this.sdk.connection,
          policy: policy.account,
          composablePolicyPda: policy.publicKey,
          programId: this.sdk.programId,
          forwardBuilder,
          face,
        });

      const ixs = await this.sdk.executeComposable(
        policy.publicKey,
        instructionData,
        forwardAmount,
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
        logger.debug(sim.value.logs?.join("\n"));
        throw new Error(
          `simulation failed: ${JSON.stringify(sim.value.err)} (${
            parseErrorFromLogs(sim.value.logs ?? []).code
          })`
        );
      }

      const confirmStart = Date.now();
      const signature = await this.sdk.provider.sendAndConfirm(
        transaction,
        [],
        {
          commitment: "confirmed",
          skipPreflight: false,
        }
      );
      observeTxConfirm("composable", (Date.now() - confirmStart) / 1000);

      logger.debug(
        `✅ Composable executed: ${policy.publicKey.toString()} → ${signature}`
      );
      this.cooldowns.delete(policy.publicKey.toBase58());
      recordTx("composable", "success");

      // Refresh cached account so tick() sees post-execution state
      // (advanced nextPaymentDue, incremented paymentCount, etc.)
      // without waiting up to 10 min for the next rescan.
      try {
        const updated = await this.sdk.program.account.composablePolicy.fetch(
          policy.publicKey
        );
        if (updated) {
          this.watched.set(policy.publicKey.toBase58(), {
            ...policy,
            account: updated as ComposablePolicy,
          });
        } else {
          // Account closed (completed/deleted) — stop watching
          this.watched.delete(policy.publicKey.toBase58());
        }
      } catch {
        // ponytail: best-effort — stale snapshot corrected on next rescan
      }
    } catch (error) {
      logger.error(`🚩 Composable failed: ${policy.publicKey.toString()}`);
      logger.error((error as Error).message);
      let errorCode = "unknown";
      if (error instanceof SendTransactionError) {
        errorCode = parseErrorFromLogs(error?.logs ?? []).code ?? "unknown";
        logger.error(errorCode);
      } else if (
        error instanceof Error &&
        error.message.startsWith("simulation failed:")
      ) {
        // pre-flight sim rejection — extract code already in the message
        const m = error.message.match(/\((\w+)\)$/);
        errorCode = m?.[1] ?? "SimulationFailed";
      }
      recordTx("composable", "fail");
      recordTxFail("composable", errorCode);
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
      const backoffExp = Math.min(
        Math.floor((entry.consecutiveFailures - MAX_FAILURES) / MAX_FAILURES),
        6
      );
      const multiplier = Math.pow(2, backoffExp);
      const cooldownMs = Math.min(COOLDOWN_MS * multiplier, COOLDOWN_MAX_MS);
      entry.cooldownUntil = Date.now() + cooldownMs;
      logger.warn(
        `${key} hit ${entry.consecutiveFailures} strikes — cooldown ${
          cooldownMs / 1000
        }s (backoff 2^${backoffExp})`
      );
    }
    this.cooldowns.set(key, entry);
  }
}

export { ComposableScheduler };
