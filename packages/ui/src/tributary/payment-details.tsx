// Canonical copy (extraction from showcase-payments + checkout + showcase-payment-policies).
import { RefreshCw, AlertCircle } from "lucide-react";
import type {
  TributaryJWTPayload,
  PolicyClaim,
  SubscriptionPolicyClaim,
  MilestonePolicyClaim,
  PayAsYouGoPolicyClaim,
  OneTimePolicyClaim,
  UpToPolicyClaim,
} from "@tributary-so/payments";

const fmtAmount = (raw: string) => {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return raw;
  return (n / 1e6).toFixed(2);
};

const fmtDate = (ts: number | null | undefined) => {
  if (!ts) return "N/A";
  return new Date(ts * 1000).toLocaleDateString();
};

const statusColor = (status: string) => {
  switch (status) {
    case "paid":
    case "active":
    case "completed":
    case "settled":
      return "text-emerald-600";
    case "overdue":
    case "expired":
    case "exhausted":
      return "text-red-500";
    case "pending":
      return "text-amber-500";
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
  // ponytail: prefer new discriminated `policies`. Fall back to legacy
  // `subscriptions` for tokens issued before ADR-0023.
  const policies: PolicyClaim[] = (payload as TributaryJWTPayload).policies ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Active Policies</h2>
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
          <span>No policy found for this recipient.</span>
        </div>
      )}

      {policies.map((p) => (
        <PolicyRow key={p.policyAddress} policy={p} />
      ))}

      {policies.length === 0 && !error && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>No active policies for this recipient.</span>
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

function PolicyRow({ policy }: { policy: PolicyClaim }) {
  switch (policy.variant) {
    case "subscription":
      return <SubscriptionRow p={policy as SubscriptionPolicyClaim} />;
    case "milestone":
      return <MilestoneRow p={policy as MilestonePolicyClaim} />;
    case "payAsYouGo":
      return <PayAsYouGoRow p={policy as PayAsYouGoPolicyClaim} />;
    case "oneTime":
      return <OneTimeRow p={policy as OneTimePolicyClaim} />;
    case "upTo":
      return <UpToRow p={policy as UpToPolicyClaim} />;
  }
}

function RowShell({
  title,
  status,
  children,
}: {
  title: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border p-4 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{title}</span>
        <span className={`font-medium ${statusColor(status)}`}>
          {status.toUpperCase()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground text-xs">
        {children}
      </div>
    </div>
  );
}

function SubscriptionRow({ p }: { p: SubscriptionPolicyClaim }) {
  return (
    <RowShell
      title={`${fmtAmount(p.amount)} USDC / ${p.paymentFrequency}`}
      status={p.status}
    >
      <span>Policy #{p.policyId}</span>
      <span>Payments: {p.totalPayments}</span>
      <span>Next due: {fmtDate(p.nextPaymentDue)}</span>
      <span>Created: {fmtDate(p.createdAt)}</span>
    </RowShell>
  );
}

function MilestoneRow({ p }: { p: MilestonePolicyClaim }) {
  return (
    <RowShell
      title={`Milestone ${p.currentMilestone}/${p.totalMilestones}`}
      status={p.status}
    >
      <span>Policy #{p.policyId}</span>
      <span>Escrow remaining: {fmtAmount(p.escrowRemaining)} USDC</span>
      <span>Created: {fmtDate(p.createdAt)}</span>
      <span>Release condition: 0x{p.releaseCondition.toString(16)}</span>
    </RowShell>
  );
}

function PayAsYouGoRow({ p }: { p: PayAsYouGoPolicyClaim }) {
  return (
    <RowShell
      title={`Pay-as-you-go · cap ${fmtAmount(p.maxAmountPerPeriod)} USDC`}
      status={p.status}
    >
      <span>Policy #{p.policyId}</span>
      <span>Remaining: {fmtAmount(p.capRemainingThisPeriod)} USDC</span>
      <span>Resets: {fmtDate(p.periodResetsAt)}</span>
      <span>Created: {fmtDate(p.createdAt)}</span>
    </RowShell>
  );
}

function OneTimeRow({ p }: { p: OneTimePolicyClaim }) {
  return (
    <RowShell
      title={`One-time · ${fmtAmount(p.amount)} USDC`}
      status={p.status}
    >
      <span>Policy #{p.policyId}</span>
      <span>Due: {fmtDate(p.dueDate)}</span>
      <span>Expires: {fmtDate(p.expiryDate)}</span>
      <span>Created: {fmtDate(p.createdAt)}</span>
    </RowShell>
  );
}

function UpToRow({ p }: { p: UpToPolicyClaim }) {
  return (
    <RowShell
      title={`Up-to · ${fmtAmount(p.maxAmount)} USDC`}
      status={p.status}
    >
      <span>Policy #{p.policyId}</span>
      <span>Valid after: {fmtDate(p.validAfter)}</span>
      <span>Deadline: {fmtDate(p.deadline)}</span>
      <span>Created: {fmtDate(p.createdAt)}</span>
    </RowShell>
  );
}
