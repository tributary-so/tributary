---
# tributary-ccg8
title: 'T1: Scaffold apps/topup-sol/ + build/runtime config'
status: completed
type: task
priority: normal
created_at: 2026-06-25T10:48:53Z
updated_at: 2026-06-25T10:55:56Z
parent: tributary-vyg1
---

Create apps/topup-sol/ skeleton mirroring apps/app conventions: package.json (workspace deps: @tributary-so/sdk, @meteora-ag/dlmm, @heroui/react, jotai, @tanstack/react-query, react-router v7, clsx, tailwind-merge, lucide-react, wallet-adapter-*), vite.config.ts (nodePolyfills Buffer, @rollup/plugin-inject, viteTsconfigPaths, base:'./', manualChunks), postcss.config.cjs (@tailwindcss/postcss), tailwind.config.js (heroui() plugin + policy/status colors copy), tsconfig.json + tsconfig.app.json + tsconfig.node.json (@/ alias, strict), index.html, .env.example (VITE_SOLANA_API defaults http://localhost:8000), src/main.tsx (HashRouter + BigInt patch), src/globals.css (GT Cinetype/Denim fonts, radius:0, wallet-adapter overrides), src/app.tsx stub, public/logo.png + fonts placeholders. Add to pnpm-workspace if needed. Verify: pnpm install + pnpm --filter topup-sol build config resolves (no app logic yet).

## Summary of Changes

Scaffolded apps/topup-sol/ mirroring apps/app conventions:
- package.json (workspace deps: @tributary-so/sdk, @meteora-ag/dlmm, @heroui/react, jotai, react-query, wallet-adapter-*, react-router v7, clsx, tailwind-merge, lucide-react)
- vite.config.ts (nodePolyfills Buffer, @rollup/plugin-inject, viteTsconfigPaths, base './', manualChunks for solana/wallet-adapter/meteora vendors)
- postcss.config.cjs (@tailwindcss/postcss)
- tailwind.config.js (heroui() plugin + Tributary color tokens, radius:0)
- tsconfig.json + tsconfig.app.json + tsconfig.node.json (@/ alias, strict)
- eslint.config.js, index.html, .env.example (VITE_SOLANA_API default http://localhost:8000 Surfpool)
- src/hero.ts (heroui theme, primary #000970, radius 0)
- src/index.css (GT Cinetype/Denim fonts, CSS vars, wallet-adapter overrides)
- src/main.tsx (HashRouter + BigInt patch), src/app.tsx stub
- public/ (copied gt-cinetype.ttf, denim.ttf, favicon.ico, logo.png)

Verified: tsc -b clean, vite build succeeds (CSS+JS emit, 39 modules).
