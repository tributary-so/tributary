import { Router, Request, Response } from "express";
import { asyncHandler, ApiError } from "../middleware";
import { issueToken } from "../services/token-issuer";
import { walletRateLimit } from "../middleware/rateLimit";

const router: Router = Router();

const BASE58_TX_SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

router.post(
  "/issue",
  walletRateLimit({ windowMs: 60 * 1000, maxRequests: 10 }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      walletPublicKey,
      tokenMint,
      policyAddress,
      recipient,
      transactionSignature,
      trackingId,
    } = req.body;

    if (!walletPublicKey || typeof walletPublicKey !== "string") {
      throw new ApiError(400, "Missing or invalid walletPublicKey");
    }

    if (walletPublicKey.length < 32 || walletPublicKey.length > 44) {
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
