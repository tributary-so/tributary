# React SDK (`@tributary-so/sdk-react`)

Drop-in payment components and React hooks for Tributary. Handles wallet interaction, transaction construction, signing, and confirmation — so you don't have to.

## Installation

```bash
pnpm install @tributary-so/sdk-react @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/web3.js @coral-xyz/anchor
```

## Wallet Provider Setup

All components and hooks require `@solana/wallet-adapter-react` providers. Wrap your app once:

```typescript
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";

const wallets = [new PhantomWalletAdapter()];
const endpoint = clusterApiUrl("mainnet-beta");

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{/* Your app */}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

## SDK Components

- [Hooks](./hooks.md)
- [Quick Buttons](./buttons.md)
- [Common Patterns](./common.md)
