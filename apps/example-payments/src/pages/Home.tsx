import { useState } from "react";
import { API_BASE_URL, CHECKOUT_BASE_URL, GATEWAY, USDC_MINT } from "@/constants";
import { useCheckoutSession, useTrackingId } from "@tributary-so/sdk-react";
import { Banknote, RefreshCw, AlertCircle } from "lucide-react";
import { useTrackingIdLocalStorage } from "@/hooks/useTrackingIdLocalStorage";

export default function Home() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("9.99");
  const [mode, setMode] = useState<"payment" | "subscription">("payment");
  const [trackingId] = useTrackingIdLocalStorage();
  const { initiate } = useCheckoutSession(CHECKOUT_BASE_URL);
  const { payload, loading, error, refresh } = useTrackingId(
    trackingId,
    recipient,
    USDC_MINT,
    API_BASE_URL,
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

  const fmtAmount = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return raw;
    return (n / 1e6).toFixed(2);
  };

  const fmtDate = (ts: number | null) => {
    if (!ts) return "N/A";
    return new Date(ts * 1000).toLocaleDateString();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-emerald-600";
      case "overdue":
        return "text-red-500";
      case "completed":
        return "text-muted-foreground";
      default:
        return "";
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-20 flex justify-center">
        <div>
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
                className={`flex-1 py-2 text-sm border transition-colors ${mode === "payment"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent text-foreground"
                  }`}
              >
                One-Time
              </button>
              <button
                onClick={() => setMode("subscription")}
                className={`flex-1 py-2 text-sm border transition-colors ${mode === "subscription"
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

          {recipient && trackingId && (
            <div className="max-w-md mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Active Subscription</h2>
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {loading && (
                <p className="text-muted-foreground text-sm">
                  Resolving token...
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>No subscription found for this recipient.</span>
                </div>
              )}

              {payload &&
                payload.subscriptions.map((sub) => (
                  <div
                    key={sub.policyAddress}
                    className="border border-border p-4 space-y-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {fmtAmount(sub.amount)} USDC / {sub.paymentFrequency}
                      </span>
                      <span
                        className={`font-medium ${statusColor(sub.status)}`}
                      >
                        {sub.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground text-xs">
                      <span>Policy #{sub.policyId}</span>
                      <span>Payments: {sub.totalPayments}</span>
                      <span>Next due: {fmtDate(sub.nextPaymentDue)}</span>
                      <span>Created: {fmtDate(sub.createdAt)}</span>
                    </div>
                  </div>
                ))}

              {payload && payload.subscriptions.length === 0 && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>No active subscriptions for this recipient.</span>
                </div>
              )}

              {payload && payload.lastPayments.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3">
                    Recent Payments
                  </h3>
                  <div className="space-y-2">
                    {payload.lastPayments.map((p) => (
                      <div
                        key={p.signature}
                        className="border border-border p-3 space-y-1.5 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {fmtAmount(p.amount)} USDC
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {fmtDate(p.timestamp)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground text-xs">
                          <span className="truncate" title={p.signature}>
                            Sig: {p.signature.slice(0, 20)}...
                          </span>
                          <span>Memo: {p.memo.slice(0, 8)}...</span>
                          <span className="truncate" title={p.payer}>
                            From: {p.payer.slice(0, 8)}...{p.payer.slice(-4)}
                          </span>
                          <span className="truncate" title={p.recipient}>
                            To: {p.recipient.slice(0, 8)}...
                            {p.recipient.slice(-4)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
