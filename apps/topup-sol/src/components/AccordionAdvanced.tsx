import { Input } from "@heroui/react";
import type { TopupFormState, FormPatch } from "@/lib/form";
import { Accordion } from "@/components/transitions";

/**
 * Advanced options (collapsed by default). Currently exposes an optional
 * existing-gateway override; if left blank, the cold wallet auto-creates a
 * gateway with itself as authority (handled in the create flow).
 */
export function AccordionAdvanced({
  state,
  patch,
}: {
  state: TopupFormState;
  patch: (p: FormPatch) => void;
}) {
  return (
    <div className="mt-10">
      <Accordion title="Advanced">
        <div className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Gateway (optional)
            </span>
            <Input
              placeholder="Leave blank to auto-create with your wallet"
              value={state.customGateway}
              onValueChange={(v) => patch({ customGateway: v.trim() })}
              variant="bordered"
              classNames={{ inputWrapper: "border-border" }}
            />
            <span className="block text-[10px] text-muted-foreground/70">
              The gateway signs executes later. Blank = a new gateway is created
              with your connected wallet as its authority.
            </span>
          </label>
        </div>
      </Accordion>
    </div>
  );
}
