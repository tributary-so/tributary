"use client";

import { PayAsYouGoParams } from "@tributary-so/payments";
import { PolicyFormShell } from "./policy-form-shell";
import { createPayAsYouGoPolicy } from "@/lib/tributary";
import { PublicKey } from "@solana/web3.js";

interface PayAsYouGoFormProps {
  sessionData: PayAsYouGoParams;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds % 86400 === 0) return `${seconds / 86400} day(s)`;
  if (seconds % 3600 === 0) return `${seconds / 3600} hour(s)`;
  if (seconds % 60 === 0) return `${seconds / 60} minute(s)`;
  return `${seconds}s`;
}

export function PayAsYouGoForm({ sessionData }: PayAsYouGoFormProps) {
  return (
    <PolicyFormShell
      badge="Pay-as-you-go"
      title="Complete pay-as-you-go authorization"
      subtitle="Authorize usage-based pulls up to a per-period cap. Recipient claims as services are consumed."
      submitLabel={`Authorize up to ${Number(sessionData.maxAmountPerPeriod).toFixed(2)} / period`}
      successUrl={sessionData.successUrl}
      cancelUrl={sessionData.cancelUrl}
      trackingId={sessionData.trackingId}
      tokenMint={sessionData.tokenMint}
      recipient={sessionData.recipient}
      onSubmit={async (wallet) => {
        const recipientPk = new PublicKey(sessionData.recipient);
        await createPayAsYouGoPolicy({
          wallet,
          recipientWallet: recipientPk,
          tokenMintStr: sessionData.tokenMint,
          maxAmountPerPeriod: Number(sessionData.maxAmountPerPeriod),
          maxChunkAmount: Number(sessionData.maxChunkAmount),
          periodLengthSeconds: Number(sessionData.periodLengthSeconds),
          memo: sessionData.memo ?? sessionData.trackingId,
        });
      }}
    >
      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Max per period
        </span>
        <span className="font-medium text-foreground">
          {Number(sessionData.maxAmountPerPeriod).toFixed(2)}
        </span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Max per claim
        </span>
        <span className="font-medium text-foreground">
          {Number(sessionData.maxChunkAmount).toFixed(2)}
        </span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Period
        </span>
        <span className="font-medium text-foreground">
          {formatDuration(Number(sessionData.periodLengthSeconds))}
        </span>
      </div>
    </PolicyFormShell>
  );
}
