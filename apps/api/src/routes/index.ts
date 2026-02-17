/**
 * Routes Index
 * Central route registry with v1 API prefix
 */

import { Router } from "express";
import healthRouter from "./health";
import skillRouter from "./skill";
import subscriptionRouter from "./subscription";

const router: Router = Router();

/**
 * API v1 Routes
 * All routes are prefixed with /api/v1
 */

// Health check
router.use("/health", healthRouter);

// Skill generation
router.use("/skill", skillRouter);

// Subscription management
router.use("/subscriptions", subscriptionRouter);

export default router;
