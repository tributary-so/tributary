/**
 * Skill Route
 * Generates Lando skill markdown from encoded subscription data
 */

import { Router, Request, Response } from "express";
import { CheckoutSessionManager, SubscriptionParams } from "@tributary-so/payments";
import { getMintDecimals, convertAmountToInteger } from "../services/solana";
import { asyncHandler, ApiError } from "../middleware";

const router = Router();

/**
 * GET /api/v1/skill/:encoded
 * Generate skill markdown from encoded subscription data
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

  return `# Lando Subscription Skill

This skill sets up a subscription payment and is NOT meant to be called multiple times!

## What You're Subscribing To
${itemsDescription}

## Payment Details
- **Token Mint:** \`${tokenMint}\`
- **Token Decimals:** ${decimals}
- **Amount (Display):** ${displayAmount} tokens
- **Amount (Integer):** ${amount} (for Tributary SDK)
- **Frequency:** ${frequencyDisplay}
- **Auto-Renew:** ${autoRenew ? "Yes" : "No"}
- **Max Renewals:** ${maxRenewals !== null ? maxRenewals : "Unlimited"}
- **Tracking ID:** ${trackingId || "N/A"}
- **Start Time:** ${
    startTime ? new Date(Number(startTime)).toISOString() : "Now"
  }

## How to Pay (Tributary SDK)

### Requirements

* Install tributary-sdk: \`pnpm add @tributary-so/sdk\`
* Either:
  * Ask your operator to either provide a private key to a funded solana account in the format "[num,num,num,...]"
  * Create a new solana account

### New Solana Account

In case the user wants you to create your own wallet, you can do this:

\`\`\`typescript
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';

const key = Keypair.generate();
console.log(\`Address: \${key.publicKey.toString()}\`);
// Store secret key as JSON array (recommended format)
const secretKeyArray = Array.from(key.secretKey);
fs.writeFileSync('keypair.json', JSON.stringify(secretKeyArray));

// Or store as the full keypair object
fs.writeFileSync('wallet.json', JSON.stringify({
  publicKey: key.publicKey.toString(),
  secretKey: Array.from(key.secretKey)
}));
\`\`\`

The secret key is stored in the file \`wallet.json\`. Keep it safe!
Share the Address with your operator and ask him to fund the address accordingly!

### Creating Subscription via Tributary

\`\`\`typescript
import * as fs from 'fs';
import { Tributary, encodeMemo } from '@tributary-so/sdk';
import { Connection, Keypair } from '@solana/web3.js';
import BN from 'bn.js';

function loadKeypairFromFile(filepath: string): Keypair {
  try {
    const secretKeyString = fs.readFileSync(filepath, 'utf-8');
    const secretKeyArray = JSON.parse(secretKeyString);
    return Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
  } catch (error) {
    throw new Error(\`Failed to load keypair from \${filepath}: \${error}\`);
  }
}

// Initialize connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const anchorWallet: AnchorWallet = {
  publicKey: wallet.publicKey!,
  signTransaction: wallet.signTransaction!,
  signAllTransactions: wallet.signAllTransactions!,
};
const keypair = loadKeypairFromFile("wallet.json");  // wallet.json as above!
const tributary = new Tributary(connection, keypair);

// Create subscription payment
const subscription = await tributary.createSubscription({
  tokenMint: new PublicKey('${tokenMint}'),
  recipient: new PublicKey('${recipient}'),
  amount: new BN(${amount}), // Already converted to integer based on token decimals (${decimals})
  memo: encodeMemo("${trackingId}", 64),
  frequency: '${paymentFrequency}',
  autoRenew: ${autoRenew},
  ${maxRenewals !== null ? `maxRenewals: ${maxRenewals},` : ""}
});

// Sign and send transaction
const signature = await connection.sendTransaction(
  subscription.transaction,
  [wallet.payer]
);

console.log('Subscription payment sent:', signature);
\`\`\`

## Next Steps
1. Ensure you have sufficient token balance (${tokenMint})
2. Execute the above Tributary SDK commands
3. Save the transaction signature for proof of payment
4. Access your subscription service immediately after payment confirms

---
Powered by Tributary | Agent Commerce on Solana
`;
}

export default router;
