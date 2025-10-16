import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import viteTsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: false,
      },
      include: ['buffer'],
    }),
    tailwindcss(),
    viteTsconfigPaths({
      //
      root: resolve(__dirname),
    }),
  ],
  build: {
    rollupOptions: {
      // external: ['vite-plugin-node-polyfills/shims/buffer', 'stream', 'http', 'https', 'zlib'],
      output: {
        manualChunks: {
          'solana-vendor': ['@solana/web3.js', '@solana/spl-token'],
          'wallet-adapter': ['@solana/wallet-adapter-react', '@solana/wallet-adapter-react-ui'],
          'ui-vendor': ['@heroui/react', 'framer-motion'],
        },
      },
    },
  },
})
