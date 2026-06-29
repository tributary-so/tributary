---
# tributary-20n1
title: 'apps/app: build-time env validation in vite.config'
status: todo
type: task
created_at: 2026-06-29T12:49:03Z
updated_at: 2026-06-29T12:49:03Z
parent: tributary-spgd
---

## What

Add env-var validation to `apps/app/vite.config.ts` so `vite build` and `vite dev` fail if `VITE_SOLANA_API` or `VITE_SOLANA_API_DEVNET` are not set.

## How

Use Vite's `loadEnv` in the config function:

```ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const required = ['VITE_SOLANA_API', 'VITE_SOLANA_API_DEVNET']
  for (const key of required) {
    if (!env[key]) throw new Error(`Missing required env var: ${key}. Copy apps/app/.env.example to .env and fill in values.`)
  }
  return { /* existing config */ }
})
```

## Checklist

- [ ] Add `loadEnv` validation to `apps/app/vite.config.ts`
- [ ] Verify `vite build` fails when env vars are missing
- [ ] Verify `vite build` succeeds when env vars are set
- [ ] Run `pnpm run lint`
