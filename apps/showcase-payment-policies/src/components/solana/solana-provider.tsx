import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import '@solana/wallet-adapter-react-ui/styles.css'

import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'

export { WalletMultiButton as WalletButton }

const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const { cluster } = useCluster()
  const endpoint = useMemo(() => cluster.endpoint, [cluster])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
