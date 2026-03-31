import { Router, Request, Response } from "express";
import { asyncHandler, ApiError } from "../middleware";
import { issueToken, refreshToken } from "../services/token-issuer";

const router: Router = Router();

router.post(
  "/issue",
  asyncHandler(async (req: Request, res: Response) => {
    const { walletPublicKey, tokenMint, policyAddress } = req.body;

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

    try {
      const result = await issueToken({
        walletPublicKey,
        tokenMint,
        policyAddress,
      });

      res.json(result);
    } catch (err: any) {
      if (err.message === "No subscription policies found for this wallet") {
        throw new ApiError(404, err.message);
      }
      throw new ApiError(500, "Failed to issue token");
    }
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Missing Authorization header");
    }

    const expiredToken = authHeader.slice(7);

    try {
      const result = await refreshToken(expiredToken);
      res.json(result);
    } catch (err: any) {
      if (
        err.message.includes("Invalid signature") ||
        err.message.includes("signing key") ||
        err.message.includes("signature")
      ) {
        throw new ApiError(401, "Invalid JWT signature");
      }
      if (err.message.includes("grace period")) {
        throw new ApiError(401, "Token expired beyond grace period");
      }
      if (err.message.includes("audience")) {
        throw new ApiError(401, err.message);
      }
      throw new ApiError(500, "Failed to refresh token");
    }
  })
);

export default router;
