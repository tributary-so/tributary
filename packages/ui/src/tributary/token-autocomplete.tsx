/**
 * TokenAutocomplete — async type-ahead token picker backed by the
 * Tributary /v1/assets proxy (tokens.xyz catalog, ADR-0028).
 *
 * - Mainnet: async search + static seed list as instant bootstrap.
 * - Devnet/testnet/localnet: static fallback list only (filtered by network).
 * - Paste-mint toggle: collapsed by default; expanded reveals a base58
 *   input. Validates, attempts resolve, falls back to a generic stub.
 */

import { useMemo, useState } from 'react'
import { Autocomplete, AutocompleteItem, Button, Input, Spinner } from '@heroui/react'
import { PublicKey } from '@solana/web3.js'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  createTokensClient,
  type AssetSearchResult,
  type Network,
  type TokenMetadata,
} from '@tributary-so/tokens-client'
import { useAssetSearch } from '@tributary-so/tokens-client/react'
import { availableTokensAtom, setTokenMetadataAtom, tokenMetadataAtom } from './token-store'

export interface TokenAutocompleteProps {
  /** Currently-selected mint (base58). */
  value: string
  /** Fired with the mint + projected metadata when the user picks one. */
  onSelect: (mint: string, metadata: TokenMetadata) => void
  network: Network
  apiBaseUrl: string
  className?: string
  label?: string
  placeholder?: string
}

interface Row {
  key: string
  mint: string
  symbol: string | null
  name: string | null
  decimals: number | null
  logoURI: string | null
  network: Network | undefined
}

function monogram(symbol: string | null): string {
  return (symbol || '?').slice(0, 2).toUpperCase()
}

function LogoCell({ symbol, logoURI }: { symbol: string | null; logoURI: string | null }) {
  if (logoURI) {
    return (
      <img
        src={logoURI}
        alt=""
        width={16}
        height={16}
        className="rounded-full object-cover"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
      {monogram(symbol)}
    </span>
  )
}

export function TokenAutocomplete({
  value,
  onSelect,
  network,
  apiBaseUrl,
  className,
  label = 'Token',
  placeholder = 'Search symbol, name, or asset…',
}: TokenAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteValue, setPasteValue] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pasteResolving, setPasteResolving] = useState(false)

  const [metadataMap] = useAtom(tokenMetadataAtom)
  const setTokenMetadata = useSetAtom(setTokenMetadataAtom)
  const seed = useAtomValue(availableTokensAtom)

  const isMainnet = network === 'mainnet'

  // Async search — only enabled on mainnet, only when query ≥ 1 char.
  const search = useAssetSearch(query, { baseUrl: apiBaseUrl }, { enabled: isMainnet, limit: 20, debounceMs: 250 })

  // Map async results to Row shape.
  const asyncRows: Row[] = useMemo(() => {
    if (!isMainnet) return []
    return (search.data?.results ?? [])
      .map((r: AssetSearchResult) => ({
        key: r.primaryVariant?.mint ?? r.assetId,
        mint: r.primaryVariant?.mint ?? '',
        symbol: r.symbol,
        name: r.name,
        decimals: r.primaryVariant?.decimals ?? null,
        logoURI: r.imageUrl,
        network: 'mainnet' as Network,
      }))
      .filter((r) => r.mint)
  }, [isMainnet, search.data])

  const seedRows: Row[] = useMemo(
    () =>
      seed
        .filter((t) => !t.network || t.network === network)
        .map((t) => ({
          key: t.address,
          mint: t.address,
          symbol: t.symbol,
          name: t.name ?? null,
          decimals: t.decimals ?? null,
          logoURI: null,
          network: t.network,
        })),
    [seed, network],
  )

  // Merge: async first (most relevant), then any seed mints not already present.
  const rows = useMemo(() => {
    const seen = new Set<string>()
    const merged: Row[] = []
    for (const r of [...asyncRows, ...seedRows]) {
      if (!r.mint || seen.has(r.mint)) continue
      seen.add(r.mint)
      merged.push(r)
    }
    return merged
  }, [asyncRows, seedRows])

  const selectedMeta = value ? metadataMap[value] : undefined

  function commit(row: Row) {
    const meta: TokenMetadata = {
      symbol: row.symbol,
      name: row.name ?? undefined,
      decimals: row.decimals ?? undefined,
      logoURI: row.logoURI ?? undefined,
      network: row.network ?? network,
    }
    setTokenMetadata(row.mint, meta)
    onSelect(row.mint, meta)
  }

  async function handlePasteResolve() {
    setPasteError(null)
    const mint = pasteValue.trim()
    if (!mint) return
    let pk: PublicKey
    try {
      pk = new PublicKey(mint)
    } catch {
      setPasteError('Not a valid base58 mint')
      return
    }
    const mintStr = pk.toBase58()
    setPasteResolving(true)
    try {
      const client = createTokensClient({ baseUrl: apiBaseUrl })
      const data = await client.resolveMint(mintStr)
      const meta: TokenMetadata = data
        ? {
            symbol: data.symbol,
            name: data.name ?? undefined,
            decimals: data.decimals ?? 6,
            logoURI: data.imageUrl ?? undefined,
            network,
          }
        : {
            // ponytail: generic stub for unknown mints. decimals=6 is the
            // common case for stablecoins; the form still works for any
            // token — the user can read raw amounts.
            symbol: mintStr.slice(0, 4) + '...',
            decimals: 6,
            network,
          }
      setTokenMetadata(mintStr, meta)
      onSelect(mintStr, meta)
      setPasteOpen(false)
      setPasteValue('')
    } catch {
      setPasteError('Resolve failed — try again')
    } finally {
      setPasteResolving(false)
    }
  }

  const isLoading = isMainnet && search.isFetching
  const noResults = !rows.length && !isLoading && query.trim().length >= 1

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground uppercase tracking-wide mb-1">{label}</label>
      <Autocomplete
        aria-label={label}
        placeholder={placeholder}
        inputValue={query}
        selectedKey={value ?? undefined}
        onInputChange={(v) => setQuery(v)}
        onSelectionChange={(key) => {
          if (!key) return
          const row = rows.find((r) => r.key === key)
          if (row) commit(row)
        }}
        items={rows}
        allowsCustomValue={false}
        menuTrigger="input"
        startContent={
          selectedMeta ? <LogoCell symbol={selectedMeta.symbol} logoURI={selectedMeta.logoURI ?? null} /> : null
        }
        endContent={isLoading ? <Spinner size="sm" aria-label="Searching tokens" /> : null}
      >
        {(row) => (
          <AutocompleteItem
            textValue={row.symbol ?? row.mint}
            startContent={<LogoCell symbol={row.symbol} logoURI={row.logoURI} />}
            description={row.name ?? row.mint.slice(0, 8) + '…'}
          >
            <span className="font-medium">{row.symbol ?? row.mint.slice(0, 8)}</span>
          </AutocompleteItem>
        )}
      </Autocomplete>
      {noResults ? (
        <p className="mt-1 text-[11px] text-muted-foreground">No tokens found for &lsquo;{query.trim()}&rsquo;.</p>
      ) : null}

      {/* Paste-mint escape hatch (devnet + long-tail mainnet). */}
      <button
        type="button"
        onClick={() => setPasteOpen((v) => !v)}
        className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        {pasteOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Paste a mint address
      </button>
      {pasteOpen ? (
        <div className="mt-2 flex flex-col gap-2 rounded border border-border p-2">
          <Input
            size="sm"
            variant="bordered"
            placeholder="Base58 mint, e.g. EPjFWdd5…"
            value={pasteValue}
            onValueChange={setPasteValue}
            isInvalid={Boolean(pasteError)}
            errorMessage={pasteError ?? undefined}
            endContent={
              <Button size="sm" color="primary" variant="flat" isLoading={pasteResolving} onPress={handlePasteResolve}>
                Resolve
              </Button>
            }
          />
        </div>
      ) : null}
    </div>
  )
}
