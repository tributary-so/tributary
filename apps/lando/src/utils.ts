import { EncodedSessionData, SubscriptionParams, LineItem } from './types';

// Decode subscription parameters from URL
export function decodeSubscriptionUrl(encodedData: string): SubscriptionParams {
  try {
    const data = decodeFromBase64Url(encodedData);
    return validateDecodedData(data);
  } catch (error) {
    console.error('Failed to decode subscription URL:', error);
    throw new Error('Invalid session data encoding');
  }
}

// Base64URL decoding (URL-safe, compact)
function decodeFromBase64Url(encoded: string): EncodedSessionData {
  // Add padding back if needed
  const padding = encoded.length % 4;
  const base64 = encoded + '='.repeat(padding === 0 ? 0 : 4 - padding);
  // Convert back from URL-safe
  const standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  const jsonString = Buffer.from(standardBase64, 'base64').toString('utf8');
  return JSON.parse(jsonString);
}

// Validate decoded data
function validateDecodedData(data: any): SubscriptionParams {
  // Validate required fields
  if (!data.tm || !data.r || !data.g || !data.a) {
    throw new Error('Missing required fields in session data');
  }

  // Validate amount
  const amount = parseFloat(data.a);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Invalid amount');
  }

  // Validate payment frequency
  const validFrequencies = ['daily', 'weekly', 'monthly', 'annually'];
  if (!validFrequencies.includes(data.pf)) {
    throw new Error('Invalid payment frequency');
  }

  // Parse line items if present
  let lineItems: LineItem[] = [];
  if (data.li && data.li !== '[]') {
    try {
      lineItems = JSON.parse(data.li);
    } catch (error) {
      console.warn('Failed to parse line items, using empty array');
      lineItems = [];
    }
  }

  return {
    tokenMint: data.tm,
    recipient: data.r,
    gateway: data.g,
    amount,
    autoRenew: data.ar === true,
    maxRenewals: data.mr === 'null' ? null : parseInt(data.mr),
    paymentFrequency: data.pf,
    startTime: data.st === 'null' ? null : parseInt(data.st),
    trackingId: data.tid,
    lineItems,
  };
}

// Generate skill instructions for the subscription
export function generateSkillInstructions(params: SubscriptionParams): string {
  const { recipient, amount, paymentFrequency, autoRenew, lineItems, trackingId } = params;

  const itemsDescription = lineItems.length > 0
    ? lineItems.map(item => `- ${item.description} (${item.quantity}x @ ${item.unitPrice} SOL)`).join('\n')
    : '- Custom subscription service';

  const frequencyDisplay = paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1);

  return `# Lando Subscription Skill

## What You're Subscribing To
${itemsDescription}

## Payment Details
- **Amount:** ${amount} SOL
- **Frequency:** ${frequencyDisplay}
- **Auto-Renew:** ${autoRenew ? 'Yes' : 'No'}
- **Tracking ID:** ${trackingId}

## How to Pay (Tributary SDK)

\`\`\`typescript
import { Tributary } from '@tributary-so/sdk';
import { Connection } from '@solana/web3.js';

// Initialize connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const tributary = new Tributary(connection);

// Create subscription payment
const subscription = await tributary.createSubscription({
  recipient: new PublicKey('${recipient}'),
  amount: ${amount},
  frequency: '${paymentFrequency}',
  autoRenew: ${autoRenew},
});

// Sign and send transaction
const signature = await connection.sendTransaction(
  subscription.transaction,
  [wallet.payer]
);

console.log('Subscription payment sent:', signature);
\`\`\`

## Next Steps
1. Ensure you have sufficient SOL balance
2. Execute the above Tributary SDK commands
3. Save the transaction signature for proof of payment
4. Access your subscription service immediately after payment confirms

---
Powered by Tributary | Agent Commerce on Solana`;
}

// Format amount for display
export function formatAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  return amount.toString();
}

// Truncate Solana address for display
export function truncateAddress(address: string, length: number = 8): string {
  if (address.length <= length * 2) {
    return address;
  }
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}
