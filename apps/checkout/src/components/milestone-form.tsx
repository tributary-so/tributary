"use client";

import { MilestoneParams } from "@tributary-so/payments";
import { PolicyFormShell, formatTimestamp } from "./policy-form-shell";
import { createMilestonePolicy } from "@/lib/tributary";
import { PublicKey } from "@solana/web3.js";

interface MilestoneFormProps {
  sessionData: MilestoneParams;
}

export function MilestoneForm({ sessionData }: MilestoneFormProps) {
  const amounts = sessionData.milestoneAmounts.map(Number);
  const total = amounts.reduce((s, a) => s + a, 0);

  return (
    <PolicyFormShell
      badge="Milestone"
      title="Complete milestone authorization"
      subtitle="Authorize escrowed milestone payments. Funds are released as each milestone becomes due."
      submitLabel={`Authorize ${total.toFixed(2)} (escrow)`}
      successUrl={sessionData.successUrl}
      cancelUrl={sessionData.cancelUrl}
      trackingId={sessionData.trackingId}
      tokenMint={sessionData.tokenMint}
      recipient={sessionData.recipient}
      onSubmit={async (wallet) => {
        const recipientPk = new PublicKey(sessionData.recipient);
        await createMilestonePolicy({
          wallet,
          recipientWallet: recipientPk,
          tokenMintStr: sessionData.tokenMint,
          milestoneAmounts: sessionData.milestoneAmounts.map(Number),
          milestoneTimestamps: sessionData.milestoneTimestamps,
          releaseCondition: sessionData.releaseCondition,
          memo: sessionData.memo ?? sessionData.trackingId,
        });
      }}
    >
      {amounts.map((amt, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-2 border-b border-border"
        >
          <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
            Milestone {i + 1}
          </span>
          <span className="font-medium text-foreground text-sm">
            {amt.toFixed(2)}{" "}
            <span className="text-xs text-muted-foreground">
              · {formatTimestamp(sessionData.milestoneTimestamps[i])}
            </span>
          </span>
        </div>
      ))}

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Total milestones
        </span>
        <span className="font-medium text-foreground">
          {sessionData.totalMilestones}
        </span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-border">
        <span className="text-sm text-muted-foreground uppercase tracking-[0.08em]">
          Escrow total
        </span>
        <span className="font-medium text-foreground">{total.toFixed(2)}</span>
      </div>
    </PolicyFormShell>
  );
}
