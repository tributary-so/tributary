/**
 * App-local token store (jotai atoms).
 *
 * Token catalog data now flows in from `@tributary-so/tokens-client`
 * (ADR-0028): the seed list + MINT_OVERRIDES live there, and the
 * Autocomplete / resolve hooks populate this atom dynamically.
 */

import { atom } from 'jotai'
import { INITIAL_TOKENS, type TokenMetadata, type TokenMetadataMap } from '@tributary-so/tokens-client'

export type { Network, TokenMetadata, TokenMetadataMap } from '@tributary-so/tokens-client'

/** Seed with the well-known mints; enriched at runtime by resolve hooks. */
export const tokenMetadataAtom = atom<TokenMetadataMap>({ ...INITIAL_TOKENS })

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
