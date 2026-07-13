/**
 * Health Check Route
 * Provides API health status
 */

import { Router } from "express";
import { ApiResponse, HealthResponse } from "../types";

const router: Router = Router();

/**
 * @openapi
 * /v1/health:
 *   get:
 *     summary: Health check
 *     description: Returns service liveness, name, and version.
 *     tags: [Health]
 *     operationId: getHealth
 *     responses:
 *       200:
 *         description: Service is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data, timestamp]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [status, service, version]
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     service:
 *                       type: string
 *                       example: tributary-api
 *                     version:
 *                       type: string
 *                       example: "1.9.0"
 *                 timestamp:
 *                   type: integer
 *                   description: Unix epoch milliseconds.
 *                   example: 1719300000000
 */
router.get("/", (_req, res) => {
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
