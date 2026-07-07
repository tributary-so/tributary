import { Router, Request, Response } from "express";
import { asyncHandler, ApiError } from "../middleware";
import { rotateKey } from "../services/jwks";

const router: Router = Router();

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * @openapi
 * /v1/admin/keys/rotate:
 *   post:
 *     summary: Rotate the JWT signing key
 *     description: >
 *       Generates a new signing key, promotes it as active, and keeps the
 *       previous key in the JWKS for a grace period so in-flight tokens
 *       continue to validate. Requires the `x-admin-key` header.
 *     tags: [Admin]
 *     operationId: rotateKey
 *     security:
 *       - AdminApiKey: []
 *     responses:
 *       200:
 *         description: Key rotation result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [message, newKid, oldKid, gracePeriodEndsAt]
 *               properties:
 *                 message: { type: string, example: "Key rotated successfully" }
 *                 newKid: { type: string, description: "New active key ID." }
 *                 oldKid: { type: string, description: "Previous key ID (still in JWKS during grace)." }
 *                 gracePeriodEndsAt:
 *                   type: string
 *                   format: date-time
 *                   description: ISO 8601 timestamp after which the old key is retired.
 *       401:
 *         description: Missing or incorrect admin API key.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Rate limit exceeded.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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
