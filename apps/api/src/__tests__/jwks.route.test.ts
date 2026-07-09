import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";
import { errorHandler } from "../middleware/errorHandler";

jest.mock("../services/jwks", () => ({
  getJwks: jest.fn(),
}));
import jwksRouter from "../routes/jwks";
import { getJwks } from "../services/jwks";

const mockGetJwks = getJwks as jest.MockedFunction<typeof getJwks>;

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/.well-known/jwks.json", jwksRouter);
  app.use(errorHandler);
  return app;
}

describe("JWKS API Routes", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("GET /.well-known/jwks.json", () => {
    it("should return JWKS with cache headers", async () => {
      mockGetJwks.mockResolvedValueOnce({
        keys: [
          {
            kty: "EC",
            crv: "P-256",
            kid: "trib-2026-03-31-a",
            alg: "ES256",
            use: "sig",
            x: "test-x",
            y: "test-y",
          },
        ],
      });

      const response = await request(app)
        .get("/.well-known/jwks.json")
        .expect(200);

      expect(response.body.keys).toHaveLength(1);
      expect(response.body.keys[0].kid).toBe("trib-2026-03-31-a");
      expect(response.body.keys[0].alg).toBe("ES256");
      expect(response.headers["cache-control"]).toBe("public, max-age=3600");
    });

    it("should return empty keys array when no keys", async () => {
      mockGetJwks.mockResolvedValueOnce({ keys: [] });

      const response = await request(app)
        .get("/.well-known/jwks.json")
        .expect(200);

      expect(response.body.keys).toHaveLength(0);
    });

    it("should handle service errors", async () => {
      mockGetJwks.mockRejectedValueOnce(new Error("Database error"));

      await request(app).get("/.well-known/jwks.json").expect(500);
    });
  });
});
