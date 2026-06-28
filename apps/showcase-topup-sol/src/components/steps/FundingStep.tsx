import { Input, Select, SelectItem } from "@heroui/react";
import type { TopupFormState, FormPatch } from "@/lib/form";
import { PERIOD_PRESETS } from "@/lib/form";
import { StepShell } from "@/components/StepShell";

/** Step 2 — PayAsYouGo funding parameters. */
export function FundingStep({
  state,
  patch,
}: {
  state: TopupFormState;
  patch: (p: FormPatch) => void;
}) {
  const presetSeconds = PERIOD_PRESETS.find(
    (p) => p.seconds === state.periodSeconds
  )?.seconds;
  const isCustom = presetSeconds === undefined;
  const selectedPreset = isCustom ? -1 : state.periodSeconds;

  return (
    <StepShell
      index={2}
      label="Funding"
      intro={[
        "Pay-as-you-go",
        "How much USDC each top-up pulls, capped per period.",
      ]}
    >
      <div className="border border-border p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="Chunk per top-up"
            hint="USDC pulled on each execute. The swap converts this to WSOL (then SOL if unwrap is on)."
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              value={String(state.chunkUsdc)}
              onValueChange={(v) => patch({ chunkUsdc: Number(v) || 0 })}
              endContent={
                <span className="text-xs text-muted-foreground">USDC</span>
              }
              variant="bordered"
              classNames={{ inputWrapper: "border-border" }}
            />
          </Field>
          <Field
            label="Period cap"
            hint="Max USDC drawable within one period. Set equal to the chunk for a single top-up per period."
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              value={String(state.capUsdc)}
              onValueChange={(v) => patch({ capUsdc: Number(v) || 0 })}
              endContent={
                <span className="text-xs text-muted-foreground">USDC</span>
              }
              variant="bordered"
              classNames={{ inputWrapper: "border-border" }}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="Period"
            hint="How long the cap window lasts before it resets."
          >
            <Select
              selectedKeys={[
                String(selectedPreset === -1 ? -1 : state.periodSeconds),
              ]}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v === -1) {
                  patch({ periodSeconds: state.periodSeconds });
                } else {
                  patch({ periodSeconds: v });
                }
              }}
              variant="bordered"
              classNames={{ trigger: "border-border" }}
            >
              {PERIOD_PRESETS.map((p) => (
                <SelectItem key={String(p.seconds)}>{p.label}</SelectItem>
              ))}
            </Select>
          </Field>
          {isCustom && (
            <Field
              label="Custom period (seconds)"
              hint="Free-form period length in seconds."
            >
              <Input
                type="number"
                min={1}
                value={String(state.periodSeconds)}
                onValueChange={(v) => patch({ periodSeconds: Number(v) || 0 })}
                variant="bordered"
                classNames={{ inputWrapper: "border-border" }}
              />
            </Field>
          )}
        </div>

        {state.chunkUsdc > state.capUsdc && (
          <p className="text-xs text-destructive">
            Chunk exceeds the period cap — no top-up could ever execute.
          </p>
        )}
      </div>
    </StepShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
      <span className="block text-[11px] leading-snug text-muted-foreground/70">
        {hint}
      </span>
    </label>
  );
}
