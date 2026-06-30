import { Input, Switch } from "@heroui/react";
import { PublicKey } from "@solana/web3.js";
import type { TopupFormState, FormPatch } from "@/lib/form";
import { solToLamports } from "@/lib/units";
import { StepShell } from "@/components/StepShell";
import { useErrorShake } from "@/components/transitions";

/** Step 3 — target SOL account, balance trigger, unwrap toggle. */
export function TargetStep({
  state,
  patch,
}: {
  state: TopupFormState;
  patch: (p: FormPatch) => void;
}) {
  const shake = useErrorShake();
  const thresholdLamports = solToLamports(state.thresholdSol);

  const validateHotWallet = (value: string) => {
    patch({ hotWallet: value });
    if (value && !isValidPubkey(value)) {
      shake.trigger("Not a valid Solana public key.");
    } else {
      shake.clear();
    }
  };

  return (
    <StepShell
      index={3}
      label="Target"
      intro={[
        "Hot wallet & trigger",
        "Where SOL lands, and how low its balance must drop to fire.",
      ]}
    >
      <div className="border border-border p-6 space-y-5">
        <div ref={shake.wrapRef} className="t-input-wrap space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Hot wallet (receives SOL)
          </span>
          <div ref={shake.inputRef} className="t-input border border-border">
            <input
              className="w-full bg-transparent px-3 py-2 text-sm font-mono outline-none"
              placeholder="Paste the recipient public key"
              value={state.hotWallet}
              onChange={(e) => validateHotWallet(e.target.value)}
            />
          </div>
          <p className="t-error-msg text-xs text-destructive" />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Trigger when SOL below
            </span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={String(state.thresholdSol)}
              onValueChange={(v) => patch({ thresholdSol: Number(v) || 0 })}
              endContent={
                <span className="text-xs text-muted-foreground">SOL</span>
              }
              variant="bordered"
              classNames={{ inputWrapper: "border-border" }}
            />
            <span className="block text-[10px] text-muted-foreground/70 font-mono">
              = {thresholdLamports.toString()} lamports
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <div className="text-sm">Unwrap WSOL → native SOL</div>
            <div className="text-xs text-muted-foreground">
              Sweep the WSOL swap output as native SOL via closeAccount
              (NATIVE_OUTPUT).
            </div>
          </div>
          <Switch
            isSelected={state.unwrap}
            onValueChange={(v) => patch({ unwrap: v })}
          />
        </div>
      </div>
    </StepShell>
  );
}

function isValidPubkey(s: string): boolean {
  if (!s) return false;
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}
