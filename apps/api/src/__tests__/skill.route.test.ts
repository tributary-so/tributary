// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";
import skillRouter, { MarkdownTemplateEngine } from "../routes/skill";
import { errorHandler } from "../middleware/errorHandler";

jest.mock("@tributary-so/payments", () => ({
  CheckoutSessionManager: jest.fn().mockImplementation(() => ({
    decodeSubscriptionUrl: jest.fn().mockReturnValue({
      mode: "subscription",
      tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      amount: 10.5,
      paymentFrequency: "monthly",
      autoRenew: true,
      lineItems: [{ description: "Premium Plan", quantity: 1, unitPrice: 10 }],
      trackingId: "test_tracking_123",
      maxRenewals: null,
      startTime: null,
    }),
  })),
  SubscriptionParams: {},
}));

jest.mock("../services/solana", () => ({
  getMintDecimals: jest.fn().mockResolvedValue(6),
  convertAmountToInteger: jest.fn().mockReturnValue(10500000),
}));

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/skill", skillRouter);
  app.use(errorHandler);
  return app;
}

describe("Skill API Routes", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("GET /v1/skill/:encoded", () => {
    it("should return markdown content for valid encoded data", async () => {
      const response = await request(app)
        .get("/v1/skill/encoded_test_data")
        .expect(200);

      expect(response.headers["content-type"]).toMatch(/text\/markdown/);
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
    });

    it("should return 404 when encoded parameter is missing", async () => {
      await request(app).get("/v1/skill/").expect(404);
    });

    it("should handle decoding errors gracefully", async () => {
      const { CheckoutSessionManager } =
        require("@tributary-so/payments") as any;
      (CheckoutSessionManager as jest.Mock).mockImplementationOnce(() => ({
        decodeSubscriptionUrl: jest.fn().mockImplementation(() => {
          throw new Error("Invalid encoded data");
        }),
      }));

      const freshApp = createApp();
      const response = await request(freshApp)
        .get("/v1/skill/invalid_encoded")
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Internal server error");
    });

    it("should handle solana service errors gracefully", async () => {
      const { getMintDecimals } = require("../services/solana") as any;
      (getMintDecimals as jest.Mock).mockRejectedValueOnce(
        new Error("RPC error")
      );

      const freshApp = createApp();
      const response = await request(freshApp)
        .get("/v1/skill/error_test")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});

describe("MarkdownTemplateEngine", () => {
  describe("render", () => {
    it("should replace simple variables", () => {
      const template = "Hello, ${name}!";
      const data = { name: "World" };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Hello, World!");
    });

    it("should replace nested variables", () => {
      const template = "Amount: ${payment.amount} ${payment.currency}";
      const data = {
        payment: { amount: 100, currency: "USDC" },
      };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Amount: 100 USDC");
    });

    it("should handle multiple variables", () => {
      const template = "${greeting}, ${name}! Your balance is ${balance}.";
      const data = { greeting: "Hello", name: "Alice", balance: 1000 };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Hello, Alice! Your balance is 1000.");
    });

    it("should preserve unmatched variables", () => {
      const template = "Value: ${unknown}, Known: ${known}";
      const data = { known: "test" };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Value: ${unknown}, Known: test");
    });

    it("should handle empty data", () => {
      const template = "Static content only";
      const data = {};

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Static content only");
    });

    it("should handle null values in nested path", () => {
      const template = "Value: ${nested.null.value}";
      const data = { nested: { null: null } };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Value: ${nested.null.value}");
    });

    it("should handle undefined values in nested path", () => {
      const template = "Value: ${nested.undefined}";
      const data = { nested: {} };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Value: ${nested.undefined}");
    });

    it("should handle deeply nested variables", () => {
      const template = "Deep: ${a.b.c.d}";
      const data = { a: { b: { c: { d: "found" } } } };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Deep: found");
    });

    it("should handle numeric values", () => {
      const template = "Count: ${count}, Price: ${price}";
      const data = { count: 42, price: 99.99 };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Count: 42, Price: 99.99");
    });

    it("should handle boolean values", () => {
      const template = "Active: ${isActive}";
      const data = { isActive: true };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("Active: true");
    });
  });

  describe("renderFile", () => {
    it("should throw error for non-existent file", () => {
      expect(() => {
        MarkdownTemplateEngine.renderFile("/non/existent/file.md", {});
      }).toThrow();
    });
  });

  describe("evaluateExpression", () => {
    it("should handle empty expression", () => {
      const template = "${}";
      const data = { name: "test" };

      const result = MarkdownTemplateEngine.render(template, data);

      expect(result).toBe("${}");
    });
  });
});
