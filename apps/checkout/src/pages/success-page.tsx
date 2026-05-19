import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { TributaryJWTPayload, TributaryVerifier } from "@tributary-so/payments";
import { Connection } from "@solana/web3.js";
import config from "@/constants";
import PaymentReceipt from "@/components/Receipt";
import { getTokenSymbol } from "@/lib/utils";
import { getTokenDecimals } from "@tributary-so/sdk";

const SOLSCAN_TX = "https://solscan.io/tx";

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<TributaryJWTPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(6);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const verifier = new TributaryVerifier({ baseUrl: config.apiBaseUrl });

    verifier
      .verify(token)
      .then((result) => {
        setPayload(result);
        setLoading(false);
      })
      .catch(() => {
        setError("Verification failed");
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!payload) return;

    const lastPayment = payload.lastPayments[0];
    const mint = lastPayment?.tokenMint;

    if (!mint) return;

    const connection = new Connection(config.rpcUrl);

    getTokenDecimals(connection, mint)
      .then((decimals) => {
        if (decimals !== null) setTokenDecimals(decimals);
      })
      .catch(() => {});

    getTokenSymbol(connection, mint)
      .then((symbol) => {
        if (symbol) setTokenSymbol(symbol);
      })
      .catch(() => {});
  }, [payload]);

  if (loading) {
    return (
      <section className="py-20 text-center">
        <p className="text-muted-foreground text-sm">Verifying token...</p>
      </section>
    );
  }

  if (!token || !payload || error) {
    return (
      <section className="py-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid Token</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {error || "No valid payment token was found in the URL."}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </section>
    );
  }

  const rawToHuman = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return 0;
    return n / Math.pow(10, tokenDecimals);
  };

  const lastPayment = payload.lastPayments[0] ?? null;
  const firstSub = payload.subscriptions[0] ?? null;
  const mint = lastPayment?.tokenMint;

  const displayToken =
    tokenSymbol ?? (mint ? `${mint.slice(0, 4)}...${mint.slice(-4)}` : "TOKEN");

  const payAmount = lastPayment
    ? rawToHuman(lastPayment.amount)
    : firstSub
    ? rawToHuman(firstSub.amount)
    : 0;

  const subscriptionItems =
    payload.subscriptions.length > 0
      ? payload.subscriptions.map((sub) => ({
          label: `${
            sub.paymentFrequency.charAt(0).toUpperCase() +
            sub.paymentFrequency.slice(1)
          } subscription`,
          amount: rawToHuman(sub.amount),
          frequency: sub.paymentFrequency,
          status: sub.status,
          policyId: sub.policyId,
          nextPaymentDue: sub.nextPaymentDue,
        }))
      : undefined;

  const recentPaymentItems =
    payload.lastPayments.length > 0
      ? payload.lastPayments.map((p) => ({
          amount: rawToHuman(p.amount),
          token: displayToken,
          timestamp: p.timestamp * 1000,
          signature: p.signature,
          fromWallet: p.payer,
          toWallet: p.recipient,
          slot: p.slot,
          txUrl: `${SOLSCAN_TX}/${p.signature}`,
        }))
      : undefined;

  const genericItems =
    !subscriptionItems && lastPayment
      ? [
          {
            label: "One-time payment",
            amount: rawToHuman(lastPayment.amount),
          },
        ]
      : !subscriptionItems
      ? [{ label: "Payment", amount: 0 }]
      : undefined;

  return (
    <section className="py-20">
      <div className="text-center mb-10">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
        <p className="text-muted-foreground text-sm">
          Your payment has verified on Solana.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <PaymentReceipt
          merchant={{
            name: "Tributary Payment",
            address: firstSub
              ? `Recipient: ${firstSub.recipient.slice(
                  0,
                  6
                )}...${firstSub.recipient.slice(-4)}`
              : "Tributary.so",
          }}
          items={genericItems}
          payment={{
            fromWallet: lastPayment?.payer ?? payload.sub ?? "...",
            toWallet: lastPayment?.recipient ?? firstSub?.recipient ?? "...",
            signature: lastPayment?.signature ?? "pending confirmation",
            amountSOL: payAmount,
            token: displayToken,
            timestamp: lastPayment
              ? lastPayment.timestamp * 1000
              : payload.iat * 1000,
            network: "mainnet-beta" as const,
            slot: lastPayment?.slot,
          }}
          subscriptions={subscriptionItems}
          recentPayments={recentPaymentItems}
        />

        <div className="text-center pt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Create Another Payment
          </Link>
        </div>
      </div>
    </section>
  );
}
