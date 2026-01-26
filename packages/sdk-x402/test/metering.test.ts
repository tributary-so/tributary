/**
 * Unit tests for x402 metering utilities
 *
 * These tests verify the TokenMeter and ComputeMeter utility classes
 * without requiring external dependencies or blockchain connectivity.
 */

import { TokenMeter, ComputeMeter, UsageTracker } from "../src/metering";

describe("TokenMeter", () => {
  describe("fromOpenAI", () => {
    it("should parse OpenAI usage response correctly", () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      const usage = TokenMeter.fromOpenAI(response);

      expect(usage["tokens.in"]).toBe(100);
      expect(usage["tokens.out"]).toBe(50);
      expect(usage["tokens.total"]).toBe(150);
    });

    it("should handle partial usage data", () => {
      const response1 = {
        usage: {
          prompt_tokens: 50,
        },
      };

      const response2 = {
        usage: {
          completion_tokens: 25,
        },
      };

      expect(TokenMeter.fromOpenAI(response1)["tokens.in"]).toBe(50);
      expect(TokenMeter.fromOpenAI(response2)["tokens.out"]).toBe(25);
    });

    it("should return empty object for undefined usage", () => {
      const response = {};
      const usage = TokenMeter.fromOpenAI(response);

      expect(Object.keys(usage)).toHaveLength(0);
    });

    it("should return empty object for null-like usage", () => {
      const response = { usage: undefined };
      const usage = TokenMeter.fromOpenAI(response);

      expect(Object.keys(usage)).toHaveLength(0);
    });
  });

  describe("estimateFromText", () => {
    it("should estimate tokens based on character count", () => {
      const text = "Hello world! This is a test sentence.";
      const estimated = TokenMeter.estimateFromText(text);

      // "Hello world! This is a test sentence." = 39 chars
      // 39 / 4 = 9.75, ceil = 10
      expect(estimated).toBe(10);
    });

    it("should handle empty string", () => {
      expect(TokenMeter.estimateFromText("")).toBe(0);
    });

    it("should handle long text", () => {
      const text = "a".repeat(1000);
      expect(TokenMeter.estimateFromText(text)).toBe(250);
    });

    it("should handle unicode characters", () => {
      const text = "Hello 世界 🌍";
      // "Hello 世界 🌍" = 11 code units (emoji is 2)
      // 11 / 4 = 2.75, ceil = 3
      expect(TokenMeter.estimateFromText(text)).toBe(3);
    });
  });

  describe("estimateFromJSON", () => {
    it("should estimate tokens from JSON object", () => {
      const json = { name: "test", value: 123 };
      const estimated = TokenMeter.estimateFromJSON(json);

      // '{"name":"test","value":123}' = 26 chars
      // 26 / 4 = 6.5, ceil = 7
      expect(estimated).toBe(7);
    });

    it("should estimate tokens from nested JSON", () => {
      const json = {
        user: {
          id: 1,
          name: "John",
          preferences: {
            theme: "dark",
            notifications: true,
          },
        },
      };
      const estimated = TokenMeter.estimateFromJSON(json);
      expect(estimated).toBeGreaterThan(20);
    });

    it("should handle empty object", () => {
      // '{}' = 2 chars, 2/4 = 0.5, ceil = 1
      expect(TokenMeter.estimateFromJSON({})).toBe(1);
    });

    it("should handle arrays", () => {
      const json = [1, 2, 3, 4, 5];
      const estimated = TokenMeter.estimateFromJSON(json);
      // '[1,2,3,4,5]' = 11 chars, 11/4 = 2.75, ceil = 3
      expect(estimated).toBe(3);
    });
  });
});

describe("ComputeMeter", () => {
  describe("calculateForLLM", () => {
    it("should calculate compute units for GPT-4", () => {
      const units = ComputeMeter.calculateForLLM("gpt-4", 1000, 500);
      // 1000 * 30 + 500 * 60 = 30000 + 30000 = 60000
      expect(units).toBe(60000);
    });

    it("should calculate compute units for GPT-4 Turbo", () => {
      const units = ComputeMeter.calculateForLLM("gpt-4-turbo", 1000, 500);
      // 1000 * 10 + 500 * 30 = 10000 + 15000 = 25000
      expect(units).toBe(25000);
    });

    it("should calculate compute units for GPT-3.5 Turbo", () => {
      const units = ComputeMeter.calculateForLLM("gpt-3.5-turbo", 1000, 500);
      // 1000 * 10 + 500 * 20 = 10000 + 10000 = 20000
      expect(units).toBe(20000);
    });

    it("should calculate compute units for Claude 3", () => {
      const opus = ComputeMeter.calculateForLLM("claude-3-opus", 1000, 500);
      // 1000 * 15 + 500 * 75 = 15000 + 37500 = 52500
      expect(opus).toBe(52500);

      const sonnet = ComputeMeter.calculateForLLM("claude-3-sonnet", 1000, 500);
      // 1000 * 3 + 500 * 15 = 3000 + 7500 = 10500
      expect(sonnet).toBe(10500);
    });

    it("should use default multipliers for unknown models", () => {
      const units = ComputeMeter.calculateForLLM("unknown-model", 1000, 500);
      // 1000 * 10 + 500 * 20 = 20000 (default)
      expect(units).toBe(20000);
    });

    it("should handle zero tokens", () => {
      expect(ComputeMeter.calculateForLLM("gpt-4", 0, 0)).toBe(0);
    });
  });

  describe("calculateForEmbedding", () => {
    it("should calculate compute units for text-embedding-3-small", () => {
      const units = ComputeMeter.calculateForEmbedding(
        "text-embedding-3-small",
        1000,
        100
      );
      // 100 * 0.02 = 2
      expect(units).toBe(2);
    });

    it("should calculate compute units for text-embedding-3-large", () => {
      const units = ComputeMeter.calculateForEmbedding(
        "text-embedding-3-large",
        3072,
        500
      );
      // 500 * 0.13 = 65
      expect(units).toBe(65);
    });

    it("should use default cost for unknown models", () => {
      const units = ComputeMeter.calculateForEmbedding(
        "unknown-embedding",
        1536,
        100
      );
      // 100 * 0.1 = 10
      expect(units).toBe(10);
    });
  });

  describe("calculateForFineTune", () => {
    it("should calculate compute units for fine-tuning", () => {
      const units = ComputeMeter.calculateForFineTune(3, 1000, 1000000000);
      // 3 * 1000 * log10(1B) * 0.0001 = 3000 * 9 * 0.0001 = 2.7 -> 3
      expect(units).toBe(3);
    });

    it("should scale with epochs and examples", () => {
      const small = ComputeMeter.calculateForFineTune(1, 100, 1000000);
      // 1 * 100 * log10(1M) * 0.0001 = 100 * 6 * 0.0001 = 0.06 -> 1
      const large = ComputeMeter.calculateForFineTune(10, 10000, 1000000);
      // 10 * 10000 * log10(1M) * 0.0001 = 100000 * 6 * 0.0001 = 60 -> 60

      // Large should be more than small
      expect(large).toBeGreaterThan(small);
    });

    it("should handle zero values", () => {
      expect(ComputeMeter.calculateForFineTune(0, 100, 1000000)).toBe(0);
      expect(ComputeMeter.calculateForFineTune(3, 0, 1000000)).toBe(0);
    });
  });
});

describe("UsageTracker", () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker({
      sdk: {} as any,
      connection: {} as any,
      policyAddress: "testPolicyAddress",
      periodLengthSeconds: 86400,
      maxChunkAmount: 100000,
      limits: {
        credits: 1000000,
        "tokens.total": 100000,
        requests: 1000,
      },
    });
  });

  describe("trackUsage", () => {
    it("should track usage for a request", () => {
      tracker.trackUsage("req-1", {
        requests: 1,
        "tokens.in": 100,
        "tokens.out": 50,
      });

      const period = tracker.getCurrentPeriod();

      expect(period.requestCount).toBe(1);
      expect(period.totalUsage.requests).toBe(1);
      expect(period.totalUsage["tokens.in"]).toBe(100);
      expect(period.totalUsage["tokens.out"]).toBe(50);
    });

    it("should aggregate multiple requests", () => {
      tracker.trackUsage("req-1", { requests: 1 });
      tracker.trackUsage("req-2", { requests: 1 });
      tracker.trackUsage("req-3", { requests: 1 });

      const period = tracker.getCurrentPeriod();
      expect(period.requestCount).toBe(3);
      expect(period.totalUsage.requests).toBe(3);
    });

    it("should accumulate token usage", () => {
      tracker.trackUsage("req-1", { "tokens.total": 100 });
      tracker.trackUsage("req-2", { "tokens.total": 150 });
      tracker.trackUsage("req-3", { "tokens.total": 250 });

      const period = tracker.getCurrentPeriod();
      expect(period.totalUsage["tokens.total"]).toBe(500);
    });

    it("should store request history", () => {
      tracker.trackUsage("req-1", { requests: 1 }, { user: "alice" });
      tracker.trackUsage("req-2", { requests: 1 }, { user: "bob" });

      const history = tracker.getUsageSince(0);
      expect(history).toHaveLength(2);
      expect(history[0].requestId).toBe("req-1");
      expect(history[0].metadata?.user).toBe("alice");
    });

    it("should ignore zero or negative usage values", () => {
      tracker.trackUsage("req-1", { requests: 0 });

      const period = tracker.getCurrentPeriod();
      // trackUsage adds record to history, so requestCount is 1
      expect(period.requestCount).toBe(1);
      // but usage value is 0, so totalUsage.requests is not incremented
      expect(period.totalUsage.requests).toBeUndefined();
    });
  });

  describe("getCurrentPeriod", () => {
    it("should return period summary with correct structure", () => {
      tracker.trackUsage("req-1", { requests: 1, "tokens.total": 100 });

      const period = tracker.getCurrentPeriod();

      expect(period).toHaveProperty("startTime");
      expect(period).toHaveProperty("endTime");
      expect(period).toHaveProperty("totalUsage");
      expect(period).toHaveProperty("requestCount");
      expect(period).toHaveProperty("totalCost");
      expect(period).toHaveProperty("policyAddress");
      expect(period.policyAddress).toBe("testPolicyAddress");
    });

    it("should have startTime before endTime", () => {
      const period = tracker.getCurrentPeriod();
      expect(period.startTime).toBeLessThanOrEqual(period.endTime);
    });

    it("should have request count matching tracked requests", () => {
      tracker.trackUsage("req-1", { requests: 1 });
      tracker.trackUsage("req-2", { requests: 1 });

      const period = tracker.getCurrentPeriod();
      expect(period.requestCount).toBe(2);
    });
  });

  describe("getUsageSince", () => {
    it("should return usage records since timestamp", () => {
      const before = Date.now() - 1000;

      tracker.trackUsage("req-1", { requests: 1 });

      const after = Date.now() + 1000;

      tracker.trackUsage("req-2", { requests: 1 });

      const recent = tracker.getUsageSince(before);
      expect(recent).toHaveLength(2);
    });

    it("should return all records when timestamp is 0", () => {
      tracker.trackUsage("req-1", { requests: 1 });
      tracker.trackUsage("req-2", { requests: 1 });

      const all = tracker.getUsageSince(0);
      expect(all).toHaveLength(2);
    });
  });

  describe("checkQuota", () => {
    it("should return allowed=true when within limits", () => {
      const result = tracker.checkQuota("requests", 100);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1000);
    });

    it("should return allowed=false when exceeding limits", () => {
      const result = tracker.checkQuota("requests", 1500);

      expect(result.allowed).toBe(false);
      // remaining = limit - current = 1000 - 0 = 1000
      expect(result.remaining).toBe(1000);
    });

    it("should return allowed=true for unlimited resources", () => {
      const result = tracker.checkQuota("compute.units", 999999);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it("should track remaining quota after usage", () => {
      tracker.trackUsage("req-1", { requests: 500 });

      const result = tracker.checkQuota("requests", 400);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(500); // 1000 - 500
    });
  });

  describe("resetPeriod", () => {
    it("should reset all counters", () => {
      tracker.trackUsage("req-1", { requests: 100, "tokens.total": 5000 });
      tracker.trackUsage("req-2", { requests: 50 });

      tracker.resetPeriod();

      const period = tracker.getCurrentPeriod();
      expect(period.requestCount).toBe(0);
      // totalUsage is reset to {}, so accessing .requests returns undefined
      expect(period.totalUsage.requests).toBeUndefined();
      expect(period.totalUsage["tokens.total"]).toBeUndefined();
    });
  });
});
