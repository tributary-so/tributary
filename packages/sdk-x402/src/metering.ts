/**
 * x402 Usage Metering Infrastructure
 *
 * Tracks API usage for pay-as-you-go payments including:
 * - Request counting
 * - Token usage (input/output)
 * - Compute units / processing time
 * - Data transfer (bytes in/out)
 * - Storage usage
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";
import BN from "bn.js";

// Type-only import for Express (optional dependency)
type ExpressNextFunction = (err?: any) => void;

/**
 * Metered resource types
 */
export type MeteredResource =
  | "requests" // API request count
  | "tokens.in" // Input tokens
  | "tokens.out" // Output tokens
  | "tokens.total" // Total tokens
  | "compute.units" // Compute units consumed
  | "time.ms" // Processing time in milliseconds
  | "bytes.in" // Bytes uploaded
  | "bytes.out" // Bytes downloaded
  | "storage.bytes" // Storage used
  | "storage.ops" // Storage operations
  | "credits" // Generic credits (application-specific)
  | "gpu.ms" // GPU time in milliseconds
  | "fine_tune.ops" // Fine-tuning operations
  | "embedding.dims"; // Embedding dimensions processed

/**
 * Usage record for a single request
 */
export interface UsageRecord {
  /** Unique request ID */
  requestId: string;
  /** Timestamp of the request */
  timestamp: number;
  /** Resource types used */
  usage: Partial<Record<MeteredResource, number>>;
  /** Optional: cost in smallest units (if pre-calculated) */
  cost?: number;
  /** Optional: metadata for the request */
  metadata?: Record<string, unknown>;
}

/**
 * Period summary for aggregation
 */
export interface PeriodSummary {
  /** Period start timestamp */
  startTime: number;
  /** Period end timestamp */
  endTime: number;
  /** Total usage across all requests */
  totalUsage: Partial<Record<MeteredResource, number>>;
  /** Number of requests in this period */
  requestCount: number;
  /** Total cost in smallest units */
  totalCost: number;
  /** Policy PDA this usage is tracked against */
  policyAddress: string;
}

/**
 * Usage tracking configuration
 */
export interface UsageTrackerConfig {
  /** Tributary SDK instance */
  sdk: Tributary;
  /** Connection for on-chain verification */
  connection: Connection;
  /** Policy PDA address */
  policyAddress: string;
  /** Period length in seconds (default: 86400 = 24 hours) */
  periodLengthSeconds?: number;
  /** Maximum amounts per period per resource type */
  limits?: Partial<Record<MeteredResource, number>>;
  /** Maximum chunk amount per request */
  maxChunkAmount: number;
  /** Callback when usage limit is approached */
  onLimitWarning?: (
    resource: MeteredResource,
    current: number,
    limit: number,
  ) => void;
  /** Callback when usage limit is exceeded */
  onLimitExceeded?: (
    resource: MeteredResource,
    current: number,
    limit: number,
  ) => void;
}

/**
 * Metered service wrapper for API endpoints
 */
export interface MeteredService {
  /** Track a single request's usage */
  trackUsage(
    requestId: string,
    usage: UsageRecord["usage"],
    metadata?: Record<string, unknown>,
  ): void;
  /** Get current period summary */
  getCurrentPeriod(): PeriodSummary;
  /** Get usage since a given timestamp */
  getUsageSince(timestamp: number): UsageRecord[];
  /** Check if remaining quota is sufficient for expected usage */
  checkQuota(
    resource: MeteredResource,
    expectedUsage: number,
  ): { allowed: boolean; remaining: number };
  /** Reset current period (for testing or manual reset) */
  resetPeriod(): void;
}

/**
 * Token usage parser for common LLM responses
 */
export class TokenMeter {
  /**
   * Parse token usage from OpenAI-compatible response
   */
  static fromOpenAI(response: {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  }): Partial<Record<MeteredResource, number>> {
    const usage: Partial<Record<MeteredResource, number>> = {};
    const u = response.usage;

    if (u) {
      if (u.prompt_tokens) usage["tokens.in"] = u.prompt_tokens;
      if (u.completion_tokens) usage["tokens.out"] = u.completion_tokens;
      if (u.total_tokens) usage["tokens.total"] = u.total_tokens;
    }

    return usage;
  }

  /**
   * Estimate token count from text (rough approximation)
   */
  static estimateFromText(text: string): number {
    // Average: 4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate token count from JSON
   */
  static estimateFromJSON(json: unknown): number {
    const jsonStr = JSON.stringify(json);
    return this.estimateFromText(jsonStr);
  }
}

/**
 * Compute unit calculator for various operations
 */
export class ComputeMeter {
  /**
   * Calculate compute units for a model based on input/output tokens
   */
  static calculateForLLM(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    // Model-specific multipliers (example values)
    const modelMultipliers: Record<string, { input: number; output: number }> =
      {
        "gpt-4": { input: 30, output: 60 },
        "gpt-4-turbo": { input: 10, output: 30 },
        "gpt-3.5-turbo": { input: 10, output: 20 },
        "claude-3-opus": { input: 15, output: 75 },
        "claude-3-sonnet": { input: 3, output: 15 },
        "claude-3-haiku": { input: 0.25, output: 1.25 },
        default: { input: 10, output: 20 },
      };

    const multiplier = modelMultipliers[model] || modelMultipliers["default"];
    return inputTokens * multiplier.input + outputTokens * multiplier.output;
  }

  /**
   * Calculate compute units for embedding
   */
  static calculateForEmbedding(
    model: string,
    _dimensions: number,
    inputTokens: number,
  ): number {
    // Embedding models typically have fixed cost per token
    const modelCosts: Record<string, number> = {
      "text-embedding-3-small": 0.02,
      "text-embedding-3-large": 0.13,
      "text-embedding-ada-v2": 0.1,
      default: 0.1,
    };

    const costPerToken = modelCosts[model] || modelCosts["default"];
    return Math.ceil(inputTokens * costPerToken);
  }

  /**
   * Calculate compute units for fine-tuning
   */
  static calculateForFineTune(
    epochs: number,
    trainingExamples: number,
    modelSizeParams: number,
  ): number {
    // Rough estimate: cost proportional to epochs * examples * model size
    const baseCostPerExample = 0.0001;
    return Math.ceil(
      epochs *
        trainingExamples *
        Math.log10(modelSizeParams) *
        baseCostPerExample,
    );
  }
}

/**
 * Usage tracker implementation
 */
export class UsageTracker implements MeteredService {
  private config: UsageTrackerConfig;
  private currentPeriodStart: number;
  private periodUsage: Partial<Record<MeteredResource, number>>;
  private requestHistory: UsageRecord[];
  private readonly maxHistorySize = 10000;

  constructor(config: UsageTrackerConfig) {
    this.config = config;
    this.currentPeriodStart = Date.now();
    this.periodUsage = {};
    this.requestHistory = [];
  }

  trackUsage(
    requestId: string,
    usage: UsageRecord["usage"],
    metadata?: Record<string, unknown>,
  ): void {
    const record: UsageRecord = {
      requestId,
      timestamp: Date.now(),
      usage,
      metadata,
    };

    // Add to request history
    this.requestHistory.push(record);
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.shift();
    }

    // Aggregate usage
    for (const [resource, amount] of Object.entries(usage)) {
      if (amount && amount > 0) {
        const current = this.periodUsage[resource as MeteredResource] || 0;
        this.periodUsage[resource as MeteredResource] = current + amount;

        // Check limits
        this.checkLimit(resource as MeteredResource, current + amount);
      }
    }
  }

  private checkLimit(resource: MeteredResource, current: number): void {
    const limit = this.config.limits?.[resource];
    if (limit === undefined) return;

    const warningThreshold = limit * 0.8;
    const exceededThreshold = limit;

    if (
      current >= warningThreshold &&
      current < exceededThreshold &&
      this.config.onLimitWarning
    ) {
      this.config.onLimitWarning(resource, current, limit);
    } else if (current >= exceededThreshold && this.config.onLimitExceeded) {
      this.config.onLimitExceeded(resource, current, limit);
    }
  }

  /**
   * Read the configured limit for a resource. Public so report generators
   * (generateUsageReport) can compute remainingBudget against the limit,
   * not against usage. See SDK-1 (review 2026-07-06).
   */
  getLimit(resource: MeteredResource): number | undefined {
    return this.config.limits?.[resource];
  }

  getCurrentPeriod(): PeriodSummary {
    const now = Date.now();

    return {
      startTime: this.currentPeriodStart,
      endTime: now,
      totalUsage: { ...this.periodUsage },
      requestCount: this.requestHistory.filter(
        (r) => r.timestamp >= this.currentPeriodStart,
      ).length,
      totalCost: this.calculateTotalCost(),
      policyAddress: this.config.policyAddress,
    };
  }

  getUsageSince(timestamp: number): UsageRecord[] {
    return this.requestHistory.filter((r) => r.timestamp >= timestamp);
  }

  checkQuota(
    resource: MeteredResource,
    expectedUsage: number,
  ): { allowed: boolean; remaining: number } {
    const limit = this.config.limits?.[resource];
    if (limit === undefined) {
      // No limit set for this resource
      return { allowed: true, remaining: Infinity };
    }

    const current = this.periodUsage[resource] || 0;
    const remaining = Math.max(0, limit - current);
    const allowed = remaining >= expectedUsage;

    return { allowed, remaining };
  }

  resetPeriod(): void {
    this.currentPeriodStart = Date.now();
    this.periodUsage = {};
    this.requestHistory = [];
  }

  private calculateTotalCost(): number {
    // Calculate cost based on usage and policy limits
    // This is a simplified calculation - actual implementation would use
    // the specific pricing model from the payment policy
    const usage = this.periodUsage;

    // Default pricing (example: $0.01 per 1000 tokens, $0.03 per 1000 compute units)
    let totalCost = 0;

    if (usage["tokens.total"]) {
      totalCost += Math.ceil(usage["tokens.total"] * 0.00001); // $0.01 per 1000 tokens
    }
    if (usage["compute.units"]) {
      totalCost += Math.ceil(usage["compute.units"] * 0.00003); // $0.03 per 1000 compute units
    }
    if (usage["requests"]) {
      totalCost += Math.ceil(usage["requests"] * 100); // $0.001 per request
    }
    if (usage["bytes.out"]) {
      totalCost += Math.ceil(usage["bytes.out"] * 0.0000001); // $0.0001 per MB
    }

    return Math.min(totalCost, this.config.maxChunkAmount);
  }
}

/**
 * Factory function to create a usage tracker from a payment policy
 */
export async function createUsageTracker(
  sdk: Tributary,
  connection: Connection,
  policyAddress: string,
  maxChunkAmount: number,
): Promise<UsageTracker> {
  const policy = await sdk.getPaymentPolicy(new PublicKey(policyAddress));

  if (!policy) {
    throw new Error(`Policy not found: ${policyAddress}`);
  }

  // Extract pay-as-you-go limits from policy
  const paygData = policy.policyType.payAsYouGo;
  if (!paygData) {
    throw new Error(`Policy is not a pay-as-you-go policy: ${policyAddress}`);
  }

  const limits: Partial<Record<MeteredResource, number>> = {
    credits: paygData.maxAmountPerPeriod.toNumber(),
  };

  return new UsageTracker({
    sdk,
    connection,
    policyAddress,
    periodLengthSeconds: paygData.periodLengthSeconds.toNumber(),
    limits,
    maxChunkAmount,
  });
}

/**
 * Express middleware for automatic usage tracking
 */
export function createUsageTrackingMiddleware(
  tracker: UsageTracker,
  options?: {
    /**
     * Function to extract usage from request/response
     * Return null to skip tracking for this request
     */
    extractUsage?: (
      req: any,
      res: any,
    ) => Partial<Record<MeteredResource, number>> | null;
    /**
     * Request ID generator
     */
    generateRequestId?: () => string;
  },
) {
  const extractUsage = options?.extractUsage || defaultUsageExtractor;
  const generateRequestId =
    options?.generateRequestId ||
    (() => `req_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  return async (req: any, res: any, next: ExpressNextFunction) => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Capture response
    const originalSend = res.send;
    res.send = function (body: any) {
      return originalSend.call(this, body);
    };

    // Track usage after response completes
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const usage = extractUsage(req, res);

      if (usage) {
        // Add timing
        usage["time.ms"] = duration;

        // Add request count
        usage["requests"] = 1;

        tracker.trackUsage(requestId, usage, {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          contentLength: res.get("content-length"),
        });
      }
    });

    next();
  };
}

/**
 * Default usage extractor for common patterns
 */
function defaultUsageExtractor(
  req: any,
  res: any,
): Partial<Record<MeteredResource, number>> | null {
  const usage: Partial<Record<MeteredResource, number>> = {};

  // Check for OpenAI-style usage in response
  if (res.locals?.usage || res._events?.finish) {
    // Will be populated from response
  }

  // Add request/response size tracking if headers available
  const contentLength = req.get("content-length");
  if (contentLength) {
    usage["bytes.in"] = parseInt(contentLength, 10);
  }

  const responseSize = res.get("content-length");
  if (responseSize) {
    usage["bytes.out"] = parseInt(responseSize, 10);
  }

  return usage;
}

/**
 * Usage reporting for x402 payment verification
 */
export interface UsageReport {
  /** Policy address */
  policyAddress: string;
  /** Current period summary */
  period: PeriodSummary;
  /** Remaining budget in smallest units */
  remainingBudget: number;
  /** Whether the usage is within policy limits */
  withinLimits: boolean;
  /** Estimated cost for current usage */
  estimatedCost: number;
}

/**
 * Settle an `upto` authorization from accumulated usage. Computes
 * `actual = min(totalCost, maxAmount)` and returns the settle instruction
 * for the facilitator to sign+send. Single-use: after the instruction lands,
 * the policy transitions `Active → Completed`.
 *
 * Caller is responsible for tracking the `requestId` ↔ policy binding.
 */
export async function settleFromUsage(
  sdk: Tributary,
  tracker: UsageTracker,
  policyPda: string,
  maxAmount: number,
): Promise<ReturnType<Tributary["executePayment"]>> {
  const period = tracker.getCurrentPeriod();
  const actual = Math.min(period.totalCost, maxAmount);
  return sdk.executePayment(new PublicKey(policyPda), new BN(actual));
}

/**
 * Generate a usage report for x402 verification
 */
export function generateUsageReport(tracker: UsageTracker): UsageReport {
  const period = tracker.getCurrentPeriod();

  // Calculate remaining budget against the configured limit, not usage.
  // The previous form read period.totalUsage["credits"] for BOTH limit and
  // used, so remainingBudget was always 0. See SDK-1 (review 2026-07-06).
  const creditsLimit = tracker.getLimit("credits") ?? 0;
  const usedCredits = period.totalUsage["credits"] || 0;
  const remainingBudget = creditsLimit - usedCredits;

  // Check if within limits (allowing 10% buffer for rounding)
  const withinLimits = remainingBudget >= -Math.ceil(creditsLimit * 0.1);

  return {
    policyAddress: period.policyAddress,
    period,
    remainingBudget,
    withinLimits,
    estimatedCost: period.totalCost,
  };
}
