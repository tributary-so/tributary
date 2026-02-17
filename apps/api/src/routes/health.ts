/**
 * Health Check Route
 * Provides API health status
 */

import { Router } from "express";
import { ApiResponse, HealthResponse } from "../types";

const router: Router = Router();

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get("/", (req, res) => {
  const response: ApiResponse<HealthResponse> = {
    success: true,
    data: {
      status: "ok",
      service: "tributary-api",
      version: process.env.npm_package_version || "1.0.0",
    },
    timestamp: Date.now(),
  };

  res.json(response);
});

export default router;
