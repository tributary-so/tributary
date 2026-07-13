import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Tributary, type IWallet } from "@tributary-so/sdk";

export function useTributarySDK(): Tributary | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }

    // wallet-adapter-react's wallet satisfies IWallet once publicKey and
    // signTransaction are present. The previous `as any` cast bypassed
    // type-checking entirely. See T-3 (review 2026-07-06).
    return new Tributary(connection, wallet as unknown as IWallet);
  }, [connection, wallet]);
}
