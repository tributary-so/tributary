import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { setTokenMetadataMapAtom } from '@/lib/token-store'

export function TokenMetadataProvider({ children }: { children: React.ReactNode }) {
  const setTokenMetadataMap = useSetAtom(setTokenMetadataMapAtom)

  useEffect(() => {
    // Initialize common Solana token metadata
    setTokenMetadataMap({
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      So11111111111111111111111111111111111111112: {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
      },
      Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
      },
      mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
        symbol: 'mSOL',
        name: 'Marinade staked SOL',
        decimals: 9,
      },
      '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': {
        symbol: 'USDC (devnet)',
        name: 'USD Coin on Devnet',
        decimals: 6,
      },
    })
  }, [setTokenMetadataMap])

  return <>{children}</>
}
