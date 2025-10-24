import { ReactQueryProvider } from './react-query-provider'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { TokenMetadataProvider } from './token-metadata-provider'
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
