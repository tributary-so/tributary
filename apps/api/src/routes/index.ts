/**
 * Routes Index
 * Central route registry with v1 API prefix
 */

import { Router } from "express";
import healthRouter from "./health";
import skillRouter from "./skill";
import subscriptionRouter from "./subscription";
import eventsRouter from "./events";
import onetimeRouter from "./onetime";
import webhooksRouter from "./webhooks";

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

// One-time payment queries
router.use("/onetime", onetimeRouter);

// Event queries
router.use("/events", eventsRouter);

// One-time payment lookup
router.use("/onetime", onetimeRouter);

// Webhook management
router.use("/webhooks", webhooksRouter);

export default router;
