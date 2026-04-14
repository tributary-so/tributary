import { Router, Request, Response } from "express";
import { asyncHandler, ApiError } from "../middleware";
import { rotateKey } from "../services/jwks";
import { rateLimit } from "../middleware/rateLimit";

const router: Router = Router();

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

router.post(
  "/keys/rotate",
  asyncHandler(async (req: Request, res: Response) => {
    const adminKey = req.headers["x-admin-key"];
    if (!ADMIN_API_KEY || adminKey !== ADMIN_API_KEY) {
      throw new ApiError(401, "Invalid or missing admin API key");
    }

    const result = await rotateKey();

    res.json({
      message: "Key rotated successfully",
      newKid: result.newKid,
      oldKid: result.oldKid,
      gracePeriodEndsAt: result.gracePeriodEndsAt,
    });
  })
);

export default router;
