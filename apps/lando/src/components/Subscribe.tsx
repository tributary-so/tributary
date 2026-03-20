import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  CheckoutSessionManager,
  SubscriptionParams,
} from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import { getTokenSymbol, getTokenDecimals } from "@tributary-so/sdk";

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ?? "https://api.tributary.so";
const SOLANA_RPC =
  import.meta.env.VITE_SOLANA_API ?? "https://api.mainnet-beta.solana.com";

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
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setError("No subscription data provided in URL");
      setLoading(false);
      return;
    }

    try {
      const sessionManager = new CheckoutSessionManager();
      const decoded = sessionManager.decodeSubscriptionUrl(
        data
      ) as SubscriptionParams;
      setSubscription(decoded);
      setLoading(false);

      if (decoded.tokenMint) {
        const connection = new Connection(SOLANA_RPC);
        setTokenLoading(true);
        Promise.all([
          getTokenSymbol(connection, decoded.tokenMint),
          getTokenDecimals(connection, decoded.tokenMint),
        ])
          .then(([symbol, decimals]) => {
            if (!symbol || decimals === null) {
              setTokenError(
                `Token mint ${decoded.tokenMint.slice(
                  0,
                  8
                )}... not found or has no metadata`
              );
            } else {
              setTokenSymbol(symbol);
              setTokenDecimals(decimals);
            }
          })
          .catch((err) => {
            console.warn("Failed to fetch token metadata:", err);
            setTokenError(
              `Failed to fetch token metadata: ${
                err instanceof Error ? err.message : "Unknown error"
              }`
            );
          })
          .finally(() => {
            setTokenLoading(false);
          });
      }
    } catch (err) {
      console.trace(err);
      setError(
        err instanceof Error ? err.message : "Failed to decode subscription"
      );
      setLoading(false);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-lando-accent border-t-transparent animate-spin mb-4"></div>
          <p className="text-lando-muted font-mono text-sm uppercase tracking-[0.12em]">
            Decoding subscription data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="border border-lando-border bg-lando-card p-8 max-w-lg w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">!</div>
            <h2 className="text-2xl font-bold text-lando-accent font-mono mb-4 uppercase tracking-[0.12em]">
              Decoding Failed
            </h2>
            <p className="text-lando-muted mb-6">{error}</p>
            <Link
              to="/"
              className="inline-block bg-lando-accent text-lando-bg font-bold px-6 py-3 hover:bg-lando-glow transition-all font-mono text-sm"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="border border-lando-border bg-lando-card p-8 max-w-lg w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">X</div>
            <h2 className="text-2xl font-bold text-lando-accent font-mono mb-4 uppercase tracking-[0.12em]">
              Invalid Token
            </h2>
            <p className="text-lando-muted mb-6">{tokenError}</p>
            <p className="text-lando-text mb-6">
              Please contact the merchant and provide the correct token mint
              address.
            </p>
            <Link
              to="/"
              className="inline-block border border-lando-border text-lando-text px-6 py-3 hover:border-lando-accent hover:text-lando-accent transition-all font-mono text-sm"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const frequencyDisplay =
    subscription.paymentFrequency.charAt(0).toUpperCase() +
    subscription.paymentFrequency.slice(1);

  return (
    <section className="py-12">
      <div className="text-center mb-8">
        <div className="inline-block mb-4">
          <span className="text-matrix-green font-mono text-sm px-4 py-2 border border-lando-border">
            &gt; Subscription decoded successfully
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 font-mono">
          <span className="text-lando-accent">Subscription</span> Details
        </h1>
        <p className="text-lando-muted max-w-2xl mx-auto">
          Review subscription details and follow the skill instructions to
          complete your payment.
        </p>
      </div>

      <div className="space-y-8">
        <div className="border border-lando-border bg-lando-card p-8">
          <h2 className="text-xl font-bold text-lando-accent font-mono mb-6 uppercase tracking-[0.12em] flex items-center gap-3">
            <span className="text-2xl">Package</span>
          </h2>

          {subscription.lineItems && subscription.lineItems.length > 0 ? (
            <div className="space-y-4">
              {subscription.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="border border-lando-border bg-lando-bg/50 p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-mono text-lando-text">
                        {item.description}
                      </h3>
                      <p className="text-lando-muted text-sm mt-1">
                        Qty {item.quantity} x {item.unitPrice}{" "}
                        {tokenSymbol || "SOL"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lando-accent font-mono">
                        {formatAmount(item.quantity * item.unitPrice)}{" "}
                        {tokenSymbol || "SOL"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-lando-border bg-lando-bg/50 p-4">
              <p className="text-lando-muted">Custom subscription service</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-lando-border">
            <div className="flex justify-between items-center">
              <span className="text-lando-muted text-sm uppercase tracking-[0.08em]">
                Total Amount
              </span>
              <span className="text-2xl font-bold text-lando-accent font-mono">
                {formatAmount(subscription.amount)} {tokenSymbol || "SOL"}
                <span className="font-normal text-lando-muted text-sm">
                  /{frequencyDisplay.toLowerCase()}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="border border-lando-border bg-lando-card p-8">
          <h2 className="text-xl font-bold text-lando-accent font-mono mb-6 uppercase tracking-[0.12em] flex items-center gap-3">
            <span className="text-2xl">Details</span>
          </h2>

          <div className="border border-lando-border bg-lando-bg/50 p-4 mb-6">
            <p className="text-lando-muted text-sm mb-1 uppercase tracking-[0.08em]">
              Token Mint
            </p>
            <p className="font-mono text-lando-text text-sm break-all">
              {subscription.tokenMint}
            </p>
            {tokenLoading ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-lando-accent border-t-transparent animate-spin"></div>
                <p className="text-lando-muted text-sm">
                  Loading token details...
                </p>
              </div>
            ) : (
              <div className="mt-2 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lando-muted uppercase tracking-[0.08em]">
                    Symbol:
                  </span>
                  <span className="font-mono text-lando-accent">
                    {tokenSymbol || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lando-muted uppercase tracking-[0.08em]">
                    Precision:
                  </span>
                  <span className="font-mono text-lando-accent">
                    {tokenDecimals !== null
                      ? `${tokenDecimals} decimals`
                      : "Unknown"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-lando-border bg-lando-bg/50 p-4">
              <p className="text-lando-muted text-sm mb-1 uppercase tracking-[0.08em]">
                Amount
              </p>
              <p className="font-mono text-lando-text text-lg">
                {tokenLoading ? (
                  <span className="inline-block w-3 h-3 border-2 border-lando-accent border-t-transparent animate-spin"></span>
                ) : (
                  <>
                    {formatAmount(subscription.amount)} {tokenSymbol || "SOL"}
                  </>
                )}
              </p>
            </div>

            <div className="border border-lando-border bg-lando-bg/50 p-4">
              <p className="text-lando-muted text-sm mb-1 uppercase tracking-[0.08em]">
                Frequency
              </p>
              <p className="font-mono text-lando-text text-lg">
                {frequencyDisplay}
              </p>
            </div>

            <div className="border border-lando-border bg-lando-bg/50 p-4">
              <p className="text-lando-muted text-sm mb-1 uppercase tracking-[0.08em]">
                Auto-Renew
              </p>
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

            <div className="border border-lando-border bg-lando-bg/50 p-4">
              <p className="text-lando-muted text-sm mb-1 uppercase tracking-[0.08em]">
                Tracking ID
              </p>
              <p className="font-mono text-lando-text text-lg font-mono">
                {subscription.trackingId || "N/A"}
              </p>
            </div>
          </div>

          <div className="mt-4 border border-lando-border bg-lando-bg/50 p-4">
            <p className="text-lando-muted text-sm mb-1 uppercase tracking-[0.08em]">
              Recipient
            </p>
            <p className="font-mono text-lando-text text-sm break-all">
              {subscription.recipient}
            </p>
          </div>

          {subscription.maxRenewals !== null && (
            <div className="mt-4 border border-lando-border bg-lando-bg/50 p-4">
              <p className="text-lando-muted text-sm mb-1 uppercase tracking-[0.08em]">
                Max Renewals
              </p>
              <p className="font-mono text-lando-text">
                {subscription.maxRenewals}
              </p>
            </div>
          )}
        </div>

        <div className="border border-lando-border bg-lando-card p-8">
          <h2 className="text-xl font-bold text-lando-accent font-mono mb-6 uppercase tracking-[0.12em] flex items-center gap-3">
            <span className="text-2xl">Agent Skill</span>
          </h2>

          <a
            href={`${BACKEND_BASE_URL}/v1/skill/${data}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-lando-accent text-lando-bg font-bold px-6 py-4 hover:bg-lando-glow transition-all font-mono text-lg border-2 border-lando-accent hover:border-white"
          >
            Open Agent Skill (Markdown)
          </a>
        </div>

        <div className="border border-lando-border bg-lando-card p-8">
          <h2 className="text-xl font-bold text-lando-accent font-mono mb-6 uppercase tracking-[0.12em] flex items-center gap-3">
            <span className="text-2xl">Next Steps</span>
          </h2>

          <ol className="space-y-4">
            <li className="flex items-start">
              <span className="bg-lando-accent text-lando-bg font-bold w-6 h-6 flex items-center justify-center mr-3 shrink-0 text-sm">
                1
              </span>
              <div>
                <p className="font-mono text-lando-text">
                  Ensure sufficient token balance
                </p>
                <p className="text-lando-muted text-sm mt-1">
                  {tokenLoading
                    ? "Loading token details..."
                    : `You need ${formatAmount(subscription.amount)} ${
                        tokenSymbol || "SOL"
                      } tokens plus network fees`}
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-lando-accent text-lando-bg font-bold w-6 h-6 flex items-center justify-center mr-3 shrink-0 text-sm">
                2
              </span>
              <div>
                <p className="font-mono text-lando-text">
                  Open and follow the Agent Skill
                </p>
                <p className="text-lando-muted text-sm mt-1">
                  Click the button above to get the Tributary SDK commands
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-lando-accent text-lando-bg font-bold w-6 h-6 flex items-center justify-center mr-3 shrink-0 text-sm">
                3
              </span>
              <div>
                <p className="font-mono text-lando-text">
                  Save transaction signature
                </p>
                <p className="text-lando-muted text-sm mt-1">
                  Use signature as proof of payment when accessing service
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="bg-lando-accent text-lando-bg font-bold w-6 h-6 flex items-center justify-center mr-3 shrink-0 text-sm">
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
          <Link
            to="/"
            className="inline-block border border-lando-border text-lando-text px-6 py-3 hover:border-lando-accent hover:text-lando-accent transition-all font-mono text-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
}
