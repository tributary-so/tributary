import { Router, Request, Response } from "express";
import { getOneTimePaymentDetails } from "../services/onetime";
import { asyncHandler, ApiError } from "../middleware";
import { ApiResponse } from "../types";

const router: Router = Router();

/**
 * @openapi
 * /v1/onetime/{trackingId}:
 *   get:
 *     summary: Look up one-time payment
 *     description: >
 *       Returns one-time payment records for a tracking ID. Optionally filter
 *       by recipient and paginate with `limit` / `offset`.
 *     tags: [OneTime]
 *     operationId: getOneTimePayment
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema: { type: string }
 *         description: Tracking ID assigned at checkout.
 *       - in: query
 *         name: recipient
 *         schema: { type: string, minLength: 32, maxLength: 44 }
 *         description: Filter by recipient wallet public key.
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
 *         description: Matching one-time payment record(s).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data, timestamp]
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       description: Single record (when exactly one matches).
 *                     - type: array
 *                       items: { type: object }
 *                       description: Multiple records.
 *                 timestamp: { type: integer, description: "Unix epoch ms." }
 *       400:
 *         description: Missing `trackingId`.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No matching payment found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get(
  "/:trackingId",
  asyncHandler(async (req: Request, res: Response) => {
    const { trackingId } = req.params;
    const { recipient, limit, offset } = req.query;

    if (!trackingId) {
      throw new ApiError(400, "Missing trackingId parameter");
    }

    const details = await getOneTimePaymentDetails(trackingId, {
      recipient: recipient as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    if (!details || details.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: "One-time payment not found",
        timestamp: Date.now(),
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: details.length === 1 ? details[0] : details,
      timestamp: Date.now(),
    };

    res.json(response);
  })
);

export default router;
