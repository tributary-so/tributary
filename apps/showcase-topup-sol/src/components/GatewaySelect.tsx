import { GatewaySelect as UiGatewaySelect } from "@tributary-so/ui/tributary";
import type { TopupFormState, FormPatch } from "@/lib/form";
import { useTributarySdk } from "@/lib/tributary";
import { StepShell } from "@/components/StepShell";

/**
 * Gateway selection — on-chain via the Tributary SDK (kit GatewaySelect).
 * The policy must reference an existing PaymentGateway (its authority signs
 * executes). No create option: if no gateways exist, the user needs one set
 * up elsewhere first.
 */
export function GatewaySelect({
  state,
  patch,
}: {
  state: TopupFormState;
  patch: (p: FormPatch) => void;
}) {
  const sdk = useTributarySdk();

  return (
    <StepShell
      index={5}
      label="Gateway"
      intro={[
        "Payment gateway",
        "The gateway that will sign top-up executes. Pick an existing one on this cluster.",
      ]}
    >
      <div className="border border-border p-6">
        <UiGatewaySelect
          sdk={sdk}
          selected={state.gateway || null}
          onSelect={(gateway) => patch({ gateway })}
        />
      </div>
    </StepShell>
  );
}
