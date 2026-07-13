import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import React, { useMemo } from "react";
import { useCluster } from "./cluster/cluster-data-access";
import "@solana/wallet-adapter-react-ui/styles.css";

export { WalletMultiButton as WalletButton };

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const { cluster } = useCluster();
  const endpoint = useMemo(() => cluster.endpoint, [cluster]);
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
