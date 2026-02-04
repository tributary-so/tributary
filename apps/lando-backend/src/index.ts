import express from "express";
import cors from "cors";
import {
  CheckoutSessionManager,
  SubscriptionParams,
} from "@tributary-so/payments";

const app = express();
const PORT = process.env.PORT || "3002";

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "lando-skill-api" });
});

app.get("/api/skill/:encoded", (req, res) => {
  try {
    const { encoded } = req.params;

    if (!encoded) {
      return res.status(400).json({ error: "Missing encoded data parameter" });
    }

    const sessionManager = new CheckoutSessionManager();
    const decoded = sessionManager.decodeSubscriptionUrl(encoded);

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.send(generateSkillMarkdown(decoded));
  } catch (error) {
    console.error("Error decoding skill data:", error);
    res.status(500).json({ error: "Failed to decode skill data" });
  }
});

app.listen(PORT, () => {
  console.log(`Lando Skill API running on http://localhost:${PORT}`);
});

function generateSkillMarkdown(params: SubscriptionParams): string {
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
- **Amount:** ${amount}
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
  amount: ${amount},
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
