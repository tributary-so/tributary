/**
 * Payment Policies Routes
 *
 * Read-only PaymentPolicy family: list (filtered), single by address, and
 * execution history. The list endpoint intentionally mirrors the
 * `/subscriptions` response shape — `/payment-policies` is the canonical
 * name for the same data; `/subscriptions` is kept as a deprecated alias.
 *
 * Filter rules are identical to `subscription.ts`: 1–3 filters, and
 * `walletPublicKey`/`tokenMint` must be supplied as a pair.
 */

import { Router, Request, Response } from "express";
import { Keypair, PublicKey } from "@solana/web3.js";
import { PolicyLookupOptions } from "@tributary-so/payments";
import { Tributary, decodeMemo, PaymentPolicy } from "@tributary-so/sdk";
import { getConnection } from "../services/solana";
import {
  getSubscriptionDetails,
  SubscriptionDetails,
} from "../services/subscription";
import { getPaymentExecutionsByPolicyAddress } from "../db/queries";
import { asyncHandler, ApiError } from "../middleware";
import { ApiResponse } from "../types";

const router: Router = Router();

/**
 * Build a normalized, JSON-safe {@link SubscriptionDetails}-shaped object from
 * a raw on-chain {@link PaymentPolicy} account.
 *
 * ponytail: this mirrors the per-account normalization in
 * `services/subscription.ts` (use #2 of the same transform). Extract a shared
 * helper once the composable-policy service lands (use #3) — until then the
 * duplication is deliberate and bounded.
 */
function normalizePaymentPolicy(
  account: PaymentPolicy,
  publicKey: PublicKey
): SubscriptionDetails {
  // Strip the trailing `padding` field from whichever policyType variant is active.
  let policyType: SubscriptionDetails["policyType"];
  const variant = account.policyType as Record<
    string,
    Record<string, unknown> | undefined
  >;
  const activeKey = Object.keys(variant)[0];
  if (activeKey && variant[activeKey]) {
    const { padding: _padding, ...rest } = variant[activeKey] as Record<
      string,
      unknown
    >;
    policyType = { [activeKey]: rest } as SubscriptionDetails["policyType"];
  }

  return {
    ...account,
    memo: decodeMemo(account.memo),
    padding: undefined,
    bump: undefined,
    totalPaid: account.totalPaid.toNumber(),
    createdAt: account.createdAt.toNumber(),
    updatedAt: account.updatedAt.toNumber(),
    policyType,
    policyAccount: publicKey,
  };
}

/**
 * Fetch a single PaymentPolicy account straight from RPC by its PDA address.
 *
 * ponytail: brief names `PaymentPolicyTracker` (rename in flight, bean
 * tributary-vd06). We construct a Tributary program instance directly — same
 * one-line pattern as `PaymentTracker`'s constructor — so this route compiles
 * today and doesn't grow a sibling-owned service file.
 */
async function fetchPaymentPolicyByAddress(
  address: string
): Promise<SubscriptionDetails | null> {
  const connection = getConnection();
  const tributary = new Tributary(connection, Keypair.generate());
  const account = await tributary.program.account.paymentPolicy.fetchNullable(
    address
  );
  if (!account) return null;
  return normalizePaymentPolicy(
    account as PaymentPolicy,
    new PublicKey(address)
  );
}

/**
 * @openapi
 * /v1/payment-policies:
 *   get:
 *     summary: List payment policies
 *     description: >
 *       Returns matching PaymentPolicy records. Provide at least one filter
 *       (up to three combined). If `walletPublicKey` is given, `tokenMint` is
 *       also required. Response shape mirrors `/v1/subscriptions`.
 *     tags: [PaymentPolicies]
 *     operationId: getPaymentPolicies
 *     parameters:
 *       - in: query
 *         name: trackingId
 *         schema: { type: string }
 *         description: Tracking ID assigned at checkout (memo).
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
 *         description: Matching payment policy records.
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
 *                     description: Payment policy record (variant, schedule, gateway, recipient, status).
 *                 timestamp: { type: integer, description: "Unix epoch ms." }
 *       400:
 *         description: Invalid filter combination (missing/required pair, &lt;1 or &gt;3 filters).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No matching payment policy found.
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

    // Reuses the subscription service (tracker + normalization) so the
    // `/payment-policies` list shape stays byte-identical to `/subscriptions`.
    const details = await getSubscriptionDetails(options);

    if (!details || details.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: "Payment policy not found",
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
 * /v1/payment-policies/{address}:
 *   get:
 *     summary: Get a single payment policy
 *     description: Fetches a PaymentPolicy account directly from RPC by its on-chain address (PDA).
 *     tags: [PaymentPolicies]
 *     operationId: getPaymentPolicyByAddress
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: PaymentPolicy account address (PDA).
 *     responses:
 *       200:
 *         description: The payment policy account (memo decoded, BN fields as numbers, padding stripped).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data, timestamp]
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   description: Normalized payment policy record.
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

    let details: SubscriptionDetails | null;
    try {
      details = await fetchPaymentPolicyByAddress(address);
    } catch {
      throw new ApiError(400, "Invalid payment policy address");
    }

    if (!details) {
      const response: ApiResponse = {
        success: false,
        error: "Payment policy not found",
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
 * /v1/payment-policies/{address}/executions:
 *   get:
 *     summary: Payment execution history for a policy
 *     description: >
 *       Returns PaymentRecord events emitted for the given PaymentPolicy,
 *       newest first. Paginated via `limit` (default 100) and `offset`
 *       (default 0).
 *     tags: [PaymentPolicies]
 *     operationId: getPaymentPolicyExecutions
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: PaymentPolicy account address (PDA).
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
 *                     description: A PaymentRecord event (signature, slot, timestamp, amount, gateway).
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

    const records = await getPaymentExecutionsByPolicyAddress(address, {
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
