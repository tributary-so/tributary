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
 * GET /api/v1/subscription/:gateway?trackingId=:trackingId
 * Get full subscription details by tracking ID
 * Path params:
 *   - gateway: Gateway's public key
 * Query params:
 *   - trackingId: Subscription tracking ID (required)
 *   - userPublicKey: User's public key for user-based lookup
 *   - gatewayPublicKey: Gateway's public key for gateway-based lookup
 *   - tokenMint: Token mint address (defaults to USDC)
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
    if ((walletPublicKey && !tokenMint) || (tokenMint && !walletPublicKey)) {
      throw new ApiError(
        400,
        "If you provide either walletPublicKey or tokenMint, you have to provide both!"
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

    if (!details) {
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
