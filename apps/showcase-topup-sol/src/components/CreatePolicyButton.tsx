import { useMemo } from "react";
import { Button } from "@heroui/react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { TopupFormState } from "@/lib/form";
import { validateForm } from "@/lib/form";
import { useCreateTopupPolicy } from "@/hooks/useCreateTopupPolicy";
import { SuccessCard } from "@/components/SuccessCard";

export function CreatePolicyButton({ form }: { form: TopupFormState }) {
  const { connected } = useWallet();
  const { status, error, result, submit, reset } = useCreateTopupPolicy();

  const validationError = useMemo(() => validateForm(form), [form]);

  if (status === "success" && result) {
    return (
      <div className="space-y-4">
        <SuccessCard
          signature={result.signature}
          policyPda={result.policyPda}
        />
        <Button variant="bordered" onPress={reset} className="w-full">
          Configure another
        </Button>
      </div>
    );
  }

  const busy = status === "preparing" || status === "sending";
  const label = !connected
    ? "Connect a wallet first"
    : status === "preparing"
    ? "Preparing transaction…"
    : status === "sending"
    ? "Awaiting signature…"
    : "Create top-up policy";

  return (
    <div className="space-y-3">
      <Button
        color="primary"
        className="w-full font-semibold"
        isDisabled={!connected || busy || !!validationError}
        isLoading={busy}
        onPress={() => submit(form).catch(() => {})}
      >
        {label}
      </Button>
      {validationError && connected && !busy && (
        <p className="text-xs text-muted-foreground">{validationError}</p>
      )}
      {error && <p className="text-xs text-destructive break-all">{error}</p>}
    </div>
  );
}
