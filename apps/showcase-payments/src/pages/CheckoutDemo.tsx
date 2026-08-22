import { useState } from "react";
import {
  API_BASE_URL,
  CHECKOUT_BASE_URL,
  GATEWAY,
  USDC_MINT,
} from "@/constants";
import { useCheckoutSession, useTrackingId } from "@tributary-so/sdk-react";
import { Banknote } from "lucide-react";
import { useTrackingIdLocalStorage } from "@/hooks/useTrackingIdLocalStorage";
import { PaymentDetails } from "@tributary-so/ui/tributary";

export default function CheckoutDemo() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("9.99");
  const [mode, setMode] = useState<"payment" | "subscription">("payment");
  const [trackingId] = useTrackingIdLocalStorage();
  const { initiate } = useCheckoutSession(CHECKOUT_BASE_URL);
  const { payload, loading, error, refresh } = useTrackingId(
    trackingId,
    recipient,
    USDC_MINT,
    API_BASE_URL
  );

  const handlePaymentRequest = () => {
    if (!recipient || !amount) return;
    initiate({
      mode,
      tokenMint: USDC_MINT,
      recipient,
      gateway: GATEWAY,
      amount: parseFloat(amount),
      trackingId,
      ...(mode === "subscription" && {
        paymentFrequency: "monthly",
        autoRenew: true,
      }),
    });
  };

  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-20 flex justify-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Checkout API Example</h1>
          <p className="text-muted-foreground mb-2 text-sm">
            Generate a checkout link using{" "}
            <code className="bg-muted px-1.5 py-0.5 text-xs">
              @tributary-so/payments
            </code>
          </p>
          <p className="text-muted-foreground mb-8 text-xs">
            No wallet connection required — the hosted checkout handles
            everything.
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

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-1.5">
                Tracking Id (local)
              </label>
              <input
                type="string"
                value={trackingId}
                disabled={true}
                className="w-full px-3 py-2 text-sm bg-background border border-border focus:border-primary focus:outline-none"
              />
            </div>

            <button
              onClick={handlePaymentRequest}
              disabled={!recipient || !amount}
              className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <Banknote className="h-4 w-4" /> Proceed to Payment
            </button>
          </div>

          {recipient && trackingId && payload && (
            <div className="max-w-md mt-10">
              <PaymentDetails
                payload={payload}
                loading={loading}
                error={error}
                onRefresh={refresh}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
