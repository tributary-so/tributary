import * as fs from "fs";
import * as path from "path";
import express from "express";
import cors from "cors";
import {
  CheckoutSessionManager,
  SubscriptionParams,
} from "@tributary-so/payments";
import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";

const app = express();
const PORT = process.env.PORT || "3002";

// Initialize Solana connection for fetching mint info
const SOLANA_RPC =
  process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC);

app.use(cors());
app.use(express.json());

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
        // Support nested properties and default values
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
    // Handle nested properties (e.g., user.name)
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
 * Fetch mint info from Solana and extract decimals
 * @param tokenMint - Token mint address
 * @returns Number of decimals for this token
 */
async function getMintDecimals(tokenMint: string): Promise<number> {
  try {
    const mintPublicKey = new PublicKey(tokenMint);
    const mintAccount = await getMint(connection, mintPublicKey);
    return mintAccount.decimals;
  } catch (error) {
    console.error(`Failed to fetch mint info for ${tokenMint}:`, error);
    // Default to 6 decimals (USDC standard) on error
    return 6;
  }
}

/**
 * Convert float amount to integer based on token decimals
 * @param amount - Float amount (e.g., 10.5 for 10.5 tokens)
 * @param decimals - Number of decimals for the token
 * @returns Integer amount in smallest units (e.g., 10500000 for 10.5 USDC)
 */
function convertAmountToInteger(amount: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(amount * factor);
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "lando-skill-api" });
});

app.get("/api/skill/:encoded", async (req, res) => {
  try {
    const { encoded } = req.params;

    if (!encoded) {
      return res.status(400).json({ error: "Missing encoded data parameter" });
    }

    const sessionManager = new CheckoutSessionManager();
    const decoded = sessionManager.decodeSubscriptionUrl(encoded);

    // Fetch mint decimals and convert amount from float to integer
    const decimals = await getMintDecimals(decoded.tokenMint);
    const convertedAmount = convertAmountToInteger(decoded.amount, decimals);

    // Replace decoded amount with converted integer
    const decodedWithConvertedAmount = {
      ...decoded,
      amount: convertedAmount,
    };

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.send(generateSkillMarkdown(decodedWithConvertedAmount, decimals));
  } catch (error) {
    console.error("Error decoding skill data:", error);
    res.status(500).json({ error: "Failed to decode skill data" });
  }
});

app.listen(PORT, () => {
  console.log(`Lando Skill API running on http://localhost:${PORT}`);
});

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

  // Convert integer amount back to float for display
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

  const templateData: TemplateData = {
    frequencyDisplay,
    itemsDescription,
    displayAmount,
    amount,
    tokenMint,
    recipient,
    paymentFrequency,
    autoRenew,
    lineItems,
    trackingId,
    maxRenewals,
    startTime,
  };

  return MarkdownTemplateEngine.renderFile(
    path.join(__dirname, "./skill.md"),
    templateData
  );
}
