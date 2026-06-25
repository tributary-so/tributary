import { useEffect } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import type { TopupFormState, FormPatch } from "@/lib/form";
import { PRESET_POOLS } from "@/lib/pools";
import { StepShell } from "@/components/StepShell";
import { Tooltip } from "@/components/transitions";
import { HelpCircle } from "lucide-react";

/** Step 4 — DEX + pool selection + slippage. Only Meteora DLMM supported today. */
export function SwapStep({
  state,
  patch,
}: {
  state: TopupFormState;
  patch: (p: FormPatch) => void;
}) {
  // Default the pool address to the first preset once, on mount.
  useEffect(() => {
    if (!state.poolAddress && PRESET_POOLS[0]) {
      patch({ poolAddress: PRESET_POOLS[0].address.toBase58() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepShell
      index={4}
      label="Swap route"
      intro={[
        "DEX & pool",
        "How the USDC chunk becomes WSOL. Meteora DLMM only, for now.",
      ]}
    >
      <div className="border border-border p-6 space-y-5">
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            DEX
          </span>
          <Select
            disallowEmptySelection
            selectedKeys={["meteora"]}
            variant="bordered"
            classNames={{ trigger: "border-border" }}
            isDisabled
          >
            <SelectItem key="meteora">Meteora DLMM</SelectItem>
          </Select>
          <span className="block text-[10px] text-muted-foreground/70">
            More DEXes can be added — Tributary allowlists forward programs
            on-chain.
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Pool
            <Tooltip content="Pick a preset DLMM LbPair, or paste a custom one. The swap runs inside the policy execution.">
              <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
            </Tooltip>
          </span>
          <Autocomplete
            allowsCustomValue
            placeholder="Select a preset or paste a pool address"
            selectedKey={undefined}
            defaultItems={PRESET_POOLS}
            onInputChange={(v) => patch({ poolAddress: v.trim() })}
            inputValue={state.poolAddress}
            variant="bordered"
          >
            {(item) => (
              <AutocompleteItem
                key={item.address.toBase58()}
                textValue={item.address.toBase58()}
              >
                <div className="flex flex-col">
                  <span className="text-sm">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {item.address.toBase58().slice(0, 8)}…
                    {item.address.toBase58().slice(-6)}
                  </span>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>
        </label>

        <label className="block space-y-1.5 max-w-[16rem]">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Slippage
            <Tooltip content="Tolerance applied inside the Meteora quote (basis points). 100 = 1%.">
              <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
            </Tooltip>
          </span>
          <Input
            type="number"
            min={0}
            max={10_000}
            step="1"
            value={String(state.slippageBps)}
            onValueChange={(v) => patch({ slippageBps: Number(v) || 0 })}
            endContent={
              <span className="text-xs text-muted-foreground">bps</span>
            }
            variant="bordered"
            classNames={{ inputWrapper: "border-border" }}
          />
        </label>
      </div>
    </StepShell>
  );
}
