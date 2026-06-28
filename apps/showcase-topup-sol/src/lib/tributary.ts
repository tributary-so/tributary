import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Tributary } from "@tributary-so/sdk";
import type { IWallet } from "@tributary-so/sdk";

export {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getComposablePolicyPda,
  getValidationPda,
  getPaymentsDelegatePda,
} from "@tributary-so/sdk";

/**
 * Build a Tributary SDK instance bound to the connected wallet + cluster
 * connection. Returns null until a wallet is connected (no publicKey).
 *
 * The wallet-adapter state already exposes publicKey + signTransaction +
 * signAllTransactions, which is exactly Tributary's {@link IWallet} shape.
 *
 * Re-created when the connection endpoint or wallet changes.
 */
export function useTributarySdk(): Tributary | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      return null;
    }
    const iwallet: IWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction as IWallet["signTransaction"],
      signAllTransactions:
        wallet.signAllTransactions as IWallet["signAllTransactions"],
    };
    return new Tributary(connection, iwallet);
  }, [
    connection,
    wallet.publicKey,
    wallet.signTransaction,
    wallet.signAllTransactions,
  ]);
}
