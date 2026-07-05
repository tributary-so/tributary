"use client";

import { OneTimePolicyParams } from "@tributary-so/payments";
import { PolicyFormShell, formatTimestamp } from "./policy-form-shell";
import { createOneTimePolicy } from "@/lib/tributary";
import { PublicKey } from "@solana/web3.js";

interface OneTimePolicyFormProps {
  sessionData: OneTimePolicyParams;
}

export function OneTimePolicyForm({ sessionData }: OneTimePolicyFormProps) {
  return (
    <PolicyFormShell
      badge="One-time"
      title="Complete one-time authorization"
      subtitle="Authorize a single fixed payment. Fires once then completes."
      submitLabel={`Authorize ${Number(sessionData.amount).toFixed(2)}`}
      successUrl={sessionData.successUrl}
      cancelUrl={sessionData.cancelUrl}
      trackingId={sessionData.trackingId}
      tokenMint={sessionData.tokenMint}
      recipient={sessionData.recipient}
      onSubmit={async (wallet) => {
        const recipientPk = new PublicKey(sessionData.recipient);
        await createOneTimePolicy({
          wallet,
          recipientWallet: recipientPk,
          tokenMintStr: sessionData.tokenMint,
          amount: Number(sessionData.amount),
          dueDate: sessionData.dueDate,
          expiryDate: sessionData.expiryDate,
          memo: sessionData.memo ?? sessionData.trackingId,
        });
      }}
    >
      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Amount
        </span>
        <span className="font-medium text-foreground">
          {Number(sessionData.amount).toFixed(2)}
        </span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Due
        </span>
        <span className="font-medium text-foreground text-sm">
          {sessionData.dueDate && sessionData.dueDate > 0
            ? formatTimestamp(sessionData.dueDate)
            : "Immediate"}
        </span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Expires
        </span>
        <span className="font-medium text-foreground text-sm">
          {sessionData.expiryDate
            ? formatTimestamp(sessionData.expiryDate)
            : "Never"}
        </span>
      </div>
    </PolicyFormShell>
  );
}
