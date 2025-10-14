import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { RecurringPaymentsSDK } from "@tributary-so/sdk";

export function useTributarySDK(): RecurringPaymentsSDK | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }

    return new RecurringPaymentsSDK(connection, wallet as any);
  }, [connection, wallet]);
}
