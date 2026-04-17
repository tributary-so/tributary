import { useState } from "react";
import {
  CheckoutParams,
  CheckoutSessionManager,
  OneTimeParams,
  SubscriptionParams,
} from "@tributary-so/payments";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const GATEWAY = "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWkk4w4";

export default function Home() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("9.99");
  const [mode, setMode] = useState<"payment" | "subscription">("payment");

  const handlePaymentRequest = () => {
    if (!recipient || !amount) return;

    const manager = new CheckoutSessionManager();
    manager.setBaseUrl("https://checkout.tributary.so/#");

    const params: CheckoutParams =
      mode === "subscription"
        ? ({
            mode: "subscription" as const,
            tokenMint: USDC_MINT,
            recipient,
            gateway: GATEWAY,
            amount: parseFloat(amount),
            autoRenew: true,
            maxRenewals: null,
            paymentFrequency: "monthly",
            startTime: null,
          } as SubscriptionParams)
        : ({
            mode: "payment" as const,
            tokenMint: USDC_MINT,
            recipient,
            amount: parseFloat(amount),
          } as OneTimeParams);

    const generatedUrl = manager.encodeUrl(params);

    // navigate to
    window.location.href = generatedUrl;
  };

  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-20">
        <h1 className="text-2xl font-bold mb-2">Payments API Example</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Generate a checkout link using{" "}
          <code className="bg-muted px-1.5 py-0.5 text-xs">
            @tributary-so/payments
          </code>
        </p>

        <div className="max-w-md space-y-5">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("payment")}
              className={`flex-1 py-2 text-sm border transition-colors ${
                mode === "payment"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent text-foreground"
              }`}
            >
              One-Time
            </button>
            <button
              onClick={() => setMode("subscription")}
              className={`flex-1 py-2 text-sm border transition-colors ${
                mode === "subscription"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent text-foreground"
              }`}
            >
              Monthly
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-1.5">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Solana wallet address"
              className="w-full px-3 py-2 text-sm bg-background border border-border focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-1.5">
              Amount (USDC)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 text-sm bg-background border border-border focus:border-primary focus:outline-none"
            />
          </div>

          <button
            onClick={handlePaymentRequest}
            disabled={!recipient || !amount}
            className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Checkout Link
          </button>
        </div>
      </section>
    </main>
  );
}
