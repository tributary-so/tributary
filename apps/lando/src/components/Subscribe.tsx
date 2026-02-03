import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CheckoutSessionManager,
  SubscriptionParams,
} from "@tributary-so/payments";

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  return amount.toString();
}

export function Subscribe() {
  const { data } = useParams<{ data: string }>();
  const [subscription, setSubscription] = useState<SubscriptionParams | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!data) {
      setError("No subscription data provided in URL");
      setLoading(false);
      return;
    }

    try {
      const sessionManager = new CheckoutSessionManager();
      const decoded = sessionManager.decodeSubscriptionUrl(data);
      setSubscription(decoded);
      setLoading(false);
    } catch (err) {
      console.trace(err);
      setError(
        err instanceof Error ? err.message : "Failed to decode subscription"
      );
      setLoading(false);
    }
  }, [data]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateSkillInstructions = (params: SubscriptionParams): string => {
    const {
      recipient,
      amount,
      paymentFrequency,
      autoRenew,
      lineItems,
      trackingId,
    } = params;

    const itemsDescription =
      lineItems && lineItems.length > 0
        ? lineItems
            .map(
              (item) =>
                `- ${item.description} (${item.quantity}x @ ${item.unitPrice} SOL)`
            )
            .join("\n")
        : "- Custom subscription service";

    const frequencyDisplay =
      paymentFrequency.charAt(0).toUpperCase() + paymentFrequency.slice(1);

    return `# Lando Subscription Skill

## What You're Subscribing To
${itemsDescription}

## Payment Details
- **Amount:** ${formatAmount(amount)} SOL
- **Frequency:** ${frequencyDisplay}
- **Auto-Renew:** ${autoRenew ? "Yes" : "No"}
- **Tracking ID:** ${trackingId || "N/A"}

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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-lando-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lando-muted font-mono">
            Decoding subscription data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-lando-card border border-lando-border rounded-lg p-8 max-w-lg w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-lando-accent font-mono mb-4">
              Decoding Failed
            </h2>
            <p className="text-lando-muted mb-6">{error}</p>
            <a
              href="/"
              className="inline-block bg-lando-accent text-lando-bg font-bold px-6 py-3 rounded-lg hover:bg-lando-glow transition-all font-mono"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const skillInstructions = generateSkillInstructions(subscription);
  const frequencyDisplay =
    subscription.paymentFrequency.charAt(0).toUpperCase() +
    subscription.paymentFrequency.slice(1);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="matrix-rain" />
      <div className="scanline absolute inset-0 opacity-30 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block mb-4">
            <span className="text-matrix-green font-mono text-sm px-4 py-2 border border-lando-border rounded-full">
              &gt; Subscription decoded successfully
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-mono">
            <span className="text-lando-accent">Subscription</span> Details
          </h1>
          <p className="text-lando-muted max-w-2xl mx-auto">
            Review subscription details below and execute Tributary SDK commands
            to complete your payment.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-lando-card border border-lando-border rounded-lg p-8 animate-slide-up box-glow">
            <h2 className="text-xl font-bold text-lando-accent font-mono mb-6 flex items-center">
              <span className="text-2xl mr-3">📦</span>
              What You're Subscribing To
            </h2>

            {subscription.lineItems && subscription.lineItems.length > 0 ? (
              <div className="space-y-4">
                {subscription.lineItems.map((item, index) => (
                  <div
                    key={index}
                    className="bg-lando-bg/50 border border-lando-border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-mono text-lando-text">
                          {item.description}
                        </h3>
                        <p className="text-lando-muted text-sm mt-1">
                          Quantity: {item.quantity} × {item.unitPrice} SOL
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lando-accent font-mono">
                          {formatAmount(item.quantity * item.unitPrice)} SOL
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-lando-bg/50 border border-lando-border rounded-lg p-4">
                <p className="text-lando-muted">Custom subscription service</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-lando-border">
              <div className="flex justify-between items-center">
                <span className="text-lando-muted">Total Amount</span>
                <span className="text-2xl font-bold text-lando-accent font-mono">
                  {formatAmount(subscription.amount)} SOL
                </span>
              </div>
            </div>
          </div>

          <div
            className="bg-lando-card border border-lando-border rounded-lg p-8 animate-slide-up box-glow"
            style={{ animationDelay: "0.2s" }}
          >
            <h2 className="text-xl font-bold text-lando-accent font-mono mb-6 flex items-center">
              <span className="text-2xl mr-3">💳</span>
              Payment Details
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-lando-bg/50 border border-lando-border rounded-lg p-4">
                <p className="text-lando-muted text-sm mb-1">Amount</p>
                <p className="font-mono text-lando-text text-lg">
                  {formatAmount(subscription.amount)} SOL
                </p>
              </div>

              <div className="bg-lando-bg/50 border border-lando-border rounded-lg p-4">
                <p className="text-lando-muted text-sm mb-1">Frequency</p>
                <p className="font-mono text-lando-text text-lg">
                  {frequencyDisplay}
                </p>
              </div>

              <div className="bg-lando-bg/50 border border-lando-border rounded-lg p-4">
                <p className="text-lando-muted text-sm mb-1">Auto-Renew</p>
                <p
                  className={`font-mono text-lg ${
                    subscription.autoRenew
                      ? "text-lando-accent"
                      : "text-lando-muted"
                  }`}
                >
                  {subscription.autoRenew ? "Yes" : "No"}
                </p>
              </div>

              <div className="bg-lando-bg/50 border border-lando-border rounded-lg p-4">
                <p className="text-lando-muted text-sm mb-1">Tracking ID</p>
                <p className="font-mono text-lando-text text-lg">
                  {subscription.trackingId || "N/A"}
                </p>
              </div>
            </div>

            <div className="mt-4 bg-lando-bg/50 border border-lando-border rounded-lg p-4">
              <p className="text-lando-muted text-sm mb-1">Recipient</p>
              <p className="font-mono text-lando-text text-sm break-all">
                {subscription.recipient}
              </p>
            </div>

            {subscription.maxRenewals !== null && (
              <div className="mt-4 bg-lando-bg/50 border border-lando-border rounded-lg p-4">
                <p className="text-lando-muted text-sm mb-1">Max Renewals</p>
                <p className="font-mono text-lando-text">
                  {subscription.maxRenewals}
                </p>
              </div>
            )}
          </div>

          <div
            className="bg-lando-card border border-lando-border rounded-lg p-8 animate-slide-up box-glow"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-lando-accent font-mono flex items-center">
                <span className="text-2xl mr-3">🤖</span>
                Tributary SDK Commands
              </h2>
              <button
                onClick={() => copyToClipboard(skillInstructions)}
                className="text-lando-muted hover:text-lando-accent transition-colors font-mono text-sm flex items-center gap-2"
              >
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>

            <div className="code-block">
              <pre className="text-lando-text whitespace-pre-wrap">
                <code>{skillInstructions}</code>
              </pre>
            </div>

            <div className="mt-6 p-4 bg-lando-bg/50 border border-lando-border rounded-lg">
              <h3 className="font-bold text-lando-accent font-mono mb-2">
                📋 Quick Copy Snippets
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-lando-muted text-xs mb-1">
                    Recipient Address:
                  </p>
                  <code className="text-xs text-lando-accent break-all">
                    {subscription.recipient}
                  </code>
                </div>
                <div>
                  <p className="text-lando-muted text-xs mb-1">
                    Amount (lamports):
                  </p>
                  <code className="text-xs text-lando-accent">
                    {Math.round(
                      subscription.amount * 1_000_000_000
                    ).toLocaleString()}
                  </code>
                </div>
                <div>
                  <p className="text-lando-muted text-xs mb-1">
                    Payment Frequency:
                  </p>
                  <code className="text-xs text-lando-accent">
                    {subscription.paymentFrequency}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-lando-card border border-lando-border rounded-lg p-8 animate-slide-up box-glow"
            style={{ animationDelay: "0.6s" }}
          >
            <h2 className="text-xl font-bold text-lando-accent font-mono mb-6 flex items-center">
              <span className="text-2xl mr-3">🚀</span>
              Next Steps
            </h2>

            <ol className="space-y-4">
              <li className="flex items-start">
                <span className="bg-lando-accent text-lando-bg font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                  1
                </span>
                <div>
                  <p className="font-mono text-lando-text">
                    Ensure sufficient SOL balance
                  </p>
                  <p className="text-lando-muted text-sm mt-1">
                    You need {formatAmount(subscription.amount)} SOL plus
                    network fees
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-lando-accent text-lando-bg font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                  2
                </span>
                <div>
                  <p className="font-mono text-lando-text">
                    Execute Tributary SDK commands
                  </p>
                  <p className="text-lando-muted text-sm mt-1">
                    Copy code snippet above and run it in your agent environment
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-lando-accent text-lando-bg font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                  3
                </span>
                <div>
                  <p className="font-mono text-lando-text">
                    Save transaction signature
                  </p>
                  <p className="text-lando-muted text-sm mt-1">
                    Use signature as proof of payment when accessing to service
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-lando-accent text-lando-bg font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">
                  4
                </span>
                <div>
                  <p className="font-mono text-lando-text">
                    Access your subscription
                  </p>
                  <p className="text-lando-muted text-sm mt-1">
                    Service access is granted immediately after payment confirms
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="text-center">
            <a
              href="/"
              className="inline-block border border-lando-border text-lando-text px-6 py-3 rounded-lg hover:border-lando-accent hover:text-lando-accent transition-all font-mono"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
