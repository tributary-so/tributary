import { ReactQueryProvider, ClusterProvider, SolanaProvider } from '@tributary-so/ui/solana'
import { TokenMetadataProvider } from '@tributary-so/ui/tributary'
import { HeroUIProvider, ToastProvider } from '@heroui/react'

import React from 'react'

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <HeroUIProvider>
      <ReactQueryProvider>
        <ClusterProvider>
          <SolanaProvider>
            <TokenMetadataProvider>
              <ToastProvider />
              {children}
            </TokenMetadataProvider>
          </SolanaProvider>
        </ClusterProvider>
      </ReactQueryProvider>
    </HeroUIProvider>
  )
}
