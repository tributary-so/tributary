import { Router, Request, Response } from "express";
import { asyncHandler, ApiError } from "../middleware";
import { issueToken } from "../services/token-issuer";
import { walletRateLimit } from "../middleware/rateLimit";

const router: Router = Router();

const BASE58_TX_SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

/**
 * @openapi
 * /v1/tokens/issue:
 *   post:
 *     summary: Issue a short-lived JWT
 *     description: >
 *       Validates that the caller has an active subscription policy (or a
 *       recent payment transaction signature) and issues a JWT bound to the
 *       subscription. Rate-limited to 200 requests per minute per wallet.
 *     tags: [Tokens]
 *     operationId: issueToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletPublicKey:
 *                 type: string
 *                 minLength: 32
 *                 maxLength: 44
 *                 description: Caller wallet public key (required unless `transactionSignature` is supplied).
 *               tokenMint:
 *                 type: string
 *                 minLength: 32
 *                 maxLength: 44
 *                 description: SPL token mint of the subscription.
 *               policyAddress:
 *                 type: string
 *                 minLength: 32
 *                 maxLength: 44
 *                 description: Specific payment policy address.
 *               recipient:
 *                 type: string
 *                 minLength: 32
 *                 maxLength: 44
 *                 description: Recipient wallet public key.
 *               transactionSignature:
 *                 type: string
 *                 pattern: '^[1-9A-HJ-NP-Za-km-z]{87,88}$'
 *                 description: Base58 transaction signature of a recent payment.
 *               trackingId:
 *                 type: string
 *                 description: Checkout tracking ID.
 *     responses:
 *       200:
 *         description: JWT issued.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Token bundle (shape defined by the token issuer service).
 *       400:
 *         description: Invalid request body (bad public key, signature, etc.).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No active subscription or transaction not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       422:
 *         description: Payment record found but does not match the caller.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Rate limit exceeded.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Token issuance failure.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post(
  "/issue",
  walletRateLimit({ windowMs: 60 * 1000, maxRequests: 200 }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      walletPublicKey,
      tokenMint,
      policyAddress,
      recipient,
      transactionSignature,
      trackingId,
    } = req.body;

    if (
      walletPublicKey !== undefined &&
      (typeof walletPublicKey !== "string" ||
        walletPublicKey.length < 32 ||
        walletPublicKey.length > 44)
    ) {
      throw new ApiError(400, "Invalid walletPublicKey format");
    }

    if (
      tokenMint !== undefined &&
      (typeof tokenMint !== "string" ||
        tokenMint.length < 32 ||
        tokenMint.length > 44)
    ) {
      throw new ApiError(400, "Invalid tokenMint format");
    }

    if (
      recipient !== undefined &&
      (typeof recipient !== "string" ||
        recipient.length < 32 ||
        recipient.length > 44)
    ) {
      throw new ApiError(400, "Invalid recipient format");
    }

    if (
      transactionSignature !== undefined &&
      (typeof transactionSignature !== "string" ||
        !BASE58_TX_SIG_RE.test(transactionSignature))
    ) {
      throw new ApiError(400, "Invalid transactionSignature format");
    }

    try {
      const result = await issueToken({
        walletPublicKey,
        tokenMint,
        policyAddress,
        recipient,
        transactionSignature,
        trackingId,
      });

      res.json(result);
    } catch (err: any) {
      if (
        err.message === "No active subscription policies found" ||
        err.message === "No active subscription policies or payments found"
      ) {
        throw new ApiError(404, err.message);
      }
      if (err.message === "Transaction not found") {
        throw new ApiError(404, err.message);
      }
      if (err.message === "No PaymentRecord event found in transaction logs") {
        throw new ApiError(422, err.message);
      }
      if (
        err.message === "PaymentRecord payer does not match walletPublicKey"
      ) {
        throw new ApiError(422, err.message);
      }
      console.error(err);
      throw new ApiError(500, "Failed to issue token");
    }
  })
);

export default router;
