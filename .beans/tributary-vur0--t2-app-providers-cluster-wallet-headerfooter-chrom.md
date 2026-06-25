---
# tributary-vur0
title: 'T2: App providers, cluster, wallet, header/footer chrome'
status: completed
type: task
priority: normal
created_at: 2026-06-25T10:48:53Z
updated_at: 2026-06-25T10:59:33Z
parent: tributary-vyg1
blocked_by:
    - tributary-ccg8
---

Port apps/app chrome into topup-sol: src/components/app-providers.tsx (HeroUIProvider > ReactQueryProvider > ClusterProvider > SolanaProvider > ToastProvider), react-query-provider.tsx, cluster/cluster-data-access.tsx (jotai atomWithStorage, add 'surfpool' cluster default http://localhost:8000 as first/default entry alongside mainnet/devnet), cluster/cluster-ui.tsx (ClusterUiSelect, ExplorerLink), solana/solana-provider.tsx (ConnectionProvider+WalletProvider Phantom+Solflare, export WalletButton), app-header.tsx (TRIBUTARY wordmark, Docs link, ClusterUiSelect, WalletButton, ThemeToggle, mobile hamburger), app-footer.tsx (Tributary footer copy). Wire app.tsx to render AppProviders > AppHeader > main > AppFooter with 'Loading...' Suspense fallback. NO business logic. Verify: dev server boots, wallet connects, cluster switch works.

## Summary of Changes

Ported apps/app chrome into apps/topup-sol:
- components/react-query-provider.tsx (QueryClient)
- components/cluster/cluster-data-access.tsx (jotai atomWithStorage; 'surfpool' cluster http://localhost:8000 default, + mainnet + devnet; getExplorerUrl)
- components/cluster/cluster-ui.tsx (ClusterUiSelect, ExplorerLink, ClusterChecker)
- components/solana/solana-provider.tsx (ConnectionProvider+WalletProvider Phantom+Solflare; exports WalletButton)
- components/app-providers.tsx (HeroUIProvider > ReactQueryProvider > ClusterProvider > SolanaProvider > ToastProvider)
- components/app-header.tsx (TRIBUTARY wordmark, Docs link, Top-up SOL label, WalletButton, ClusterUiSelect, ThemeToggle)
- components/app-footer.tsx (Tributary footer copy)
- app.tsx wired to AppProviders > AppHeader > main > AppFooter
- .env.example: VITE_SOLANA_API_SURFPOOL default localhost:8000

Verified: tsc -b clean, vite build succeeds (heroui/wallet-adapter/jotai/react-query bundle).
