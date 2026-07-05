"use client";

import { UpToParams } from "@tributary-so/payments";
import { PolicyFormShell, formatTimestamp } from "./policy-form-shell";
import { createUpToPolicy } from "@/lib/tributary";
import { PublicKey } from "@solana/web3.js";

interface UpToFormProps {
  sessionData: UpToParams;
}

export function UpToForm({ sessionData }: UpToFormProps) {
  return (
    <PolicyFormShell
      badge="UpTo"
      title="Complete UpTo authorization"
      subtitle="Authorize a single variable-amount settlement, capped at a maximum, valid within a time window."
      submitLabel={`Authorize up to ${Number(sessionData.maxAmount).toFixed(2)}`}
      successUrl={sessionData.successUrl}
      cancelUrl={sessionData.cancelUrl}
      trackingId={sessionData.trackingId}
      tokenMint={sessionData.tokenMint}
      recipient={sessionData.recipient}
      onSubmit={async (wallet) => {
        const recipientPk = new PublicKey(sessionData.recipient);
        await createUpToPolicy({
          wallet,
          recipientWallet: recipientPk,
          tokenMintStr: sessionData.tokenMint,
          maxAmount: Number(sessionData.maxAmount),
          deadline: sessionData.deadline,
          validAfter: sessionData.validAfter,
          memo: sessionData.memo ?? sessionData.trackingId,
        });
      }}
    >
      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Max amount
        </span>
        <span className="font-medium text-foreground">
          {Number(sessionData.maxAmount).toFixed(2)}
        </span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Valid from
        </span>
        <span className="font-medium text-foreground text-sm">
          {sessionData.validAfter && sessionData.validAfter > 0
            ? formatTimestamp(sessionData.validAfter)
            : "Immediate"}
        </span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Deadline
        </span>
        <span className="font-medium text-foreground text-sm">
          {formatTimestamp(sessionData.deadline)}
        </span>
      </div>
    </PolicyFormShell>
  );
}
