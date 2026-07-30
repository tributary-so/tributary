/**
 * Routes Index
 * Central route registry with v1 API prefix
 */

import { Router } from "express";
import healthRouter from "./health";
import skillRouter from "./skill";
import subscriptionRouter from "./subscription";
import paymentPoliciesRouter from "./payment-policies";
import composablePoliciesRouter from "./composable-policies";
import eventsRouter from "./events";
import onetimeRouter from "./onetime";
import webhooksRouter from "./webhooks";
import tokensRouter from "./tokens";
import adminRouter from "./admin";
import gatewayRouter from "./gateway";
import assetsRouter from "./assets";
import poolsRouter from "./pools";

const router: Router = Router();

/**
 * API v1 Routes
 * All routes are prefixed with /api/v1
 */

// Health check
router.use("/health", healthRouter);

// Skill generation
router.use("/skill", skillRouter);

// Subscription management (deprecated alias — kept for backward compat)
router.use("/subscriptions", subscriptionRouter);

// Payment policies (canonical PaymentPolicy family: list / single / executions)
router.use("/payment-policies", paymentPoliciesRouter);

// Composable policies (ComposablePolicy family: list / single / executions)
router.use("/composable-policies", composablePoliciesRouter);

// One-time payment queries
router.use("/onetime", onetimeRouter);

// Event queries
router.use("/events", eventsRouter);

// One-time payment lookup
router.use("/onetime", onetimeRouter);

// Webhook management
router.use("/webhooks", webhooksRouter);

// Token management (JWT issuance)
router.use("/tokens", tokensRouter);

// Admin routes (key rotation)
router.use("/admin", adminRouter);

// Gateway merchant layer (auth + merchant endpoints)
router.use("/gateway", gatewayRouter);

// Asset catalog proxy (tokens.xyz — see ADR-0028)
router.use("/assets", assetsRouter);

// Pool resolver — free-text pool search over the cached index (milestone tributary-gq0p)
router.use("/pools", poolsRouter);

export default router;
