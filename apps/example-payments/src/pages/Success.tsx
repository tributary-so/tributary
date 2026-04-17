import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { useHashParams } from "../hooks/useHashParams";
import {
  type SubscriptionClaim,
  type TributaryJWTPayload,
} from "@tributary-so/payments";
import { decodeJwt, formatFrequency, formatTimestamp } from "../lib/jwt";

function StatusBadge({ status }: { status: SubscriptionClaim["status"] }) {
  const config = {
    paid: {
      icon: CheckCircle2,
      label: "Paid",
      className: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    overdue: {
      icon: AlertCircle,
      label: "Overdue",
      className: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    completed: {
      icon: CheckCircle2,
      label: "Completed",
      className: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
  }[status];

  const Icon = config!.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${config.className} ${config.bg}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function shortenAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function Copyable({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors group"
      title={value}
    >
      <code className="text-xs">{shortenAddress(value)}</code>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

export default function Success() {
  const hashParams = useHashParams();
  const [copiedToken, setCopiedToken] = useState(false);

  const token = hashParams.get("token");

  const [payload, setPayload] = useState<TributaryJWTPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    decodeJwt(token).then((result) => {
      setPayload(result);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    if (token && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
  }, [token]);

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-20 text-center">
          <p className="text-muted-foreground text-sm">Verifying token...</p>
        </section>
      </main>
    );
  }

  if (!token || !payload) {
    return (
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Token</h1>
          <p className="text-muted-foreground text-sm mb-6">
            No valid payment token was found in the URL.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </section>
      </main>
    );
  }

  const wallet = payload.sub;
  const subs = payload.subscriptions ?? [];
  const isExpired = payload.exp < Date.now() / 1000;

  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-20">
        <div className="text-center mb-10">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
          <p className="text-muted-foreground text-sm">
            Your subscription has been created and verified on Solana.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border border-border p-5 space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Wallet
            </h2>
            <Copyable value={wallet} />
            {isExpired && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Token expired — refresh recommended
              </p>
            )}
          </div>

          <div className="border border-border p-5 space-y-4">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Subscriptions ({subs.length})
            </h2>

            {subs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active subscriptions found.
              </p>
            )}

            {subs.map((sub, i) => (
              <div
                key={sub.policyAddress}
                className={`p-4 bg-muted/30 ${i > 0 ? "mt-3" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-lg font-semibold">{sub.amount} USDC</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFrequency(sub.paymentFrequency)}
                    </p>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>

                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Recipient</span>
                    <Copyable value={sub.recipient} />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Policy</span>
                    <Copyable value={sub.policyAddress} />
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Total Payments
                    </span>
                    <span className="block">{sub.totalPayments}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auto Renew</span>
                    <span className="block">
                      {sub.autoRenew ? "Yes" : "No"}
                      {sub.maxRenewals !== null && ` (max ${sub.maxRenewals})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Executed</span>
                    <span className="block">
                      {formatTimestamp(sub.lastExecuted)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Payment</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(sub.nextPaymentDue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-border p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                JWT Token
              </h2>
              <button
                onClick={handleCopyToken}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {copiedToken ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="text-[10px] text-muted-foreground break-all leading-relaxed max-h-32 overflow-auto">
              {token.slice(0, 80)}...
            </pre>
          </div>

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
    </main>
  );
}
