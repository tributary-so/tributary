import { atom } from 'jotai'

export type Network = 'mainnet' | 'devnet' | 'testnet' | 'localnet'

export interface TokenMetadata {
  symbol: string
  name?: string
  decimals?: number
  logoURI?: string
  network?: Network
}

export type TokenMetadataMap = Record<string, TokenMetadata>

const INITIAL_TOKENS: TokenMetadataMap = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    network: 'mainnet' as Network,
  },
  So11111111111111111111111111111111111111112: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    network: 'mainnet' as Network,
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    network: 'mainnet' as Network,
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    symbol: 'mSOL',
    name: 'Marinade staked SOL',
    decimals: 9,
    network: 'mainnet' as Network,
  },
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': {
    symbol: 'USDC (devnet)',
    name: 'USD Coin on Devnet',
    decimals: 6,
    network: 'devnet' as Network,
  },
}

export const tokenMetadataAtom = atom<TokenMetadataMap>(INITIAL_TOKENS)

export const getTokenSymbolAtom = atom((get) => (tokenMint: string): string => {
  const metadata = get(tokenMetadataAtom)[tokenMint]
  return metadata?.symbol ?? tokenMint.slice(0, 4) + '...'
})

export const setTokenMetadataAtom = atom(null, (get, set, tokenMint: string, metadata: TokenMetadata) => {
  const current = get(tokenMetadataAtom)
  set(tokenMetadataAtom, { ...current, [tokenMint]: metadata })
})

export const setTokenMetadataMapAtom = atom(null, (get, set, metadataMap: TokenMetadataMap) => {
  const current = get(tokenMetadataAtom)
  set(tokenMetadataAtom, { ...current, ...metadataMap })
})

export const availableTokensAtom = atom((get) => {
  const metadata = get(tokenMetadataAtom)
  return Object.entries(metadata).map(([address, data]) => ({
    address,
    symbol: data.symbol,
    name: data.name,
    decimals: data.decimals,
    network: data.network,
  }))
})

export const getTokenPrecisionAtom = atom((get) => (tokenMint: string): number => {
  const metadata = get(tokenMetadataAtom)[tokenMint]
  return metadata?.decimals ?? 1
})
