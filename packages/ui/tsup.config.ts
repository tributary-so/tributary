import { defineConfig } from 'tsup'

// ponytail: ESM only — every consumer is a Vite ESM app or Storybook; the
// sdk-react CJS/IIFE builds exist for CDN/UMD consumers this package doesn't have.
// deps + peerDependencies are auto-externalized by tsup in library mode.
export default defineConfig({
  entry: ['src/index.ts', 'src/solana/index.ts', 'src/tributary/index.ts', 'src/styles/theme-heroui.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
