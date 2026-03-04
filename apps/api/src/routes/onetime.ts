import { Router, Request, Response } from "express";
import { getOneTimePaymentDetails } from "../services/onetime";
import { asyncHandler, ApiError } from "../middleware";
import { ApiResponse } from "../types";

const router: Router = Router();

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
