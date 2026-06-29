import React from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import SubscriptionButtonExample from "@/components/SubscriptionButtonExampe";

const endpoint = import.meta.env.VITE_SOLANA_API;
const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
console.log(`Using endpoint: ${endpoint}`);

const CheckoutDemo: React.FC = () => {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SubscriptionButtonExample />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default CheckoutDemo;
