import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Tributary } from "@tributary-so/sdk";

export function useTributarySDK(): Tributary | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }

    return new Tributary(connection, wallet as any);
  }, [connection, wallet]);
}
