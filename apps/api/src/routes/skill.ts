/**
 * Skill Route
 * Generates Lando skill markdown from encoded subscription data
 */

import * as fs from "fs";
import * as path from "path";
import { Router, Request, Response } from "express";
import {
  CheckoutSessionManager,
  SubscriptionParams,
} from "@tributary-so/payments";
import { getMintDecimals, convertAmountToInteger } from "../services/solana";
import { asyncHandler, ApiError } from "../middleware";

const router: Router = Router();

export interface TemplateData {
  [key: string]: any;
}

export class MarkdownTemplateEngine {
  /**
   * Render a template string with data
   */
  static render(template: string, data: TemplateData): string {
    return template.replace(/\${([^}]+)}/g, (match, expression) => {
      try {
        const value = this.evaluateExpression(expression.trim(), data);
        return value !== undefined ? String(value) : match;
      } catch (error) {
        console.warn(`Template variable "${expression}" not found`);
        return match;
      }
    });
  }

  /**
   * Render a template file with data
   */
  static renderFile(filePath: string, data: TemplateData): string {
    const template = fs.readFileSync(filePath, "utf-8");
    return this.render(template, data);
  }

  private static evaluateExpression(
    expression: string,
    data: TemplateData
  ): any {
    const parts = expression.split(".");
    let value = data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }
}

/**
 * @openapi
 * /v1/skill/{encoded}:
 *   get:
 *     summary: Generate Lando skill markdown
 *     description: >
 *       Decodes a base64-encoded checkout session, fetches mint decimals
 *       on-chain, converts the human-readable amount to its integer
 *       representation, and renders a `text/markdown` skill document the
 *       Lando agent uses to drive the subscription checkout.
 *     tags: [Skill]
 *     operationId: getSkillMarkdown
 *     parameters:
 *       - in: path
 *         name: encoded
 *         required: true
 *         schema:
 *           type: string
 *         description: Base64-encoded subscription parameters produced by `CheckoutSessionManager`.
 *     responses:
 *       200:
 *         description: Rendered skill markdown.
 *         content:
 *           text/markdown:
 *             schema:
 *               type: string
 *       400:
 *         description: Missing or invalid `encoded` parameter.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to fetch mint info or render template.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:encoded",
  asyncHandler(async (req: Request, res: Response) => {
    const { encoded } = req.params;

    if (!encoded) {
      throw new ApiError(400, "Missing encoded data parameter");
    }

    const sessionManager = new CheckoutSessionManager();
    const decoded = sessionManager.decodeSubscriptionUrl(encoded);

    // This endpoint generates subscription skill markdown — narrow to the
    // subscription arm; other policy variants are rejected with a clear 400.
    if (decoded.mode !== "subscription") {
      throw new ApiError(
        400,
        `This skill endpoint only handles subscription links (got mode=${decoded.mode})`
      );
    }

    // Fetch mint decimals and convert amount from float to integer
    const decimals = await getMintDecimals(decoded.tokenMint);
    const convertedAmount = convertAmountToInteger(decoded.amount, decimals);

    // Replace decoded amount with converted integer
    const decodedWithConvertedAmount: SubscriptionParams = {
      ...decoded,
      amount: convertedAmount,
    };

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.send(generateSkillMarkdown(decodedWithConvertedAmount, decimals));
  })
);

/**
 * Generate skill markdown from subscription parameters
 */
function generateSkillMarkdown(
  params: SubscriptionParams,
  decimals: number
): string {
  const {
    tokenMint,
    recipient,
    amount,
    paymentFrequency,
    autoRenew,
    lineItems,
    trackingId,
    maxRenewals,
    startTime,
  } = params;

  const displayAmount = amount / Math.pow(10, decimals);

  const itemsDescription =
    lineItems && lineItems.length > 0
      ? lineItems
          .map(
            (item) =>
              `- ${item.description} (${item.quantity}x @ ${item.unitPrice} tokens)`
          )
          .join("\n")
      : "- Custom subscription service";

  const frequencyDisplay =
    paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1);

  const startTimeDisplay = startTime
    ? new Date(Number(startTime)).toISOString()
    : "Now";

  const autoRenewDisplay = autoRenew ? "Yes" : "No";
  const maxRenewalsDisplay = maxRenewals !== null ? maxRenewals : "Unlimited";
  const trackingIdDisplay = trackingId ?? "N/A";

  const maxRenewalsCode =
    maxRenewals !== null ? `  maxRenewals: ${maxRenewals},` : "";

  const templateData: TemplateData = {
    tokenMint,
    recipient,
    amount,
    displayAmount,
    decimals,
    paymentFrequency,
    frequencyDisplay,
    autoRenew: autoRenewDisplay,
    maxRenewals: maxRenewalsDisplay,
    trackingId: trackingIdDisplay,
    startTime: startTimeDisplay,
    itemsDescription,
    maxRenewalsCode,
  };

  return MarkdownTemplateEngine.renderFile(
    path.join(__dirname, "./skill.md"),
    templateData
  );
}

export default router;
