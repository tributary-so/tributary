import { useState } from "react";
import type { FormPatch, TopupFormState } from "@/lib/form";
import { INITIAL_FORM } from "@/lib/form";
import { ConnectStep } from "@/components/steps/ConnectStep";
import { FundingStep } from "@/components/steps/FundingStep";
import { TargetStep } from "@/components/steps/TargetStep";
import { SwapStep } from "@/components/steps/SwapStep";
import { GatewaySelect } from "@/components/GatewaySelect";
import { CreatePolicyButton } from "@/components/CreatePolicyButton";

/**
 * Single-page configuration form. Owns the form state and threads it down to
 * each step. The create-policy action + success state land in T5.
 */
export default function SetupPage() {
  const [form, setForm] = useState<TopupFormState>(INITIAL_FORM);
  const patch = (p: FormPatch) => setForm((prev) => ({ ...prev, ...p }));

  return (
    <div className="py-12">
      <header className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Composable SOL Top-up
        </h1>
        <p className="text-muted-foreground mt-2 max-w-[60ch]">
          Configure a pull-payment policy that auto-swaps USDC to SOL via
          Meteora and tops up a hot wallet whenever its balance dips below a
          threshold.
        </p>
      </header>

      <ConnectStep />
      <GatewaySelect state={form} patch={patch} />
      <FundingStep state={form} patch={patch} />
      <TargetStep state={form} patch={patch} />
      <SwapStep state={form} patch={patch} />

      <div className="mt-10 max-w-md ml-auto">
        <CreatePolicyButton form={form} />
      </div>
    </div>
  );
}
