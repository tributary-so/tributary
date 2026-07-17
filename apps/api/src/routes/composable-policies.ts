/**
 * Composable Policies Routes
 *
 * Read-only ComposablePolicy family, mirroring `/payment-policies`:
 *   GET /                       → filtered list
 *   GET /:address               → single account (RPC)
 *   GET /:address/executions    → ComposableExecuted event history
 *
 * Filter rules are identical to `/payment-policies` and `/subscriptions`:
 * 1–3 filters, and `walletPublicKey`/`tokenMint` must arrive as a pair.
 */

import { Router, Request, Response } from "express";
import { PolicyLookupOptions } from "@tributary-so/payments";
import {
  getComposablePolicyDetails,
  getComposablePolicyByAddress,
} from "../services/composable";
import { getComposableExecutionsByPolicyAddress } from "../db/queries";
import { asyncHandler, ApiError } from "../middleware";
import { ApiResponse } from "../types";

const router: Router = Router();

/**
 * @openapi
 * /v1/composable-policies:
 *   get:
 *     summary: List composable policies
 *     description: >
 *       Returns matching ComposablePolicy records. Provide at least one
 *       filter (up to three combined). If `walletPublicKey` is given,
 *       `tokenMint` is also required.
 *     tags: [ComposablePolicies]
 *     operationId: getComposablePolicies
 *     parameters:
 *       - in: query
 *         name: trackingId
 *         schema: { type: string }
 *         description: Tracking ID (32-byte memo).
 *       - in: query
 *         name: userPublicKey
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: User payment PDA public key.
 *       - in: query
 *         name: walletPublicKey
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: User wallet public key (requires `tokenMint`).
 *       - in: query
 *         name: gatewayPublicKey
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: Gateway authority public key.
 *       - in: query
 *         name: tokenMint
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: SPL token mint. Defaults to USDC when omitted.
 *       - in: query
 *         name: recipient
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: Recipient wallet public key.
 *     responses:
 *       200:
 *         description: Matching composable policy records (variant, status, forward_config, validation specs).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data, timestamp]
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Normalized composable policy record.
 *                 timestamp: { type: integer, description: "Unix epoch ms." }
 *       400:
 *         description: Invalid filter combination (missing/required pair, &lt;1 or &gt;3 filters).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No matching composable policy found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      trackingId,
      userPublicKey,
      walletPublicKey,
      gatewayPublicKey,
      tokenMint,
      recipient,
    } = req.query;

    // walletPublicKey and tokenMint must be provided together
    if (!!walletPublicKey !== !!tokenMint) {
      throw new ApiError(
        400,
        "If you provide walletPublicKey or tokenMint, you must provide both"
      );
    }

    const options: PolicyLookupOptions = {};
    if (trackingId) options.trackingId = trackingId as string;
    if (userPublicKey) options.userPublicKey = userPublicKey as string;
    if (gatewayPublicKey) options.gatewayPublicKey = gatewayPublicKey as string;
    if (tokenMint) options.tokenMint = tokenMint as string;
    if (walletPublicKey) options.walletPublicKey = walletPublicKey as string;
    if (recipient) options.recipient = recipient as string;

    if (Object.keys(options).length < 1) {
      throw new ApiError(
        400,
        "Must specify one of trackingId, userPublicKey, gatewayPublicKey, recipient, or (walletPublicKey & tokenMint)!"
      );
    }

    if (Object.keys(options).length > 3) {
      throw new ApiError(
        400,
        "Too many filters specified. Up to 3 query args allowed."
      );
    }

    const details = await getComposablePolicyDetails(options);

    if (!details || details.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: "Composable policy not found",
        timestamp: Date.now(),
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: details,
      timestamp: Date.now(),
    };
    res.json(response);
  })
);

/**
 * @openapi
 * /v1/composable-policies/{address}:
 *   get:
 *     summary: Get a single composable policy
 *     description: Fetches a ComposablePolicy account directly from RPC by its on-chain address (PDA).
 *     tags: [ComposablePolicies]
 *     operationId: getComposablePolicyByAddress
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: ComposablePolicy account address (PDA).
 *     responses:
 *       200:
 *         description: The composable policy (memo decoded, BN fields as numbers, padding stripped, forward_config + validation specs included).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data, timestamp]
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   description: Normalized composable policy record.
 *                 timestamp: { type: integer, description: "Unix epoch ms." }
 *       400:
 *         description: Missing or invalid address.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No account at that address.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get(
  "/:address",
  asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.params;
    if (!address) {
      throw new ApiError(400, "Missing address parameter");
    }

    let details;
    try {
      details = await getComposablePolicyByAddress(address);
    } catch {
      throw new ApiError(400, "Invalid composable policy address");
    }

    if (!details) {
      const response: ApiResponse = {
        success: false,
        error: "Composable policy not found",
        timestamp: Date.now(),
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: details,
      timestamp: Date.now(),
    };
    res.json(response);
  })
);

/**
 * @openapi
 * /v1/composable-policies/{address}/executions:
 *   get:
 *     summary: Composable execution history for a policy
 *     description: >
 *       Returns ComposableExecuted events emitted for the given
 *       ComposablePolicy, newest first. Paginated via `limit` (default 100)
 *       and `offset` (default 0).
 *     tags: [ComposablePolicies]
 *     operationId: getComposablePolicyExecutions
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: ComposablePolicy account address (PDA).
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 100 }
 *         description: Maximum records to return.
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *         description: Number of records to skip.
 *     responses:
 *       200:
 *         description: Execution records for the policy (may be empty).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data, timestamp]
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: A ComposableExecuted event (signature, slot, timestamp, input/output amounts, fees).
 *                 timestamp: { type: integer, description: "Unix epoch ms." }
 *       400:
 *         description: Missing address.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get(
  "/:address/executions",
  asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.params;
    const { limit, offset } = req.query;

    if (!address) {
      throw new ApiError(400, "Missing address parameter");
    }

    const records = await getComposableExecutionsByPolicyAddress(address, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    const response: ApiResponse = {
      success: true,
      data: records,
      timestamp: Date.now(),
    };
    res.json(response);
  })
);

export default router;
