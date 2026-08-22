import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getUsdcMint } from "@/lib/pools";
import { useCluster } from "@tributary-so/ui/solana";
import { rawToUsdc } from "@/lib/units";
import { SkeletonReveal } from "@/components/transitions";
import { StepShell } from "@/components/StepShell";

/** Step 1 — connect the cold wallet; show its USDC balance via skeleton reveal. */
export function ConnectStep() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { cluster } = useCluster();
  const usdcMint = getUsdcMint(cluster.network);

  const balance = useQuery({
    queryKey: [
      "usdc-balance",
      publicKey?.toBase58(),
      cluster.name,
      connection.rpcEndpoint,
    ],
    queryFn: async () => {
      if (!publicKey) return null;
      const ata = getAssociatedTokenAddressSync(usdcMint, publicKey);
      try {
        const resp = await connection.getTokenAccountBalance(ata);
        return Number(resp.value.amount);
      } catch {
        return null; // no ATA yet
      }
    },
    enabled: !!publicKey,
  });

  return (
    <StepShell
      index={1}
      label="Connect"
      intro={[
        "Cold wallet",
        "The funding source — it holds USDC and delegates spend authority.",
      ]}
    >
      {!connected ? (
        <div className="border border-border p-6">
          <p className="text-sm text-muted-foreground">
            Connect a wallet to begin. It will fund the top-up policy and own
            the delegation.
          </p>
        </div>
      ) : (
        <div className="border border-border p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Connected wallet
            </div>
            <div className="font-mono text-sm mt-1 break-all">
              {publicKey?.toBase58()}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              USDC balance
            </div>
            <div className="h-6 mt-1">
              <SkeletonReveal
                loaded={balance.isFetched}
                skeleton={<div className="t-skel-bar w-32" />}
              >
                <span className="font-mono text-lg">
                  {balance.data === null || balance.data === undefined
                    ? "0.00"
                    : rawToUsdc(balance.data)}{" "}
                  <span className="text-muted-foreground text-sm">USDC</span>
                </span>
              </SkeletonReveal>
            </div>
          </div>
        </div>
      )}
    </StepShell>
  );
}
