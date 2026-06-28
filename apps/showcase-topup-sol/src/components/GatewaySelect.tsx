import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectItem } from "@heroui/react";
import { decodeMemo } from "@tributary-so/sdk";
import type { TopupFormState, FormPatch } from "@/lib/form";
import { useTributarySdk } from "@/lib/tributary";
import { StepShell } from "@/components/StepShell";
import { SkeletonReveal } from "@/components/transitions";

/**
 * Gateway selection — fetched on-chain via the Tributary SDK. The policy must
 * reference an existing PaymentGateway (its authority signs executes). No
 * create option: if no gateways exist, the user needs one set up elsewhere
 * first.
 */
export function GatewaySelect({
  state,
  patch,
}: {
  state: TopupFormState;
  patch: (p: FormPatch) => void;
}) {
  const sdk = useTributarySdk();

  const gateways = useQuery({
    queryKey: ["payment-gateways", !!sdk],
    queryFn: async () => {
      if (!sdk) return [];
      const all = await sdk.getAllPaymentGateway();
      return all.filter((g) => g.account.isActive);
    },
    enabled: !!sdk,
  });

  const list = gateways.data ?? [];

  // Auto-select the first gateway once the list loads.
  useEffect(() => {
    if (list.length > 0 && !state.gateway) {
      patch({ gateway: list[0].publicKey.toBase58() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

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
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Gateway
          </span>
          <SkeletonReveal
            loaded={!gateways.isLoading}
            skeleton={<div className="t-skel-bar w-full h-10" />}
          >
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No active gateways on this cluster. Create one (e.g. via the
                manager CLI) before configuring a policy.
              </p>
            ) : (
              <Select
                selectedKeys={state.gateway ? [state.gateway] : []}
                onChange={(e) => patch({ gateway: e.target.value })}
                variant="bordered"
                classNames={{ trigger: "border-border" }}
              >
                {list.map((g) => (
                  <SelectItem
                    key={g.publicKey.toBase58()}
                    description={`${g.publicKey
                      .toBase58()
                      .slice(0, 8)}…${g.publicKey.toBase58().slice(-6)} · ${g.account.gatewayFeeBps
                      } bps`}
                  >
                    {decodeMemo(g.account.name) || "Unnamed gateway"}
                  </SelectItem>
                ))}
              </Select>
            )}
          </SkeletonReveal>
        </label>
      </div>
    </StepShell>
  );
}
