import { atom } from 'jotai'

export interface TokenMetadata {
  symbol: string
  name?: string
  decimals?: number
  logoURI?: string
}

export type TokenMetadataMap = Record<string, TokenMetadata>

export const tokenMetadataAtom = atom<TokenMetadataMap>({})

export const getTokenSymbolAtom = atom((get) => (tokenMint: string): string => {
  const metadata = get(tokenMetadataAtom)[tokenMint]
  return metadata?.symbol ?? tokenMint.slice(0, 4) + '...' + tokenMint.slice(-4)
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
  }))
})

export const getTokenPrecisionAtom = atom((get) => (tokenMint: string): number => {
  const metadata = get(tokenMetadataAtom)[tokenMint]
  return metadata?.decimals ?? 1
})
