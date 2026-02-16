/**
 * Subscription Status Route
 * Check subscription status based on tracking ID
 */

import { Router, Request, Response } from "express";
import { Tributary } from "@tributary-so/sdk";
import { PolicyLookupOptions } from "@tributary-so/payments";
import { Connection, Keypair } from "@solana/web3.js";
import { checkSubscriptionStatusWithTributary, getSubscriptionDetails } from "../services/subscription";
import { asyncHandler, ApiError } from "../middleware";
import { ApiResponse, SubscriptionStatusResponse, SubscriptionStatusRequest } from "../types";

const router = Router();

/**
 * GET /api/v1/subscription/status/:trackingId
 * Check subscription status by tracking ID
 * Query params:
 *   - userPublicKey: User's public key for user-based lookup
 *   - gatewayPublicKey: Gateway's public key for gateway-based lookup
 *   - tokenMint: Token mint address (defaults to USDC)
 */
router.get(
  "/status/:trackingId",
  asyncHandler(async (req: Request, res: Response) => {
    const { trackingId } = req.params;
    const { userPublicKey, gatewayPublicKey, tokenMint } = req.query;

    if (!trackingId) {
      throw new ApiError(400, "Missing trackingId parameter");
    }

    // Validate that at least one lookup option is provided
    if (!userPublicKey && !gatewayPublicKey) {
      throw new ApiError(
        400,
        "Either userPublicKey or gatewayPublicKey must be provided as query parameter"
      );
    }

    // Create Tributary instance (in production, this might be cached or injected)
    // We'll use the default Solana RPC
    const connection = new Connection(process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com");

    // We need a wallet/keypair to create the Tributary instance
    // For read-only operations, we can use a dummy keypair
    const dummyKeypair = Keypair.generate();
    const tributary = new Tributary(connection, dummyKeypair);

    const options: PolicyLookupOptions = {};
    if (userPublicKey) {
      options.userPublicKey = userPublicKey as string;
    }
    if (gatewayPublicKey) {
      options.gatewayPublicKey = gatewayPublicKey as string;
    }
    if (tokenMint) {
      options.tokenMint = tokenMint as string;
    }

    // Check subscription status
    const status = await checkSubscriptionStatusWithTributary(
      trackingId,
      tributary,
      options
    );

    const response: ApiResponse<SubscriptionStatusResponse> = {
      success: true,
      data: status,
      timestamp: Date.now(),
    };

    res.json(response);
  })
);

/**
 * GET /api/v1/subscription/:trackingId
 * Get full subscription details by tracking ID
 * Query params:
 *   - userPublicKey: User's public key for user-based lookup
 *   - gatewayPublicKey: Gateway's public key for gateway-based lookup
 *   - tokenMint: Token mint address (defaults to USDC)
 */
router.get(
  "/:trackingId",
  asyncHandler(async (req: Request, res: Response) => {
    const { trackingId } = req.params;
    const { userPublicKey, gatewayPublicKey, tokenMint } = req.query;

    if (!trackingId) {
      throw new ApiError(400, "Missing trackingId parameter");
    }

    // Validate that at least one lookup option is provided
    if (!userPublicKey && !gatewayPublicKey) {
      throw new ApiError(
        400,
        "Either userPublicKey or gatewayPublicKey must be provided as query parameter"
      );
    }

    // Create Tributary instance
    const connection = new Connection(process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com");

    const dummyKeypair = Keypair.generate();
    const tributary = new Tributary(connection, dummyKeypair);

    const options: PolicyLookupOptions = {};
    if (userPublicKey) {
      options.userPublicKey = userPublicKey as string;
    }
    if (gatewayPublicKey) {
      options.gatewayPublicKey = gatewayPublicKey as string;
    }
    if (tokenMint) {
      options.tokenMint = tokenMint as string;
    }

    // Get subscription details
    const details = await getSubscriptionDetails(trackingId, tributary, options);

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
