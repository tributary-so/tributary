import { ReactQueryProvider } from './react-query-provider'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { HeroUIProvider } from '@heroui/react'
import React from 'react'

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <HeroUIProvider>
      <ReactQueryProvider>
        <ClusterProvider>
          <SolanaProvider>{children}</SolanaProvider>
        </ClusterProvider>
      </ReactQueryProvider>
    </HeroUIProvider>
  )
}