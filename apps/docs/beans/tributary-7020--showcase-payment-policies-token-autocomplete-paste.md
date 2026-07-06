---
# tributary-7020
title: 'showcase-payment-policies: token Autocomplete + paste-mint toggle'
status: completed
type: task
priority: high
created_at: 2026-07-03T10:13:32Z
updated_at: 2026-07-06T08:41:27Z
parent: tributary-q1ew
---

Swap the static `<Select>` in `policy-inputs.tsx:452-468` for a HeroUI `<Autocomplete>` with async type-ahead.

Changes:
- `src/lib/token-store.ts` — slim down: import resolveMint from `@tributary-so/tokens-client`, wire into existing atoms.
- `src/components/policy-inputs.tsx`:
  - Replace `<Select>` (lines 452-468) with `<Autocomplete>`
  - Network-gated: mainnet → async search (useAssetSearch); devnet/testnet/localnet → static INITIAL_TOKENS filtered by network
  - Static seed (INITIAL_TOKENS) visible on focus before typing
  - 250ms debounce, 1-char min query, 20 results
  - Selected state: logo (16px rounded) + symbol + name. Monogram fallback (first 2 chars of symbol) when no logoURI.
  - Selection writes BOTH formData.tokenMint AND tokenMetadataAtom[mint] (symbol+name+decimals+logoURI+network)
  - Paste-mint toggle below dropdown: validates PublicKey, resolves, falls back to generic stub
  - Default: network-aware (devnet USDC on devnet, mainnet USDC on mainnet)
- Add `VITE_API_BASE_URL` to `.env.example` (default https://api.tributary.so)

Acceptance:
- [ ] Autocomplete renders with static seed on focus (no network call until typing)
- [ ] Typing triggers debounced search, shows spinner, renders results with logos
- [ ] Selecting a result writes mint + metadata atomically
- [ ] Amount input shows correct symbol suffix (getTokenSymbol reads from atom)
- [ ] Submit computes correct decimal scaling (getTokenPrecision reads from atom)
- [ ] Devnet mode shows static list only (no API search)
- [ ] Paste-mint toggle validates + resolves + falls back gracefully
- [ ] Default tokenMint is network-aware
- [ ] No console errors on mainnet or devnet

## Summary of Changes

Landed in commit efce9d0:
- apps/showcase-payment-policies/src/components/token-autocomplete.tsx (NEW): HeroUI Autocomplete, 250ms debounce, 1-char min query, 20 results, paste-mint toggle, network-gated (mainnet=async+seed, devnet=seed only), monogram fallback, selected-state logo
- apps/showcase-payment-policies/src/components/policy-inputs.tsx: replaced <Select> with <TokenAutocomplete>, network-aware default mint via defaultMintForNetwork()
- apps/showcase-payment-policies/src/lib/token-store.ts: slimmed, imports INITIAL_TOKENS from package
