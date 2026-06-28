import { RefreshCw, AlertCircle } from "lucide-react";
import type { TributaryJWTPayload } from "@tributary-so/payments";

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

interface PaymentDetailsProps {
  payload: TributaryJWTPayload;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function PaymentDetails({
  payload,
  loading = false,
  error = null,
  onRefresh,
}: PaymentDetailsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Active Subscription</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {loading && (
        <p className="text-muted-foreground text-sm">Resolving token...</p>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>No subscription found for this recipient.</span>
        </div>
      )}

      {payload.subscriptions.map((sub) => (
        <div
          key={sub.policyAddress}
          className="border border-border p-4 space-y-2 text-sm"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {fmtAmount(sub.amount)} USDC / {sub.paymentFrequency}
            </span>
            <span className={`font-medium ${statusColor(sub.status)}`}>
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

      {payload.subscriptions.length === 0 && !error && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>No active subscriptions for this recipient.</span>
        </div>
      )}

      {payload.lastPayments.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">Recent Payments</h3>
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
                    To: {p.recipient.slice(0, 8)}...{p.recipient.slice(-4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
