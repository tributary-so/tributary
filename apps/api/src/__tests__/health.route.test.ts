import { describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";
import healthRouter from "../routes/health";
import { errorHandler } from "../middleware/errorHandler";

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/health", healthRouter);
  app.use(errorHandler);
  return app;
}

describe("Health API Routes", () => {
  let app: Application;

  beforeEach(() => {
    app = createApp();
  });

  describe("GET /v1/health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/v1/health").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("ok");
      expect(response.body.data.service).toBe("tributary-api");
      expect(response.body.data.version).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it("should return correct content-type", async () => {
      const response = await request(app).get("/v1/health").expect(200);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return numeric timestamp", async () => {
      const response = await request(app).get("/v1/health").expect(200);

      expect(typeof response.body.timestamp).toBe("number");
      expect(response.body.timestamp).toBeGreaterThan(0);
    });

    it("should handle POST requests with 404", async () => {
      await request(app).post("/v1/health").expect(404);
    });

    it("should handle nested paths with 404", async () => {
      await request(app).get("/v1/health/nested").expect(404);
    });
  });
});
