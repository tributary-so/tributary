/**
 * Subscription Status Route
 * Check subscription status based on tracking ID
 */

import { Router, Request, Response } from "express";
import { PolicyLookupOptions } from "@tributary-so/payments";
import { getSubscriptionDetails } from "../services/subscription";
import { asyncHandler, ApiError } from "../middleware";
import { ApiResponse } from "../types";

const router: Router = Router();

/**
 * @openapi
 * /v1/subscriptions:
 *   get:
 *     summary: Look up subscription details
 *     description: >
 *       Returns matching subscription policy records. Provide at least one
 *       filter (up to three combined). If `walletPublicKey` is given,
 *       `tokenMint` is also required.
 *     tags: [Subscriptions]
 *     operationId: getSubscriptions
 *     parameters:
 *       - in: query
 *         name: trackingId
 *         schema: { type: string }
 *         description: Tracking ID assigned at checkout.
 *       - in: query
 *         name: userPublicKey
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: User (owner) wallet public key.
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
 *         description: Matching subscription records.
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
 *                     description: Subscription policy record (gateway, recipient, schedule, status).
 *                 timestamp: { type: integer, description: "Unix epoch ms." }
 *       400:
 *         description: Invalid filter combination (missing/required pair, &lt;1 or &gt;3 filters).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No matching subscription found.
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

    // Validate that at least one lookup option is provided
    if (walletPublicKey && !tokenMint) {
      throw new ApiError(
        400,
        "If you provide walletPublicKey you also have to provide tokenMint!"
      );
    }

    const options: PolicyLookupOptions = {};
    if (trackingId) {
      options.trackingId = trackingId as string;
    }
    if (userPublicKey) {
      options.userPublicKey = userPublicKey as string;
    }
    if (gatewayPublicKey) {
      options.gatewayPublicKey = gatewayPublicKey as string;
    }
    if (tokenMint) {
      options.tokenMint = tokenMint as string;
    }
    if (walletPublicKey) {
      options.walletPublicKey = walletPublicKey as string;
    }
    if (recipient) {
      options.recipient = recipient as string;
    }

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

    // Get subscription details
    const details = await getSubscriptionDetails(options);

    if (!details || details.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: "Subscription not found",
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

export default router;
